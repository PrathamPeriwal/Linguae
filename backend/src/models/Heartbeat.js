import mongoose from "mongoose";

const heartbeatSchema = new mongoose.Schema(
  {
    _id: { type: String },
    lastBeatAt: { type: Date, required: true },
    beats: { type: Number, required: true },
  },
  {
    collection: "system_heartbeat",
    versionKey: false,
    timestamps: false,
  }
);

const Heartbeat =
  mongoose.models.Heartbeat || mongoose.model("Heartbeat", heartbeatSchema);

const MAIN_ID = "main";

export async function recordHeartbeat(at = new Date()) {
  const when = at instanceof Date ? at : new Date(at);
  return Heartbeat.findByIdAndUpdate(
    MAIN_ID,
    { $set: { lastBeatAt: when }, $inc: { beats: 1 } },
    { upsert: true, new: true }
  );
}

export default Heartbeat;
