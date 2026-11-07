import { Response } from 'express';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendNotification } from '../services/notificationService';

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
// Body: { batch_id, week_start_date, slots: [{ day_of_week, start_time, end_time, max_students, equipment_note, location, booking_deadline }] }
export const createSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batch_id, week_start_date, slots } = req.body;
    
    const normalizedWeekStart = new Date(week_start_date);
    normalizedWeekStart.setUTCHours(0, 0, 0, 0);

    // Validate that slots are not created for dates/times in the past
    const now = new Date();
    const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const s of slots) {
      const dayIdx = DAYS_LIST.indexOf(s.day_of_week);
      const slotDate = new Date(normalizedWeekStart);
      if (dayIdx !== -1) {
        slotDate.setUTCDate(slotDate.getUTCDate() + dayIdx);
      }
      const timeToCheck = s.end_time || s.start_time || '23:59';
      const [h, m] = timeToCheck.split(':').map((v: string) => parseInt(v, 10) || 0);

      const slotEndDateTime = new Date(
        slotDate.getUTCFullYear(),
        slotDate.getUTCMonth(),
        slotDate.getUTCDate(),
        h,
        m,
        0,
        0
      );

      if (slotEndDateTime.getTime() < now.getTime()) {
        res.status(400).json({
          message: `Cannot create slots in the past (${s.day_of_week} ${s.start_time || ''}). Past dates are view-only.`
        });
        return;
      }
    }

    // Group proposed slots by day_of_week to validate day-by-day
    const targetInstructorId = (req.user?.role === 'admin' && req.body.instructor_id) ? req.body.instructor_id : req.user?._id;

    // Enforce rule: An instructor can only have 1 practical slot per day
    const seenInstructorDays = new Set<string>();
    for (const s of slots) {
      const slotInstId = String(s.instructor_id || targetInstructorId);
      const dayKey = `${slotInstId}:${s.day_of_week}`;
      if (seenInstructorDays.has(dayKey)) {
        res.status(400).json({
          message: `An instructor can only create one practical slot per day (${s.day_of_week}).`
        });
        return;
      }
      seenInstructorDays.add(dayKey);

      const existingForInstructorOnDay = await PracticeSlot.findOne({
        instructor_id: slotInstId,
        week_start_date: normalizedWeekStart,
        day_of_week: s.day_of_week
      });
      if (existingForInstructorOnDay) {
        res.status(400).json({
          message: `Only one practical slot per day is allowed per instructor. A slot is already scheduled on ${s.day_of_week}.`
        });
        return;
      }
    }

    const slotsByDay: { [key: string]: any[] } = {};
    for (const s of slots) {
      if (!slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week] = [];
      slotsByDay[s.day_of_week].push(s);
    }

    for (const day of Object.keys(slotsByDay)) {
      const proposed = slotsByDay[day].map(s => ({
        start_time: s.start_time,
        end_time: s.end_time,
        instructor_id: String(s.instructor_id || targetInstructorId)
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
        instructor_id: s.instructor_id || targetInstructorId,
        week_start_date: normalizedWeekStart,
        is_open: true,
      }))
    );

    // Send instant notification to enrolled batch students (non-blocking)
    try {
      await sendNotification({
        batchId: batch_id,
        title: 'New Practice Slots Open',
        message: 'New practical session slots have been posted for your batch. Book your slot now!',
        type: 'practice_slots',
        link: '/schedule'
      });

      // If an admin created practical slots on behalf of an instructor, notify that instructor
      if (req.user?.role === 'admin') {
        const distinctInstructorIds: string[] = Array.from(
          new Set<string>(
            slots
              .map((s: any) => String(s.instructor_id || targetInstructorId || ''))
              .filter((id: string) => id && id !== String(req.user?._id))
          )
        );
        if (distinctInstructorIds.length > 0) {
          await sendNotification({
            userIds: distinctInstructorIds,
            title: 'New Practical Slots Assigned',
            message: `Admin scheduled ${created.length} practical session slot(s) for you (${slots.map((s: any) => `${s.day_of_week} ${s.start_time}-${s.end_time}`).join(', ')}).`,
            type: 'practice_slots',
            relatedId: created[0]?._id,
            link: '/instructor/practice'
          });
        }
      }
    } catch (notifErr) {
      console.warn('[PracticeSlot Notification Warning]:', notifErr);
    }

    res.status(201).json(created);
  } catch (error: any) {
    console.error('[createSlots Error]:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
};

// GET /api/instructor/practice-slots?batchId=&weekStart=
export const getMySlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId, weekStart, instructorId } = req.query;
    const query: any = req.user?.role === 'admin' ? {} : { instructor_id: req.user?._id };
    if (batchId) query.batch_id = batchId;
    if (instructorId && req.user?.role === 'admin') query.instructor_id = instructorId;
    
    if (req.query.startDate && req.query.endDate) {
      query.week_start_date = {
        $gte: new Date(req.query.startDate as string),
        $lte: new Date(req.query.endDate as string)
      };
    } else if (weekStart) {
      const normalized = new Date(weekStart as string);
      normalized.setUTCHours(0, 0, 0, 0);
      query.week_start_date = normalized;
    }

    const slots = await PracticeSlot.find(query)
      .populate('batch_id', 'name course_id')
      .populate({ path: 'batch_id', populate: { path: 'course_id', select: 'title' } })
      .populate('instructor_id', 'name email phone')
      .sort({ week_start_date: 1, day_of_week: 1, start_time: 1 });

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
    const bookings = await SlotBooking.find({ slot_id: req.params.slotId, status: { $in: ['confirmed', 'cancellation_requested'] } })
      .populate('student_id', 'name email phone index_number nic');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/instructor/practice-slots/:slotId
