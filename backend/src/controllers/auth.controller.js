import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { z } from "zod";
import { LANGUAGES } from "../constants/languages.js";
import { jwtCookieOptions } from "../lib/cookies.js";
import { upsertStreamUser } from "../lib/stream.js";
import User, { toSafeUser } from "../models/User.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Cost 10, same as the User pre-save hook. Not a real account.
const DUMMY_PASSWORD_HASH =
  "$2b$10$FdK8qMitAq/SY8bzKBOg6Oy9xKtHXJc7qbWOdPDRlVti92YLwSdxq";

const AVATAR_HOSTS = new Set(["api.dicebear.com", "avatar.iran.liara.run"]);
const ONBOARD_REQUIRED = [
  "fullName",
  "bio",
  "nativeLanguage",
  "learningLanguage",
  "location",
];

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Invalid email format")
  .regex(EMAIL_RE, "Invalid email format");

const signupPasswordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(72, "Password must be at most 72 characters");

const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Full name must be between 2 and 60 characters")
  .max(60, "Full name must be between 2 and 60 characters");

function languageSchema(name) {
  const label = name.toLowerCase();
  return z
    .string(`${name} must be text.`)
    .trim()
    .refine(
      (value) => LANGUAGES.includes(value),
      `Choose a ${label} from the list.`
    );
}

function allowedAvatar(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  return url.protocol === "https:" && AVATAR_HOSTS.has(url.hostname);
}

const onboardSchema = z
  .object({
    fullName: z
      .string("Full name must be text.")
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(60, "Full name must be at most 60 characters."),
    bio: z
      .string("Bio must be text.")
      .trim()
      .min(1, "Bio must be at least 1 character.")
      .max(300, "Bio must be at most 300 characters."),
    nativeLanguage: languageSchema("Native language"),
    learningLanguage: languageSchema("Learning language"),
    location: z
      .string("Location must be text.")
      .trim()
      .min(1, "Location must be at least 1 character.")
      .max(80, "Location must be at most 80 characters."),
    profilePic: z
      .string("Profile picture must be text.")
      .trim()
      .max(300, "Profile picture must be at most 300 characters.")
      .refine(
        allowedAvatar,
        "Profile picture must be an https link from api.dicebear.com or avatar.iran.liara.run."
      )
      .optional(),
  })
  .refine((data) => data.nativeLanguage !== data.learningLanguage, {
    message: "Choose a different language to learn.",
    path: ["learningLanguage"],
  });

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

function blankText(value) {
  return typeof value !== "string" || value.trim() === "";
}

function blankPassword(value) {
  return typeof value !== "string" || value.length === 0;
}

function duplicateEmail(error) {
  return error?.code === 11000 || error?.cause?.code === 11000;
}

function missingOnboardFields(body) {
  const source =
    body && typeof body === "object" && !Array.isArray(body) ? body : {};
  return ONBOARD_REQUIRED.filter((field) => {
    const value = source[field];
    return value == null || (typeof value === "string" && value.trim() === "");
  });
}

function onboardInput(body) {
  const source =
    body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const input = {
    fullName: source.fullName,
    bio: source.bio,
    nativeLanguage: source.nativeLanguage,
    learningLanguage: source.learningLanguage,
    location: source.location,
  };
  const picture = source.profilePic;
  if (picture !== undefined && !(typeof picture === "string" && picture.trim() === "")) {
    input.profilePic = picture;
  }
  return input;
}

function validationBody(error) {
  const errors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] != null ? String(issue.path[0]) : "form";
    if (!errors[field]) errors[field] = issue.message;
  }
  return {
    message: error.issues[0]?.message || "Invalid input",
    errors,
  };
}

async function syncStreamUser(user, label) {
  try {
    await upsertStreamUser({
      id: user._id.toString(),
      name: user.fullName,
      image: user.profilePic || "",
    });
  } catch (error) {
    console.error(label, error?.message);
  }
}

export async function signup(req, res) {
  const email = req.body?.email;
  const password = req.body?.password;
  const fullName = req.body?.fullName;

  if (blankText(email) || blankPassword(password) || blankText(fullName)) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const parsedPassword = signupPasswordSchema.safeParse(password);
  if (!parsedPassword.success) {
    const tooLong = parsedPassword.error.issues.some(
      (issue) => issue.code === "too_big"
    );
    return res.status(400).json({
      message: tooLong
        ? "Password must be at most 72 characters"
        : "Password must be at least 6 characters",
    });
  }

  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const parsedName = fullNameSchema.safeParse(fullName);
  if (!parsedName.success) {
    return res.status(400).json({
      message: "Full name must be between 2 and 60 characters",
    });
  }

  try {
    const existingUser = await User.findOne({ email: parsedEmail.data }).select(
      "_id"
    );
    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists, please use a different one",
      });
    }

    const _id = new mongoose.Types.ObjectId();
    const newUser = await User.create({
      _id,
      email: parsedEmail.data,
      fullName: parsedName.data,
      password: parsedPassword.data,
      profilePic: `https://api.dicebear.com/9.x/lorelei/svg?seed=${_id.toString()}`,
    });

    await syncStreamUser(newUser, "Error creating Stream user:");

    const token = signToken(newUser._id);
    res.cookie("jwt", token, jwtCookieOptions(true));
    res.status(201).json({ success: true, user: toSafeUser(newUser) });
  } catch (error) {
    if (duplicateEmail(error)) {
      return res.status(400).json({
        message: "Email already exists, please use a different one",
      });
    }
    console.error("Error in signup controller:", error?.name);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  const email = req.body?.email;
  const password = req.body?.password;

  if (blankText(email) || blankPassword(password)) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const user = await User.findOne({ email: parsedEmail.data }).select(
      "+password"
    );
    const matches = await bcrypt.compare(
      password,
      user?.password || DUMMY_PASSWORD_HASH
    );
    if (!user || !user.password || !matches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id);
    res.cookie("jwt", token, jwtCookieOptions(true));
    res.status(200).json({ success: true, user: toSafeUser(user) });
  } catch (error) {
    console.error("Error in login controller:", error?.name);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  res.clearCookie("jwt", jwtCookieOptions());
  res.status(200).json({ success: true, message: "Logout successful" });
}

export async function onboard(req, res) {
  try {
    const missingFields = missingOnboardFields(req.body);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields,
      });
    }

    const parsed = onboardSchema.safeParse(onboardInput(req.body));
    if (!parsed.success) {
      return res.status(400).json(validationBody(parsed.error));
    }

    const {
      fullName,
      bio,
      nativeLanguage,
      learningLanguage,
      location,
      profilePic,
    } = parsed.data;
    const update = {
      fullName,
      bio,
      nativeLanguage,
      learningLanguage,
      location,
      isOnboarded: true,
    };
    if (profilePic) update.profilePic = profilePic;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await syncStreamUser(
      updatedUser,
      "Error updating Stream user during onboarding:"
    );

    res.status(200).json({ success: true, user: toSafeUser(updatedUser) });
  } catch (error) {
    console.error("Onboarding error:", error?.name);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
