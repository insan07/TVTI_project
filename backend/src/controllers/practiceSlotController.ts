import { Response } from 'express';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import { AuthRequest } from '../middleware/authMiddleware';

// POST /api/instructor/practice-slots
// Body: { batch_id, week_start_date, slots: [{ day_of_week, start_time, end_time, max_students, equipment_note }] }
export const createSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batch_id, week_start_date, slots } = req.body;
    
    const normalizedWeekStart = new Date(week_start_date);
    normalizedWeekStart.setUTCHours(0, 0, 0, 0);

    const created = await PracticeSlot.insertMany(
      slots.map((s: any) => ({
        ...s,
        batch_id,
        instructor_id: req.user?._id,
        week_start_date: normalizedWeekStart,
        is_open: true,
      }))
    );
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/instructor/practice-slots?batchId=&weekStart=
export const getMySlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId, weekStart } = req.query;
    const query: any = { instructor_id: req.user?._id };
    if (batchId) query.batch_id = batchId;
    if (weekStart) {
      const normalized = new Date(weekStart as string);
      normalized.setUTCHours(0, 0, 0, 0);
      query.week_start_date = normalized;
    }

    const slots = await PracticeSlot.find(query).sort({ week_start_date: 1, day_of_week: 1, start_time: 1 });

    const slotIds = slots.map(s => s._id);
    const counts = await SlotBooking.aggregate([
      { $match: { slot_id: { $in: slotIds }, status: 'confirmed' } },
      { $group: { _id: '$slot_id', count: { $sum: 1 } } }
    ]);

    const result = slots.map(s => {
      const c = counts.find(x => String(x._id) === String(s._id))?.count || 0;
      return { ...s.toObject(), booked_count: c };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/instructor/practice-slots/:slotId/bookings
export const getSlotBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings = await SlotBooking.find({ slot_id: req.params.slotId, status: 'confirmed' })
      .populate('student_id', 'name email phone');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/instructor/practice-slots/:slotId
// Body: { max_students?, equipment_note?, is_open? }
export const updateSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { max_students, equipment_note, is_open } = req.body;

    if (typeof max_students === 'number') {
      const confirmed = await SlotBooking.countDocuments({ slot_id: req.params.slotId, status: 'confirmed' });
      if (confirmed > max_students) {
        res.status(400).json({ message: `Cannot reduce limit below current bookings (${confirmed})` });
        return;
      }
    }

    const slot = await PracticeSlot.findOneAndUpdate(
      { _id: req.params.slotId, instructor_id: req.user?._id },
      { max_students, equipment_note, is_open },
      { new: true }
    );
    if (!slot) { res.status(404).json({ message: 'Slot not found' }); return; }
    res.json(slot);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
