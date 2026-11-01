import mongoose from "mongoose";
import bcrypt from "bcryptjs";

function stripHidden(_doc, ret) {
  delete ret.password;
  delete ret.__v;
  return ret;
}

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    bio: {
      type: String,
      default: "",
    },
    profilePic: {
      type: String,
      default: "",
    },
    nativeLanguage: {
      type: String,
      default: "",
    },
    learningLanguage: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { transform: stripHidden },
    toObject: { transform: stripHidden },
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.index({ isOnboarded: 1, _id: -1 });
userSchema.index({ nativeLanguage: 1, _id: -1 });

userSchema.methods.matchPassword = async function (enteredPassword) {
  const isPasswordCorrect = await bcrypt.compare(
    enteredPassword,
    this.password
  );
  return isPasswordCorrect;
};

const User = mongoose.model("User", userSchema);

const SAFE_USER_FIELDS = [
  "_id",
  "fullName",
  "email",
  "profilePic",
  "bio",
  "nativeLanguage",
  "learningLanguage",
  "location",
  "isOnboarded",
];

export function toSafeUser(user) {
  const source =
    user && typeof user.toObject === "function" ? user.toObject() : user || {};
  const safe = {};
  for (const field of SAFE_USER_FIELDS) {
    safe[field] = source[field];
  }
  if (safe.profilePic == null) safe.profilePic = "";
  if (safe.bio == null) safe.bio = "";
  if (safe.nativeLanguage == null) safe.nativeLanguage = "";
  if (safe.learningLanguage == null) safe.learningLanguage = "";
  if (safe.location == null) safe.location = "";
  safe.isOnboarded = safe.isOnboarded === true;
  return safe;
}

export default User;
