import { Response } from 'express';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import { AuthRequest } from '../middleware/authMiddleware';

const checkSlotInstructorLimit = async (
  weekStartDate: Date,
  dayOfWeek: string,
  proposedSlots: Array<{ start_time: string; end_time: string; instructor_id: string; excludeSlotId?: string }>
): Promise<boolean> => {
  // 1. Fetch all existing active/open slots on this day
  const existingSlots = await PracticeSlot.find({
    week_start_date: weekStartDate,
    day_of_week: dayOfWeek,
    is_open: true
  });

  // 2. Parse times to minutes
  const timeToMinutes = (t: string): number => {
    if (!t || !t.includes(':')) return 0;
    const parts = t.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  };

  // 3. Create a day timeline of sets of instructor IDs
  const dayTimeline: Set<string>[] = Array.from({ length: 1440 }, () => new Set<string>());

  // 4. Populate timeline with existing slots
  for (const s of existingSlots) {
    // If we're updating a slot, we must exclude the old version of it
    const isExcluded = proposedSlots.some(p => p.excludeSlotId && String(p.excludeSlotId) === String(s._id));
    if (isExcluded) continue;

    const start = timeToMinutes(s.start_time);
    const end = timeToMinutes(s.end_time);
    const instId = String(s.instructor_id);
    for (let m = start; m < end; m++) {
      if (m >= 0 && m < 1440) {
        dayTimeline[m].add(instId);
      }
    }
  }

  // 5. Populate timeline with proposed slots
  for (const p of proposedSlots) {
    const start = timeToMinutes(p.start_time);
    const end = timeToMinutes(p.end_time);
    const instId = String(p.instructor_id);
    for (let m = start; m < end; m++) {
      if (m >= 0 && m < 1440) {
        dayTimeline[m].add(instId);
      }
    }
  }

  // 6. Check if any minute has more than 2 distinct instructors
  for (let m = 0; m < 1440; m++) {
    if (dayTimeline[m].size > 2) {
      return false; // Constraint violated
    }
  }

  return true; // Limit holds
};

// POST /api/instructor/practice-slots
// Body: { batch_id, week_start_date, slots: [{ day_of_week, start_time, end_time, max_students, equipment_note }] }
export const createSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batch_id, week_start_date, slots } = req.body;
    
    const normalizedWeekStart = new Date(week_start_date);
    normalizedWeekStart.setUTCHours(0, 0, 0, 0);

    // Group proposed slots by day_of_week to validate day-by-day
    const slotsByDay: { [key: string]: any[] } = {};
    for (const s of slots) {
      if (!slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week] = [];
      slotsByDay[s.day_of_week].push(s);
    }

    for (const day of Object.keys(slotsByDay)) {
      const proposed = slotsByDay[day].map(s => ({
        start_time: s.start_time,
        end_time: s.end_time,
        instructor_id: String(req.user?._id)
      }));
      const ok = await checkSlotInstructorLimit(normalizedWeekStart, day, proposed);
      if (!ok) {
        res.status(400).json({
          message: `Cannot create slots on ${day}. There are already 2 instructors conducting practical sessions at the same time in the institute.`
        });
        return;
      }
    }

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
// Body: { max_students?, equipment_note?, is_open?, start_time?, end_time?, day_of_week? }
export const updateSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slot = await PracticeSlot.findOne({ _id: req.params.slotId, instructor_id: req.user?._id });
    if (!slot) {
      res.status(404).json({ message: 'Slot not found' });
      return;
    }

    const { max_students, equipment_note, is_open, start_time, end_time, day_of_week } = req.body;

    if (typeof max_students === 'number') {
      const confirmed = await SlotBooking.countDocuments({ slot_id: slot._id, status: 'confirmed' });
      if (confirmed > max_students) {
        res.status(400).json({ message: `Cannot reduce limit below current bookings (${confirmed})` });
        return;
      }
    }

    const targetWeekStart = slot.week_start_date;
    const targetDay = day_of_week !== undefined ? day_of_week : slot.day_of_week;
    const targetStart = start_time !== undefined ? start_time : slot.start_time;
    const targetEnd = end_time !== undefined ? end_time : slot.end_time;
    const targetIsOpen = is_open !== undefined ? is_open : slot.is_open;

    if (targetIsOpen) {
      const proposed = [{
        start_time: targetStart,
        end_time: targetEnd,
        instructor_id: String(req.user?._id),
        excludeSlotId: String(slot._id)
      }];
      const ok = await checkSlotInstructorLimit(targetWeekStart, targetDay, proposed);
      if (!ok) {
        res.status(400).json({
          message: `Cannot update/open slot. There are already 2 instructors conducting practical sessions at the same time on ${targetDay}.`
        });
        return;
      }
    }

    if (max_students !== undefined) slot.max_students = max_students;
    if (equipment_note !== undefined) slot.equipment_note = equipment_note;
    if (is_open !== undefined) slot.is_open = is_open;
    if (start_time !== undefined) slot.start_time = start_time;
    if (end_time !== undefined) slot.end_time = end_time;
    if (day_of_week !== undefined) slot.day_of_week = day_of_week;

    await slot.save();
    res.json(slot);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
