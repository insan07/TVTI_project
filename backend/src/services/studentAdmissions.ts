import { ClientSession } from 'mongoose';
import bcrypt from 'bcryptjs';
import Application from '../models/Application';
import User from '../models/User';
import Batch from '../models/Batch';
import Course from '../models/Course';
import Enrollment from '../models/Enrollment';
import { practicalMutation, PracticalError } from './practicalScheduling';
import { generateTemporaryPassword, generateUniqueIndexNumber, generateUniqueRegistrationNumber } from '../utils/admissionIdentifiers';

const id = (value: any) => String(value?._id || value);
const validId = (value: unknown) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
function ids(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => !validId(item))) throw new PracticalError(400, `Select valid ${label}.`);
  const values = value.map(item => String(item).toLowerCase());
  if (new Set(values).size !== values.length) throw new PracticalError(400, `Select each ${label.replace(/s$/, '')} only once.`);
  return values;
}

export async function selectedAdmissionBatches(courseValues: unknown, batchValues: unknown, studentId: any, session: ClientSession) {
  const courseIds = ids(courseValues, 'courses'), batchIds = ids(batchValues, 'batches');
  if (courseIds.length !== batchIds.length) throw new PracticalError(400, 'Select one batch for every selected course.');
  const courses = await Course.find({ _id: { $in: courseIds }, is_active: true }).session(session);
  if (courses.length !== courseIds.length) throw new PracticalError(400, 'Select active courses.');
  const batches = await Batch.find({ _id: { $in: batchIds }, status: 'active' }).session(session);
  if (batches.length !== batchIds.length) throw new PracticalError(400, 'Select active batches.');
  if (new Set(batches.map(batch => id(batch.course_id))).size !== courseIds.length || batches.some(batch => !courseIds.includes(id(batch.course_id)))) {
    throw new PracticalError(400, 'Each selected batch must belong to its selected course.');
  }
  for (const batch of batches) {
    const existing = studentId ? await Enrollment.findOne({ student_id: studentId, batch_id: batch._id }).session(session) : null;
    const count = await Enrollment.countDocuments({ batch_id: batch._id, status: { $ne: 'dropped' } }).session(session);
    if ((!existing || existing.status === 'dropped') && count >= batch.capacity) throw new PracticalError(409, `Batch "${batch.name}" is full. Select another batch.`);
  }
  return { courses, batches };
}

export async function enrollAdmissionStudent(studentId: any, batches: any[], session: ClientSession) {
  for (const batch of batches) {
    const existing = await Enrollment.findOne({ student_id: studentId, batch_id: batch._id }).session(session);
    if (existing) {
      if (existing.status !== 'active') { existing.status = 'active'; await existing.save({ session }); }
    } else await Enrollment.create([{ student_id: studentId, batch_id: batch._id, status: 'active' }], { session });
  }
}

function fees(body: any, defaultFee: number) {
  const total = body.total_course_fee === undefined ? defaultFee : Number(body.total_course_fee);
  const paid = body.amount_paid === undefined ? 0 : Number(body.amount_paid);
  if (!Number.isFinite(total) || !Number.isFinite(paid) || total < 0 || paid < 0 || paid > total) throw new PracticalError(400, 'Enter valid fees and an amount paid no higher than the total fee.');
  const status = body.payment_status || (paid >= total ? 'paid' : paid > 0 ? 'partially_paid' : 'pending');
  if (!['pending', 'partially_paid', 'paid', 'waived'].includes(status)) throw new PracticalError(400, 'Select a valid payment status.');
  return { total, paid, status };
}

