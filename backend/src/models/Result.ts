import mongoose, { Document, Schema } from 'mongoose';

export interface IResult extends Document {
  student_id: mongoose.Types.ObjectId;
  batch_id: mongoose.Types.ObjectId;
  assessment_name: string;
  marks: number;
  grade?: string;
}

const resultSchema = new Schema<IResult>(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batch_id: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    assessment_name: { type: String, required: true },
    marks: { type: Number, required: true },
    grade: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IResult>('Result', resultSchema);
