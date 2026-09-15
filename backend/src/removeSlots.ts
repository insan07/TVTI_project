import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tvti_db');
    console.log('Connected to DB');

    const SlotBooking = mongoose.model('SlotBooking', new mongoose.Schema({}, { strict: false }));
    const PracticeSlot = mongoose.model('PracticeSlot', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Find deactivated instructors
    const inactiveInstructors = await User.find({ role: 'instructor', is_active: false }).lean();
    const inactiveIds = inactiveInstructors.map(i => i._id);
    console.log(`Found ${inactiveIds.length} inactive instructors.`);

    // Find slots belonging to inactive instructors
    const inactiveSlots = await PracticeSlot.find({ instructor_id: { $in: inactiveIds } }).lean();
    const inactiveSlotIds = inactiveSlots.map(s => s._id);
    console.log(`Found ${inactiveSlotIds.length} practice slots belonging to inactive instructors.`);

    // Delete bookings for these slots
    const res = await SlotBooking.deleteMany({ slot_id: { $in: inactiveSlotIds } });
    console.log(`Deleted ${res.deletedCount} slot bookings.`);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