/** Validation, student creation/update and batch enrollment commit as one change. */
export async function approveStudentApplication(applicationId: string, body: any) {
  if (!validId(applicationId)) throw new PracticalError(400, 'Invalid application.');
  const tempPassword = generateTemporaryPassword(), password_hash = await bcrypt.hash(tempPassword, 10);
  return practicalMutation(async session => {
    const application = await Application.findById(applicationId).session(session);
    if (!application) throw new PracticalError(404, 'Application not found.');
    if (application.status === 'approved') throw new PracticalError(409, 'This application is already approved.');
    const email = application.email.toLowerCase().trim();
    const matches = await User.find({ $or: [{ email }, ...(application.nic_number ? [{ nic: application.nic_number }] : [])] }).session(session);
    if (matches.some(user => user.role !== 'student' || user.email.toLowerCase() !== email) || matches.length > 1) throw new PracticalError(409, 'The email or NIC belongs to another account.');
    let student = matches[0];
    const { courses, batches } = await selectedAdmissionBatches(body.assigned_course_ids, body.assigned_batch_ids, student?._id, session);
    const payment = fees(body, courses.reduce((sum, course: any) => sum + (course.fee || 0), 0));
    const index = student?.index_number || await generateUniqueIndexNumber(session);
    const registration = student?.registration_number || application.registration_number || await generateUniqueRegistrationNumber(session);
    const values = {
      name: application.full_name, email, phone: application.phone, nic: application.nic_number || student?.nic,
      date_of_birth: application.date_of_birth, gender: application.gender, address: application.address,
      guardian: application.guardian, educational_qualification: application.educational_qualification,
      profile_photo: application.student_photo || student?.profile_photo,
      payment_info: { total_fee: payment.total, amount_paid: payment.paid, payment_status: payment.status, payment_method: application.payment_method, payment_slip: application.payment_slip, last_updated: new Date() },
      role: 'student' as const, is_active: true, status: 'active', is_graduated: false, index_number: index, registration_number: registration,
      password_hash, must_change_password: true, temp_password_expires_at: new Date(Date.now() + 7 * 86400000),
    };
    if (student) { Object.assign(student, values); await student.save({ session }); }
    else [student] = await User.create([values], { session });
    await enrollAdmissionStudent(student._id, batches, session);
    application.status = 'approved'; application.course_id = courses[0]._id as any; application.course_ids = courses.map(course => course._id) as any;
    application.assigned_batch_ids = batches.map(batch => batch._id) as any;
    application.total_course_fee = payment.total; application.amount_paid = payment.paid; application.payment_status = payment.status;
    application.registration_number = registration; application.generated_index_number = index; application.rejection_reason = undefined;
    await application.save({ session });
    return { application, student, batches, credentials: { index_number: index, registration_number: registration, temp_password: tempPassword, email, student_id: student._id } };
  });
}

