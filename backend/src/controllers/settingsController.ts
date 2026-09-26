import { Request, Response } from 'express';
import SiteSettings from '../models/SiteSettings';

// Get current site settings (Public & Admin)
export const getSiteSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create({});
    }
    res.status(200).json(settings);
  } catch (error: any) {
    console.error('Error fetching site settings:', error);
    res.status(500).json({ message: 'Failed to fetch site settings', error: error.message });
  }
};

// Update site settings (Admin only)
export const updateSiteSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      site_title,
      announcement_banner,
      show_announcement,
      contact_phone,
      contact_email,
      whatsapp_number,
      address,
      registration_open,
      maintenance_mode,
      maintenance_message,
    } = req.body;

    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings({});
    }

    if (site_title !== undefined) settings.site_title = site_title;
    if (announcement_banner !== undefined) settings.announcement_banner = announcement_banner;
    if (show_announcement !== undefined) settings.show_announcement = Boolean(show_announcement);
    if (contact_phone !== undefined) settings.contact_phone = contact_phone;
    if (contact_email !== undefined) settings.contact_email = contact_email;
    if (whatsapp_number !== undefined) settings.whatsapp_number = whatsapp_number;
    if (address !== undefined) settings.address = address;
    if (registration_open !== undefined) settings.registration_open = Boolean(registration_open);
    if (maintenance_mode !== undefined) settings.maintenance_mode = Boolean(maintenance_mode);
    if (maintenance_message !== undefined) settings.maintenance_message = maintenance_message;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Website settings updated successfully',
      settings,
    });
  } catch (error: any) {
    console.error('Error updating site settings:', error);
    res.status(500).json({ message: 'Failed to update site settings', error: error.message });
  }
};
