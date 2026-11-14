import mongoose, { Schema } from 'mongoose';

const schema = new Schema({ _id: String, value: { type: Number, required: true } }, { versionKey: false });
export default mongoose.model('AccountSequence', schema);
