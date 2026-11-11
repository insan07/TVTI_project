// Isolated local replica set. Email and notification delivery are stubbed.
const assert=require('node:assert/strict');
const {test,before,after,beforeEach}=require('node:test');
const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const {MongoMemoryReplSet}=require('mongodb-memory-server-core');
const User=require('../dist/models/User').default,Course=require('../dist/models/Course').default,Batch=require('../dist/models/Batch').default,Enrollment=require('../dist/models/Enrollment').default,Application=require('../dist/models/Application').default;
const admissions=require('../dist/services/studentAdmissions');
const controller=require('../dist/controllers/applicationController');
const admin=require('../dist/controllers/adminController');
const payments=require('../dist/controllers/paymentController');
const email=require('../dist/services/emailService'),notification=require('../dist/services/notificationService');
let replica,courses,batches;
const originals={approval:email.sendApprovalEmail,rejection:email.sendRejectionEmail,notification:notification.sendNotification};
before(async()=>{
 replica=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger',spawn:{windowsHide:true}}});
 await mongoose.connect(replica.getUri('student_admission_tests'));
 await Promise.all([User.init(),Application.init(),Batch.init(),Course.init(),Enrollment.init()]);
 email.sendApprovalEmail=async()=>({success:true});email.sendRejectionEmail=async()=>({success:true});notification.sendNotification=async()=>[];
},{timeout:120000});
after(async()=>{email.sendApprovalEmail=originals.approval;email.sendRejectionEmail=originals.rejection;notification.sendNotification=originals.notification;await mongoose.disconnect();if(replica)await replica.stop()});
beforeEach(async()=>{
 for(const model of[Enrollment,Application,Batch,Course,User])await model.deleteMany({});
 courses=await Course.insertMany(['Electrical','Plumbing'].map(title=>({title,description:title,fee:1000,duration_weeks:12})));
 batches=await Batch.insertMany(courses.map((course,i)=>({name:'Batch '+i,course_id:course._id,start_date:new Date(),end_date:new Date('2099-01-01'),capacity:20,status:'active'})));
});
const app=(name='Amal')=>Application.create({full_name:name,email:name.toLowerCase()+'@test.invalid',phone:'0700000000',nic_number:'NIC-'+name,course_id:courses[0]._id,course_ids:courses.map(c=>c._id),terms_accepted:true});
const input=(indices=[0,1])=>({assigned_course_ids:indices.map(i=>String(courses[i]._id)),assigned_batch_ids:indices.map(i=>String(batches[i]._id)),total_course_fee:indices.length*1000,amount_paid:0});
const manual=(name='Sara',indices=[0])=>({name,email:name.toLowerCase()+'@test.invalid',phone:'0700000000',nic:'NIC-'+name,course_ids:input(indices).assigned_course_ids,batch_ids:input(indices).assigned_batch_ids});
const fails=(promise,status)=>assert.rejects(promise,error=>error.status===status);
const response=()=>({statusCode:200,status(code){this.statusCode=code;return this},json(body){this.body=body;return this}});

