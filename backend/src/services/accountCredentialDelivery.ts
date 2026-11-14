import User from '../models/User';
import Application from '../models/Application';
import { sendAccountCredentialsEmail, sendApprovalEmail } from './emailService';

export async function deliverAccountCredentials(result: any) {
  const user = result.user || result.student;
  const options = { to: user.email, name: user.name, registrationNumber: result.credentials.registration_number,
    temporaryPassword: result.credentials.temp_password, expiresAt: result.credentials.expires_at };
  let sent = false;
  try {
    const mail = user.role === 'instructor' ? await sendAccountCredentialsEmail({ ...options, role: 'instructor' }) : await sendApprovalEmail(options);
    sent = mail.success === true && mail.simulated !== true;
  } catch { /* Keep the committed account and expose a truthful, retryable delivery result. */ }
  const error = sent ? '' : 'Credentials were saved, but email was not sent. Check SMTP settings and use Send temporary credentials to retry.';
  const userStatus = { $set: { credential_email_sent: sent, credential_email_error: error, ...(sent ? { credential_email_sent_at: new Date() } : {}) },
    ...(!sent ? { $unset: { credential_email_sent_at: 1 } } : {}) };
  await User.updateOne({ _id: user._id }, userStatus).catch(() => {});
  if (user.role === 'student') await Application.updateMany({ email: user.email, status: 'approved' }, {
    $set: { approval_email_sent: sent, approval_email_error: error, ...(sent ? { approval_email_sent_at: new Date() } : {}) },
    ...(!sent ? { $unset: { approval_email_sent_at: 1 } } : {}) }).catch(() => {});
  return { email_sent: sent, email_error: error || undefined };
}
