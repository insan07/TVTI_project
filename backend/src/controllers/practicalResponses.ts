import { Response } from 'express';
import { PracticalError } from '../services/practicalScheduling';
import { sendNotification } from '../services/notificationService';

export function practicalFailure(res: Response, error: any): void {
  if (error instanceof PracticalError) { res.status(error.status).json({ message: error.message }); return; }
  if (error.code === 11000) { res.status(409).json({ message: 'This booking already exists. Refresh the schedule.' }); return; }
  if (error.name === 'ValidationError' || error.name === 'CastError') { res.status(400).json({ message: 'Invalid practical slot or booking data.' }); return; }
  console.error('[Practical scheduling]', error);
  res.status(500).json({ message: 'Unable to update practical scheduling. Please try again.' });
}

// Notify after commit; delivery failure must not report a committed booking as failed.
export async function practicalNotification(data: Parameters<typeof sendNotification>[0]): Promise<void> {
  try { await sendNotification(data); } catch (error) { console.warn('[Practical notification]', error); }
}