test('approval requires an explicit batch for every selected course and leaves records unchanged on failure',async()=>{
 const application=await app();
 await fails(admissions.approveStudentApplication(String(application._id),{...input(),assigned_batch_ids:[]}),400);
 assert.equal(await User.countDocuments(),0);assert.equal(await Enrollment.countDocuments(),0);assert.equal((await Application.findById(application._id)).status,'pending');
});
test('approval creates exactly the selected enrollments and persists their batch IDs',async()=>{
 const application=await app();const result=await admissions.approveStudentApplication(String(application._id),input());
 assert.equal(result.student.role,'student');assert.equal(result.student.is_active,true);assert.equal(result.student.must_change_password,true);
 assert.equal(await Enrollment.countDocuments({student_id:result.student._id}),2);
 assert.deepEqual((await Application.findById(application._id)).assigned_batch_ids.map(String).sort(),batches.map(b=>String(b._id)).sort());
 assert(result.credentials.temp_password);assert.match(result.credentials.registration_number,/^TVTI-\d{4}-\d+$/);
 const hash=result.student.password_hash;await fails(admissions.approveStudentApplication(String(application._id),input()),409);assert.equal((await User.findById(result.student._id)).password_hash,hash);
});
test('wrong-course, inactive and full batches are rejected without partial student creation',async()=>{
 const application=await app();await fails(admissions.approveStudentApplication(String(application._id),{...input([0]),assigned_batch_ids:[String(batches[1]._id)]}),400);
 await Batch.updateOne({_id:batches[0]._id},{status:'completed'});await fails(admissions.approveStudentApplication(String(application._id),input([0])),400);
 await Batch.updateOne({_id:batches[0]._id},{status:'active',capacity:0});await fails(admissions.approveStudentApplication(String(application._id),input([0])),409);
 assert.equal(await User.countDocuments(),0);assert.equal(await Enrollment.countDocuments(),0);
});
test('concurrent approvals cannot take the same last seat',async()=>{
 await Batch.updateOne({_id:batches[0]._id},{capacity:1});const apps=await Promise.all([app('Amal'),app('Nimal')]);
 const results=await Promise.allSettled(apps.map(a=>admissions.approveStudentApplication(String(a._id),input([0]))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(await User.countDocuments(),1);assert.equal(await Enrollment.countDocuments(),1);assert.equal(await Application.countDocuments({status:'approved'}),1);
});
test('manual creation requires valid fields and batches and rejects duplicate email or NIC',async()=>{
 await fails(admissions.createManualStudent({...manual(),email:'invalid'}),400);
 await fails(admissions.createManualStudent({...manual(),batch_ids:[]}),400);
 const result=await admissions.createManualStudent(manual());assert.equal(await Enrollment.countDocuments({student_id:result.student._id}),1);
 await fails(admissions.createManualStudent({...manual('Other'),email:result.student.email}),409);
 await fails(admissions.createManualStudent({...manual('Other'),nic:result.student.nic}),409);assert.equal(await User.countDocuments(),1);
});
test('reactivation clears completion flags without changing password or historical enrollments',async()=>{
 const result=await admissions.createManualStudent(manual());await User.updateOne({_id:result.student._id},{is_active:false,is_graduated:true,status:'completed'});
 await Enrollment.updateMany({student_id:result.student._id},{status:'completed'});
 const student=await admissions.reactivateStudent(String(result.student._id));assert.equal(student.is_active,true);assert.equal(student.is_graduated,false);assert.equal(student.status,'active');assert.equal(student.password_hash,result.student.password_hash);
 assert.equal((await Enrollment.findOne({student_id:student._id})).status,'completed');
 const again=await admissions.reactivateStudent(String(student._id));assert.equal(again.is_active,true);
});
test('manual creation and existing-student assignment share capacity protection',async()=>{
 const student=await User.create({name:'Existing',email:'existing@test.invalid',password_hash:'unchanged',role:'student',is_active:true});await Batch.updateOne({_id:batches[0]._id},{capacity:1});
 const results=await Promise.allSettled([admissions.createManualStudent(manual()),admissions.assignStudentsToBatch(String(batches[0]._id),[String(student._id)])]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(await Enrollment.countDocuments({batch_id:batches[0]._id}),1);
});
test('approved applications can be rejected with a reason while preserving student records',async()=>{
 const application=await app();const approved=await admissions.approveStudentApplication(String(application._id),input([0]));const res=response();
 await controller.updateApplicationStatus({params:{id:String(application._id)},body:{status:'rejected',rejection_reason:'Enrollment withdrawn'}},res);
 assert.equal(res.statusCode,200);assert.equal((await Application.findById(application._id)).status,'rejected');assert.equal((await Application.findById(application._id)).rejection_reason,'Enrollment withdrawn');assert(await User.exists({_id:approved.student._id}));assert.equal(await Enrollment.countDocuments({student_id:approved.student._id}),1);
});
test('manual creation response remains successful when email delivery fails and returns no password hash',async()=>{
 email.sendApprovalEmail=async()=>{throw Error('Offline mail fixture')};const res=response();await admin.createStudent({body:manual()},res);email.sendApprovalEmail=async()=>({success:true});
 assert.equal(res.statusCode,201);assert.equal(res.body.email_sent,false);assert(res.body.credentials.temp_password);assert.equal(res.body.password_hash,undefined);
});

test('approval of a pending student synchronizes its application and selected batch',async()=>{
 const application=await app('Pending');
 const student=await User.create({name:'Pending',email:application.email,password_hash:'old',role:'student',is_active:false});
 await fails(admissions.approveRegisteredStudent(String(student._id),{...input([0]),assigned_batch_ids:[]}),400);
 assert.equal((await User.findById(student._id)).is_active,false);
 await admissions.approveRegisteredStudent(String(student._id),input([0]));
 const updated=await Application.findById(application._id);
 assert.equal(updated.status,'approved');assert.deepEqual(updated.assigned_batch_ids.map(String),[String(batches[0]._id)]);
 assert.equal(await Enrollment.countDocuments({student_id:student._id}),1);
});

test('reapproving a rejected application emails fresh working credentials and keeps enrollments unique',async()=>{
 const application=await app();const first=await admissions.approveStudentApplication(String(application._id),input([0]));
 await Application.updateOne({_id:application._id},{status:'rejected',rejection_reason:'Withdrawn'});
 let sent;email.sendApprovalEmail=async options=>{sent=options;return{success:true}};
 const res=response();await controller.updateApplicationStatus({params:{id:String(application._id)},body:{status:'approved',...input([0])}},res);
 email.sendApprovalEmail=async()=>({success:true});
 assert.equal(res.statusCode,200);assert.equal(res.body.email_sent,true);assert.equal(sent.to,application.email);assert.equal(sent.temporaryPassword,res.body.credentials.temp_password);
 const student=await User.findById(first.student._id);assert(await bcrypt.compare(sent.temporaryPassword,student.password_hash));assert.notEqual(student.password_hash,first.student.password_hash);
 assert.equal(await Enrollment.countDocuments({student_id:student._id}),1);assert.equal((await Application.findById(application._id)).status,'approved');
});

test('approved application resend emails new credentials without changing its student status or enrollments',async()=>{
 const application=await app();const first=await admissions.approveStudentApplication(String(application._id),input([0]));
 await User.updateOne({_id:first.student._id},{is_active:false,is_graduated:true,status:'completed'});
 let sent;email.sendApprovalEmail=async options=>{sent=options;return{success:true}};
 const res=response();await controller.resendApplicationCredentials({params:{id:String(application._id)}},res);email.sendApprovalEmail=async()=>({success:true});
 assert.equal(res.statusCode,200);assert.equal(res.body.email_sent,true);assert.equal(sent.temporaryPassword,res.body.credentials.temp_password);
 const student=await User.findById(first.student._id);assert(await bcrypt.compare(sent.temporaryPassword,student.password_hash));assert.equal(student.status,'completed');assert.equal(student.is_active,false);
 assert.equal(student.registration_number,first.student.registration_number);assert.equal(await Enrollment.countDocuments({student_id:student._id}),1);assert.equal((await Application.findById(application._id)).approval_email_sent,true);
});

test('resend is limited to approved applications with a matching student account',async()=>{
 const application=await app();const res=response();await controller.resendApplicationCredentials({params:{id:String(application._id)}},res);assert.equal(res.statusCode,400);assert.equal(await User.countDocuments(),0);
 await Application.updateOne({_id:application._id},{status:'approved'});await User.create({name:'Other role',email:application.email,password_hash:'unchanged',role:'instructor'});
 const missing=response();await controller.resendApplicationCredentials({params:{id:String(application._id)}},missing);assert.equal(missing.statusCode,404);assert.equal((await User.findOne({email:application.email})).password_hash,'unchanged');
});

test('resend reports email failure and still returns usable new credentials',async()=>{
 const application=await app();await admissions.approveStudentApplication(String(application._id),input([0]));
 email.sendApprovalEmail=async()=>({success:false});const res=response();await controller.resendApplicationCredentials({params:{id:String(application._id)}},res);email.sendApprovalEmail=async()=>({success:true});
 assert.equal(res.statusCode,200);assert.equal(res.body.email_sent,false);assert(res.body.credentials.temp_password);assert.equal((await Application.findById(application._id)).approval_email_sent,false);
});

test('manual admission saves all registration details in the student and approved application',async()=>{
 const details={...manual(),date_of_birth:'2001-04-18',gender:'Female',address:'12 Main Street',guardian:{name:'Parent',relationship:'Mother',phone:'0711234567',occupation:'Teacher'},educational_qualification:{highest_level:'Below O/L',grade_level:'Grade 10',institute_name:'Test School'},student_photo:'data:image/png;base64,cGhvdG8=',payment_method:'bank_transfer',payment_slip:'data:image/png;base64,cmVjZWlwdA==',terms_accepted:true,total_course_fee:1200,amount_paid:200};
 const result=await admissions.createManualStudent(details);const student=await User.findById(result.student._id),application=await Application.findById(result.application._id);
 assert.equal(student.date_of_birth,details.date_of_birth);assert.equal(student.address,details.address);assert.equal(student.gender,'Female');assert.equal(student.guardian.name,'Parent');assert.equal(student.educational_qualification.grade_level,'Grade 10');assert.equal(student.profile_photo,details.student_photo);assert.equal(student.payment_info.payment_slip,details.payment_slip);assert.equal(student.payment_info.amount_paid,200);
 assert.equal(application.status,'approved');assert.equal(application.terms_accepted,true);assert.equal(application.guardian.occupation,'Teacher');assert.equal(application.educational_qualification.institute_name,'Test School');assert.equal(application.student_photo,details.student_photo);assert.equal(application.registration_number,student.registration_number);assert.deepEqual(application.assigned_batch_ids.map(String),[String(batches[0]._id)]);
 const res=response();await payments.getStudentPaymentDossier({params:{studentId:String(student._id)}},res);assert.equal(res.body.registration_info.payment_slip,details.payment_slip);assert.equal(res.body.summary.remaining_balance,1000);
});

test('manual entry accepts students without a NIC and keeps their identities separate',async()=>{
 await admissions.createManualStudent({...manual('NoNicOne'),nic:undefined});await admissions.createManualStudent({...manual('NoNicTwo'),nic:undefined});
 assert.equal(await User.countDocuments(),2);assert.equal(await Application.countDocuments({status:'approved'}),2);
});

test('invalid registration details leave admission records untouched',async()=>{
 await fails(admissions.createManualStudent({...manual(),date_of_birth:'2001-02-31'}),400);
 await fails(admissions.createManualStudent({...manual(),date_of_birth:'2999-01-01'}),400);
 await fails(admissions.createManualStudent({...manual(),payment_method:'bank_transfer'}),400);
 assert.equal(await User.countDocuments(),0);assert.equal(await Application.countDocuments(),0);assert.equal(await Enrollment.countDocuments(),0);
});

test('payment list and view preserve zero fees and waived balances',async()=>{
 const first=await admissions.createManualStudent({...manual('ZeroFee'),total_course_fee:0});const second=await admissions.createManualStudent({...manual('Waived'),payment_status:'waived'});
 const list=response();await payments.getAdminPaymentList({},list);assert.equal(list.body.find(row=>String(row._id)===String(first.student._id)).total_fee,0);assert.equal(list.body.find(row=>String(row._id)===String(second.student._id)).remaining_balance,0);
 const view=response();await payments.getStudentPaymentDossier({params:{studentId:String(first.student._id)}},view);assert.equal(view.body.summary.total_fee,0);assert.equal(view.body.summary.category,'completed');
 const waived=response();await payments.getStudentPaymentDossier({params:{studentId:String(second.student._id)}},waived);assert.equal(waived.body.summary.remaining_balance,0);
});

test('add payment rejects invalid amounts before creating or crediting a payment',async()=>{
 const result=await admissions.createManualStudent(manual());
 for (const amount of ['Infinity','NaN',0,-100]) {
   const res=response();await payments.recordManualPayment({params:{studentId:String(result.student._id)},body:{amount}},res);assert.equal(res.statusCode,400);
 }
 assert.equal((await User.findById(result.student._id)).payment_info.amount_paid,0);
});
