import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
    pairKey: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

friendRequestSchema.pre("validate", function setPairKey() {
  if (!this.sender || !this.recipient) return;
  const left = String(this.sender);
  const right = String(this.recipient);
  this.pairKey = left < right ? `${left}_${right}` : `${right}_${left}`;
});

// Old rows have no pairKey. The partial filter keeps index creation from failing on them.
friendRequestSchema.index(
  { pairKey: 1 },
  {
    unique: true,
    partialFilterExpression: { pairKey: { $type: "string" } },
  }
);
friendRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });
friendRequestSchema.index({ sender: 1, status: 1, updatedAt: -1 });

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

export default FriendRequest;
