import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
  site_title: string;
  announcement_banner: string;
  show_announcement: boolean;
  contact_phone: string;
  contact_email: string;
  whatsapp_number: string;
  address: string;
  registration_open: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  updatedAt: Date;
}

const SiteSettingsSchema: Schema = new Schema(
  {
    site_title: { type: String, default: 'Twintec VTI' },
    announcement_banner: {
      type: String,
      default: 'Admissions are OPEN for 2026 batches! Register now to secure your seat.',
    },
    show_announcement: { type: Boolean, default: true },
    contact_phone: { type: String, default: '+94 77 123 4567' },
    contact_email: { type: String, default: 'info@twintec.edu.lk' },
    whatsapp_number: { type: String, default: '+94771234567' },
    address: { type: String, default: 'Twintec VTI Main Campus, Sri Lanka' },
    registration_open: { type: Boolean, default: true },
    maintenance_mode: { type: Boolean, default: false },
    maintenance_message: {
      type: String,
      default: 'The website is undergoing scheduled maintenance. Please check back shortly.',
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
