import mongoose, { Document, Schema } from 'mongoose';

export interface IPracticeSlot extends Document {
  batch_id: mongoose.Types.ObjectId;
  instructor_id: mongoose.Types.ObjectId;
  week_start_date: Date;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  start_time: string;
  end_time: string;
  max_students: number;
  equipment_note?: string;
  is_open: boolean;
}

const practiceSlotSchema = new Schema<IPracticeSlot>(
  {
    batch_id:        { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    instructor_id:   { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    week_start_date: { type: Date, required: true },
    day_of_week:     { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], required: true },
    start_time:      { type: String, required: true },
    end_time:        { type: String, required: true },
    max_students:    { type: Number, required: true, min: 1 },
    equipment_note:  { type: String },
    is_open:         { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPracticeSlot>('PracticeSlot', practiceSlotSchema);
