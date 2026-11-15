import mongoose from 'mongoose';
import OtpVerification, { IOtpVerification } from './OtpVerification';

// Certificate codes must never authorize admissions or share a verified-email session.
export default mongoose.model<IOtpVerification>('CertificateOtpVerification', OtpVerification.schema.clone());