export async function createManualStudent(body: any) {
  const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase(), phone = String(body.phone || '').trim(), nic = String(body.nic || '').trim();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone) throw new PracticalError(400, 'Name, valid email and phone are required.');
  const text = (value: unknown, max = 4000) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || value.length > max) throw new PracticalError(400, 'A registration detail is invalid or too long.');
    return value.trim() || undefined;
  };
  const date_of_birth = text(body.date_of_birth), gender = text(body.gender), address = text(body.address);
  if (date_of_birth && (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth) || !Number.isFinite(Date.parse(date_of_birth)) || new Date(date_of_birth).toISOString().slice(0, 10) !== date_of_birth || Date.parse(date_of_birth) > Date.now())) throw new PracticalError(400, 'Enter a valid date of birth as YYYY-MM-DD.');
  if (gender && !['Male', 'Female', 'Other'].includes(gender)) throw new PracticalError(400, 'Select a valid gender.');
  const guardian = { name: text(body.guardian?.name), relationship: text(body.guardian?.relationship), phone: text(body.guardian?.phone), occupation: text(body.guardian?.occupation) };
  const educational_qualification = { highest_level: text(body.educational_qualification?.highest_level), grade_level: text(body.educational_qualification?.grade_level), institute_name: text(body.educational_qualification?.institute_name) };
  const student_photo = text(body.student_photo, 3500000), payment_slip = text(body.payment_slip, 3500000);
  const payment_method = body.payment_method || 'physical_pay';
  if (!['physical_pay', 'bank_transfer'].includes(payment_method)) throw new PracticalError(400, 'Select a valid registration payment method.');
  if (payment_method === 'bank_transfer' && !payment_slip) throw new PracticalError(400, 'The bank deposit receipt is required.');
  const tempPassword = generateTemporaryPassword(), password_hash = await bcrypt.hash(tempPassword, 10);
  return practicalMutation(async session => {
    if (await User.exists({ $or: [{ email }, ...(nic ? [{ nic }] : [])] }).session(session)) throw new PracticalError(409, 'A user with this email or NIC already exists.');
    if (await Application.exists({ $or: [{ email }, ...(nic ? [{ nic_number: nic }] : [])], status: { $ne: 'rejected' } }).session(session)) throw new PracticalError(409, 'An application already exists for this email or NIC. Review it from Applications.');
    const { courses, batches } = await selectedAdmissionBatches(body.course_ids, body.batch_ids, null, session);
    const payment = fees(body, courses.reduce((sum, course: any) => sum + (course.fee || 0), 0));
    const index = await generateUniqueIndexNumber(session), registration = await generateUniqueRegistrationNumber(session);
    const [student] = await User.create([{
      name, email, phone, nic: nic || undefined, date_of_birth, gender, address, guardian, educational_qualification, profile_photo: student_photo,
      role: 'student', is_active: true, status: 'active', is_graduated: false,
      index_number: index, registration_number: registration, password_hash, must_change_password: true,
      temp_password_expires_at: new Date(Date.now() + 7 * 86400000),
      payment_info: { total_fee: payment.total, amount_paid: payment.paid, payment_status: payment.status, payment_method, payment_slip: payment_method === 'bank_transfer' ? payment_slip : undefined, last_updated: new Date() },
    }], { session });
    await enrollAdmissionStudent(student._id, batches, session);
    const [application] = await Application.create([{
      full_name: name, email, phone, nic_number: nic || undefined, date_of_birth, gender, address, guardian, educational_qualification, student_photo,
      payment_method, payment_slip: payment_method === 'bank_transfer' ? payment_slip : undefined, total_course_fee: payment.total, amount_paid: payment.paid, payment_status: payment.status,
      course_id: courses[0]._id, course_ids: courses.map(course => course._id), assigned_batch_ids: batches.map(batch => batch._id),
      status: 'approved', registration_number: registration, generated_index_number: index, terms_accepted: body.terms_accepted === true, terms_accepted_at: body.terms_accepted === true ? new Date() : undefined
    }], { session });
    return { student, application, batches, credentials: { index_number: index, registration_number: registration, temp_password: tempPassword, email, student_id: student._id } };
  });
}

export async function reactivateStudent(studentId: string) {
  if (!validId(studentId)) throw new PracticalError(400, 'Invalid student.');
  const student = await User.findOneAndUpdate({ _id: studentId, role: 'student' }, { is_active: true, is_graduated: false, status: 'active' }, { new: true });
  if (!student) throw new PracticalError(404, 'Student not found.');
  return student;
}

/** Resending creates a fresh temporary password without changing admission or enrollment. */
export async function regenerateApprovedApplicationCredentials(applicationId: string) {
  if (!validId(applicationId)) throw new PracticalError(400, 'Invalid application.');
  const tempPassword = generateTemporaryPassword(), password_hash = await bcrypt.hash(tempPassword, 10);
  return practicalMutation(async session => {
    const application = await Application.findById(applicationId).session(session);
    if (!application) throw new PracticalError(404, 'Application not found.');
    if (application.status !== 'approved') throw new PracticalError(400, 'Approve the application before resending credentials.');
    const student = await User.findOne({ email: application.email.toLowerCase().trim(), role: 'student' }).session(session);
    if (!student) throw new PracticalError(404, 'The approved student account was not found.');
    student.index_number ||= await generateUniqueIndexNumber(session);
    student.registration_number ||= application.registration_number || await generateUniqueRegistrationNumber(session);
    student.password_hash = password_hash;
    student.must_change_password = true;
    student.temp_password_expires_at = new Date(Date.now() + 7 * 86400000);
    await student.save({ session });
    application.generated_index_number = student.index_number;
    application.registration_number = student.registration_number;
    await application.save({ session });
    return { application, student, credentials: { index_number: student.index_number, registration_number: student.registration_number, temp_password: tempPassword, email: student.email, student_id: student._id } };
  });
}

