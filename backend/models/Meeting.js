import mongoose from 'mongoose';

const { Schema } = mongoose;

const actionItem = new Schema(
  {
    task: { type: String, required: true },
    owner: { type: String, default: null },
    dueDate: { type: String, default: null },
    status: { type: String, default: 'pending' },
  },
  { _id: false }
);

const meetingSchema = new Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: 'Untitled meeting', maxlength: 120, trim: true },
  host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hostName: { type: String, default: '' },
  participants: [{ _id: false, userId: String, name: String }],
  chatLog: [{ _id: false, sender: String, senderId: String, text: String, at: Date }],
  transcript: [{ _id: false, speaker: String, speakerId: String, text: String, at: Date }],
  summary: {
    text: { type: String, default: '' },
    keyDecisions: { type: [String], default: [] },
    actionItems: { type: [actionItem], default: [] },
    generatedAt: { type: Date, default: null },
    model: { type: String, default: '' },
    sourceCount: { type: Number, default: 0 },
  },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
});

export const MAX_CHAT = 500;
export const MAX_TRANSCRIPT = 3000;

export const isMember = (meeting, user) =>
  String(meeting.host) === user.id || meeting.participants.some((p) => p.userId === user.id);

export default mongoose.model('Meeting', meetingSchema);
