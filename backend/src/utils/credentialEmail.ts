export type CredentialMail = {
  to: string; name: string; registrationNumber: string; temporaryPassword: string;
  role?: 'student' | 'instructor'; expiresAt?: Date | string;
};
const html = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

export function renderCredentialEmail(options: CredentialMail) {
  const role = options.role === 'instructor' ? 'Instructor' : 'Student';
  const expiry = options.expiresAt ? new Date(options.expiresAt).toLocaleString('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }) + ' (Sri Lanka time)' : '7 days from issue';
  const text = `Twintec Vocational Training Institute\n${role} Account — Temporary Sign-in Details\n\nDear ${options.name},\n\nYour ${role.toLowerCase()} account is ready.\n\nRegistration Number: ${options.registrationNumber}\nRegistered Email: ${options.to}\nTemporary Password: ${options.temporaryPassword}\nValid until: ${expiry}\n\nUse your registration number or registered email to sign in. You must set a permanent password at your first login. If this is a replacement credentials email, previous temporary passwords no longer work.\n\nPlease keep these details private.\nTVTI Administration`;
  const rows = [['Registration number', options.registrationNumber], ['Registered email', options.to], ['Temporary password', options.temporaryPassword], ['Valid until', expiry]];
  return { subject: `TVTI ${role} Account — Registration Number & Temporary Sign-in Details`, text,
    html: `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:600px;margin:24px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><div style="padding:24px;background:#0f172a;color:#fff"><strong>TWINTEC VOCATIONAL TRAINING INSTITUTE</strong><p>${role} account · Temporary sign-in details</p></div><div style="padding:24px"><p>Dear ${html(options.name)},</p><p>Your ${role.toLowerCase()} account is ready. Please use the details below to sign in.</p><table role="presentation" style="width:100%;border-collapse:collapse">${rows.map(([label, value]) => `<tr><td style="padding:12px 8px;border-bottom:1px solid #e2e8f0">${label}</td><td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;font-weight:bold;overflow-wrap:anywhere">${html(value)}</td></tr>`).join('')}</table><p>Use your registration number or registered email to sign in. You must set a permanent password at your first login.</p><p>If this is a replacement credentials email, previous temporary passwords no longer work.</p><p>Please keep these details private.</p><p>Regards,<br>TVTI Administration</p></div></div></body></html>` };
}