export async function approveRegisteredStudent(studentId: string, body: any) {
  if (!validId(studentId)) throw new PracticalError(400, 'Invalid student.');
  const tempPassword = generateTemporaryPassword(), password_hash = await bcrypt.hash(tempPassword, 10);
  return practicalMutation(async session => {
    const student = await User.findOne({ _id: studentId, role: 'student' }).session(session);
    if (!student) throw new PracticalError(404, 'Student not found.');
    if (student.is_active && student.status !== 'completed' && !student.is_graduated) throw new PracticalError(409, 'This student is already active.');
    const { batches } = await selectedAdmissionBatches(body.assigned_course_ids, body.assigned_batch_ids, student._id, session);
    student.index_number ||= await generateUniqueIndexNumber(session);
    student.registration_number ||= await generateUniqueRegistrationNumber(session);
    student.is_active = true; student.is_graduated = false; student.status = 'active';
    student.password_hash = password_hash; student.must_change_password = true;
    student.temp_password_expires_at = new Date(Date.now() + 7 * 86400000);
    await student.save({ session });
    await enrollAdmissionStudent(student._id, batches, session);
    const application = await Application.findOne({ email: student.email.toLowerCase() }).sort({ createdAt: -1 }).session(session);
    if (application) {
      application.status = 'approved'; application.generated_index_number = student.index_number; application.registration_number = student.registration_number;
      application.course_ids = body.assigned_course_ids; application.course_id = body.assigned_course_ids[0];
      application.assigned_batch_ids = batches.map(batch => batch._id) as any;
      application.rejection_reason = undefined;
      await application.save({ session });
    }
    return { student, batches, credentials: { index_number: student.index_number, registration_number: student.registration_number, temp_password: tempPassword, email: student.email, student_id: student._id } };
  });
}

/** The batch enrollment page shares the same capacity lock as admissions. */
export async function assignStudentsToBatch(batchId: string, studentValues: unknown) {
  if (!validId(batchId)) throw new PracticalError(400, 'Invalid batch.');
  const studentIds = ids(studentValues, 'students');
  return practicalMutation(async session => {
    const batch = await Batch.findById(batchId).session(session);
    if (!batch || batch.status !== 'active') throw new PracticalError(400, 'Select an active batch.');
    const students = await User.find({ _id: { $in: studentIds }, role: 'student', is_active: true, is_graduated: { $ne: true }, status: { $ne: 'completed' } }).session(session);
    if (students.length !== studentIds.length) throw new PracticalError(400, 'Select active students. Reactivate completed students before assigning them.');
    const existing = await Enrollment.find({ batch_id: batchId, student_id: { $in: studentIds } }).session(session);
    const needed = studentIds.filter(student => !existing.some(entry => id(entry.student_id) === student && entry.status !== 'dropped'));
    const count = await Enrollment.countDocuments({ batch_id: batchId, status: { $ne: 'dropped' } }).session(session);
    if (count + needed.length > batch.capacity) throw new PracticalError(409, 'Batch capacity exceeded.');
    const enrollments = [];
    for (const student of students) {
      if (!existing.some(entry => id(entry.student_id) === id(student) && entry.status === 'active')) {
        await enrollAdmissionStudent(student._id, [batch], session);
        enrollments.push(await Enrollment.findOne({ student_id: student._id, batch_id: batchId }).session(session));
      }
    }
    return { batch, enrollments, newStudentIds: enrollments.map(entry => id(entry!.student_id)) };
  });
}