// Body: { max_students?, equipment_note?, is_open?, start_time?, end_time?, day_of_week?, location?, booking_deadline? }
export const updateSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slot = req.user?.role === 'admin'
      ? await PracticeSlot.findById(req.params.slotId)
      : await PracticeSlot.findOne({ _id: req.params.slotId, instructor_id: req.user?._id });
    if (!slot) {
      res.status(404).json({ message: 'Slot not found' });
      return;
    }

    const { max_students, equipment_note, is_open, start_time, end_time, day_of_week, instructor_id, location, booking_deadline } = req.body;

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

    // Validate that expired/past slots cannot be edited or locked/unlocked (only viewed or deleted)
    const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const existingDayIdx = DAYS_LIST.indexOf(slot.day_of_week);
    const existingActualDate = new Date(slot.week_start_date);
    if (existingDayIdx !== -1) {
      existingActualDate.setUTCDate(existingActualDate.getUTCDate() + existingDayIdx);
    }
    const [exH, exM] = (slot.end_time || '23:59').split(':').map((v: string) => parseInt(v, 10) || 0);
    const existingEndDateTime = new Date(
      existingActualDate.getUTCFullYear(),
      existingActualDate.getUTCMonth(),
      existingActualDate.getUTCDate(),
      exH,
      exM,
      0,
      0
    );

    if (existingEndDateTime.getTime() < Date.now()) {
      res.status(400).json({
        message: 'Expired practical slots cannot be edited or locked. You can only view students or delete the slot.'
      });
      return;
    }

    const dayIdx = DAYS_LIST.indexOf(targetDay);
    const slotActualDate = new Date(targetWeekStart);
    if (dayIdx !== -1) {
      slotActualDate.setUTCDate(slotActualDate.getUTCDate() + dayIdx);
    }
    const [h, m] = (targetEnd || '23:59').split(':').map((v: string) => parseInt(v, 10) || 0);
    const slotEndDateTime = new Date(
      slotActualDate.getUTCFullYear(),
      slotActualDate.getUTCMonth(),
      slotActualDate.getUTCDate(),
      h,
      m,
      0,
      0
    );

    if (slotEndDateTime.getTime() < Date.now()) {
      res.status(400).json({
        message: 'Practical slots cannot be rescheduled to a past date or time.'
      });
      return;
    }

    const targetInstructorForUpdate = String(instructor_id || slot.instructor_id);
    const duplicateOnSameDay = await PracticeSlot.findOne({
      _id: { $ne: slot._id },
      instructor_id: targetInstructorForUpdate,
      week_start_date: targetWeekStart,
      day_of_week: targetDay
    });
    if (duplicateOnSameDay) {
      res.status(400).json({
        message: `Only one practical slot per day is allowed per instructor. A slot already exists on ${targetDay}.`
      });
      return;
    }

    if (targetIsOpen) {
      const proposed = [{
        start_time: targetStart,
        end_time: targetEnd,
        instructor_id: String(instructor_id || slot.instructor_id),
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

    const prevInstructorId = String(slot.instructor_id);
    const scheduleOrStatusChanged =
      (day_of_week !== undefined && day_of_week !== slot.day_of_week) ||
      (start_time !== undefined && start_time !== slot.start_time) ||
      (end_time !== undefined && end_time !== slot.end_time) ||
      (location !== undefined && location !== slot.location) ||
      (is_open !== undefined && is_open !== slot.is_open);

    if (max_students !== undefined) slot.max_students = max_students;
    if (equipment_note !== undefined) slot.equipment_note = equipment_note;
    if (is_open !== undefined) slot.is_open = is_open;
    if (start_time !== undefined) slot.start_time = start_time;
    if (end_time !== undefined) end_time && (slot.end_time = end_time);
    if (day_of_week !== undefined) slot.day_of_week = day_of_week;
    if (instructor_id !== undefined && req.user?.role === 'admin') slot.instructor_id = instructor_id;
    if (location !== undefined) slot.location = location;
    if (booking_deadline !== undefined) slot.booking_deadline = booking_deadline;

    await slot.save();

    // Notify booked students if the slot's schedule, location, or open status changed
    try {
      if (scheduleOrStatusChanged) {
        const activeBookings = await SlotBooking.find({
          slot_id: slot._id,
          status: { $in: ['confirmed', 'cancellation_requested'] }
        }).select('student_id');
        const bookedStudentIds = activeBookings.map(b => String(b.student_id));
        if (bookedStudentIds.length > 0) {
          await sendNotification({
            userIds: bookedStudentIds,
            title: is_open === false ? 'Practical Slot Locked' : 'Practical Slot Updated',
            message: `Your practical session is now scheduled for ${slot.day_of_week} (${slot.start_time} - ${slot.end_time})${slot.location ? ` at ${slot.location}` : ''}.`,
            type: 'schedule_change',
            relatedId: slot._id,
            link: '/schedule'
          });
        }
      }

      if (instructor_id && String(instructor_id) !== prevInstructorId) {
        await sendNotification({
          userIds: [String(instructor_id)],
          title: 'Practical Slot Assigned',
          message: `You have been assigned to conduct the practical session on ${slot.day_of_week} (${slot.start_time} - ${slot.end_time}).`,
          type: 'practice_slots',
          relatedId: slot._id,
          link: '/instructor/practice'
        });
      }
    } catch (notifErr) {
      console.warn('[updateSlot Notification Warning]:', notifErr);
    }

    res.json(slot);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/instructors/practice-slots/:slotId/bookings/:bookingId
export const cancelBookingByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slot = await PracticeSlot.findById(req.params.slotId);
    if (slot) {
      const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayIdx = DAYS_LIST.indexOf(slot.day_of_week);
      const slotActualDate = new Date(slot.week_start_date);
      if (dayIdx !== -1) slotActualDate.setUTCDate(slotActualDate.getUTCDate() + dayIdx);
      const [h, m] = (slot.end_time || '23:59').split(':').map((v: string) => parseInt(v, 10) || 0);
      const slotEndDateTime = new Date(slotActualDate.getUTCFullYear(), slotActualDate.getUTCMonth(), slotActualDate.getUTCDate(), h, m, 0, 0);
      if (slotEndDateTime.getTime() < Date.now()) {
        res.status(400).json({ message: 'Cannot modify bookings for an expired practical slot.' });
        return;
      }
    }

    const booking = await SlotBooking.findByIdAndDelete(req.params.bookingId);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    if (booking.student_id) {
      await sendNotification({
        userIds: [String(booking.student_id)],
        title: 'Practical Booking Removed',
        message: slot
          ? `Your booking for the ${slot.day_of_week} (${slot.start_time} - ${slot.end_time}) practical session has been removed by the ${req.user?.role || 'instructor'}.`
          : 'Your practical slot booking has been removed.',
        type: 'booking_rejected',
        relatedId: slot?._id || booking.slot_id,
        link: '/schedule'
      });
    }

    res.json({ message: 'Booking removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/instructors/practice-slots/:slotId
export const deleteSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slot = req.user?.role === 'admin'
      ? await PracticeSlot.findById(req.params.slotId)
      : await PracticeSlot.findOne({ _id: req.params.slotId, instructor_id: req.user?._id });

    if (!slot) {
      res.status(404).json({ message: 'Slot not found' });
      return;
    }

    const existingBookings = await SlotBooking.find({
      slot_id: slot._id,
      status: { $in: ['confirmed', 'cancellation_requested'] }
    }).select('student_id');
    const bookedStudentIds = existingBookings.map(b => String(b.student_id));

    await SlotBooking.deleteMany({ slot_id: slot._id });
    await PracticeSlot.findByIdAndDelete(slot._id);

    if (bookedStudentIds.length > 0) {
      await sendNotification({
        userIds: bookedStudentIds,
        title: 'Practical Session Cancelled',
        message: `The practical session scheduled on ${slot.day_of_week} (${slot.start_time} - ${slot.end_time}) has been cancelled.`,
        type: 'schedule_change',
        relatedId: slot._id,
        link: '/schedule'
      });
    }

    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/instructors/practice-slots/:slotId/bookings
export const addStudentBookingByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { student_id } = req.body;
    const slot = await PracticeSlot.findById(req.params.slotId);
    if (!slot) {
      res.status(404).json({ message: 'Slot not found' });
      return;
    }

    const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayIdx = DAYS_LIST.indexOf(slot.day_of_week);
    const slotActualDate = new Date(slot.week_start_date);
    if (dayIdx !== -1) slotActualDate.setUTCDate(slotActualDate.getUTCDate() + dayIdx);
    const [h, m] = (slot.end_time || '23:59').split(':').map((v: string) => parseInt(v, 10) || 0);
    const slotEndDateTime = new Date(slotActualDate.getUTCFullYear(), slotActualDate.getUTCMonth(), slotActualDate.getUTCDate(), h, m, 0, 0);
    if (slotEndDateTime.getTime() < Date.now()) {
      res.status(400).json({ message: 'Cannot assign students to an expired practical slot.' });
      return;
    }

    const existing = await SlotBooking.findOne({ slot_id: slot._id, student_id, status: 'confirmed' });
    if (existing) {
      res.status(400).json({ message: 'Student is already booked in this slot' });
      return;
    }

    const booking = await SlotBooking.create({
      slot_id: slot._id,
      student_id,
      status: 'confirmed'
    });

    await sendNotification({
      userIds: [String(student_id)],
      title: 'Practical Slot Assigned ✅',
      message: `You have been assigned to the practical session on ${slot.day_of_week} (${slot.start_time} - ${slot.end_time})${slot.location ? ` at ${slot.location}` : ''}.`,
      type: 'booking_confirmed',
      relatedId: slot._id,
      link: '/schedule'
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/instructors/practice-slots/:slotId/bookings/:bookingId/approve-cancellation
export const approveCancellation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const booking = await SlotBooking.findOneAndUpdate(
      { _id: req.params.bookingId, status: 'cancellation_requested' },
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) { res.status(404).json({ message: 'Pending cancellation not found' }); return; }

    const slot = await PracticeSlot.findById(booking.slot_id);
    if (booking.student_id) {
      await sendNotification({
        userIds: [String(booking.student_id)],
        title: 'Cancellation Request Approved ✅',
        message: slot
          ? `Your request to cancel the practical session on ${slot.day_of_week} (${slot.start_time} - ${slot.end_time}) has been approved.`
          : 'Your request to cancel the practical session booking has been approved.',
        type: 'cancellation_approved',
        relatedId: booking.slot_id,
        link: '/schedule'
      });
    }

    res.json({ message: 'Cancellation approved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/instructors/practice-slots/:slotId/bookings/:bookingId/reject-cancellation
export const rejectCancellation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const booking = await SlotBooking.findOneAndUpdate(
      { _id: req.params.bookingId, status: 'cancellation_requested' },
      { status: 'confirmed' },
      { new: true }
    );
    if (!booking) { res.status(404).json({ message: 'Pending cancellation not found' }); return; }

    const slot = await PracticeSlot.findById(booking.slot_id);
    if (booking.student_id) {
      await sendNotification({
        userIds: [String(booking.student_id)],
        title: 'Cancellation Request Declined ❌',
        message: slot
          ? `Your request to cancel the practical session on ${slot.day_of_week} (${slot.start_time} - ${slot.end_time}) was declined. Your booking remains confirmed.`
          : 'Your cancellation request was declined. Your practical slot booking remains confirmed.',
        type: 'cancellation_rejected',
        relatedId: booking.slot_id,
        link: '/schedule'
      });
    }

    res.json({ message: 'Cancellation rejected (re-confirmed)' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
