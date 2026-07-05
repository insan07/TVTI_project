import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  student_id: mongoose.Types.ObjectId;
  batch_id: mongoose.Types.ObjectId;
  session_date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
}

const attendanceSchema = new Schema<IAttendance>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batch_id: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    session_date: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['present', 'absent', 'late', 'excused'], 
      required: true 
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAttendance>('Attendance', attendanceSchema);
