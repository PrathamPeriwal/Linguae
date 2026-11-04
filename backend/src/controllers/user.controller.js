import mongoose from "mongoose";
import { LANGUAGES } from "../constants/languages.js";
import { notifyUser } from "../lib/stream.js";
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";

const FRIEND_FIELDS =
  "fullName profilePic nativeLanguage learningLanguage location";
const PUBLIC_USER_FIELDS =
  "_id fullName profilePic bio location nativeLanguage learningLanguage";

const INCOMING_LIMIT = 50;
const ACCEPTED_LIMIT = 10;
const OUTGOING_LIMIT = 200;
const FRIENDS_LIMIT = 500;
const USERS_DEFAULT_LIMIT = 12;
const USERS_MAX_LIMIT = 50;
const SEARCH_MAX = 60;

const ALREADY_EXISTS =
  "A friend request already exists between you and this user";
const ALREADY_SENT_YOU =
  "They already sent you a request. Check your Requests page.";

function sameId(left, right) {
  if (left == null || right == null) return false;
  if (typeof left.equals === "function") return left.equals(right);
  return String(left) === String(right);
}

function hasFriend(user, otherId) {
  for (const friendId of user?.friends || []) {
    if (sameId(friendId, otherId)) return true;
  }
  return false;
}

function duplicateKey(error) {
  return (
    error?.code === 11000 ||
    error?.cause?.code === 11000 ||
    error?.errorResponse?.code === 11000
  );
}

function queryValue(value) {
  if (Array.isArray(value)) return queryValue(value[0]);
  if (value == null) return undefined;
  if (typeof value !== "string") return null;
  return value;
}

function pageLimit(raw) {
  const value = queryValue(raw);
  if (value == null || value.trim() === "") return USERS_DEFAULT_LIMIT;
  if (!/^-?\d+$/.test(value.trim())) return USERS_DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return USERS_DEFAULT_LIMIT;
  return Math.min(USERS_MAX_LIMIT, Math.max(1, parsed));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function logNotify(error) {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : "";
  console.error(name, message);
}

function publish(userId, type, requestId, fromUserId) {
  try {
    const pending = notifyUser(String(userId), {
      type,
      requestId: String(requestId),
      fromUserId: String(fromUserId),
    });
    Promise.resolve(pending).catch(logNotify);
  } catch (error) {
    logNotify(error);
  }
}

async function linkFriends(senderId, recipientId) {
  await User.bulkWrite(
    [
      {
        updateOne: {
          filter: { _id: senderId },
          update: { $addToSet: { friends: recipientId } },
        },
      },
      {
        updateOne: {
          filter: { _id: recipientId },
          update: { $addToSet: { friends: senderId } },
        },
      },
    ],
    { ordered: false }
  );
}

export async function getRecommendedUsers(req, res) {
  try {
    const limit = pageLimit(req.query.limit);
    const cursor = queryValue(req.query.cursor);
    if (cursor === null) {
      return res.status(400).json({ message: "Invalid cursor" });
    }
    if (cursor && !mongoose.isValidObjectId(cursor)) {
      return res.status(400).json({ message: "Invalid cursor" });
    }

    const language = queryValue(req.query.language);
    if (language === null) {
      return res.status(400).json({ message: "Invalid language" });
    }
    if (language && !LANGUAGES.includes(language)) {
      return res.status(400).json({ message: "Invalid language" });
    }

    const search = queryValue(req.query.q);
    if (search === null) {
      return res.status(400).json({ message: "Invalid search" });
    }
    const name = search ? search.trim() : "";
    if (name.length > SEARCH_MAX) {
      return res.status(400).json({
        message: "Search must be at most 60 characters",
      });
    }

    const idFilter = { $ne: req.user._id };
    if (req.user.friends?.length) idFilter.$nin = req.user.friends;

    const filter = { isOnboarded: true, _id: idFilter };
    if (language) filter.nativeLanguage = language;
    if (name) filter.fullName = { $regex: escapeRegex(name), $options: "i" };

    const pageId = { ...idFilter };
    if (cursor) pageId.$lt = cursor;

    const [total, docs] = await Promise.all([
      User.countDocuments(filter),
      User.find({ ...filter, _id: pageId })
        .select(PUBLIC_USER_FIELDS)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean(),
    ]);

    const hasMore = docs.length > limit;
    const users = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore ? String(users[users.length - 1]._id) : null;

    res.status(200).json({ users, nextCursor, total });
  } catch (error) {
    console.error("Error in getRecommendedUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const user = await User.findById(req.user.id).select("friends").lean();
    const ids = user?.friends || [];
    const friends =
      ids.length === 0
        ? []
        : await User.find({ _id: { $in: ids } })
            .select(FRIEND_FIELDS)
            .sort({ fullName: 1 })
            .limit(FRIENDS_LIMIT)
            .lean();

    res.status(200).json(friends);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const { id: recipientId } = req.params;

    if (!mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    if (sameId(req.user._id, recipientId)) {
      return res
        .status(400)
        .json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    if (!recipient.isOnboarded) {
      return res.status(400).json({ message: "Recipient is not onboarded" });
    }

    if (hasFriend(recipient, myId) || hasFriend(req.user, recipientId)) {
      return res
        .status(400)
        .json({ message: "You are already friends with this user" });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId },
        { sender: recipientId, recipient: myId },
      ],
    });

    if (existingRequest) {
      const theySentMe =
        existingRequest.status === "pending" &&
        sameId(existingRequest.sender, recipientId) &&
        sameId(existingRequest.recipient, myId);
      if (theySentMe) {
        return res.status(409).json({ message: ALREADY_SENT_YOU });
      }
      return res.status(400).json({ message: ALREADY_EXISTS });
    }

    const friendRequest = await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
    });

    res.status(201).json(friendRequest);
    publish(recipientId, "friend_request_received", friendRequest._id, myId);
  } catch (error) {
    if (duplicateKey(error)) {
      return res.status(400).json({ message: ALREADY_EXISTS });
    }
    console.error("Error in sendFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;

    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const accepted = await FriendRequest.findOneAndUpdate(
      { _id: requestId, recipient: req.user._id, status: "pending" },
      { status: "accepted" },
      { new: true }
    );

    if (!accepted) {
      const existing = await FriendRequest.findById(requestId)
        .select("sender recipient status")
        .lean();
      if (!existing) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      if (!sameId(existing.recipient, req.user._id)) {
        return res.status(403).json({
          message: "You are not authorized to accept this request",
        });
      }
      if (existing.status === "accepted") {
        await linkFriends(existing.sender, existing.recipient);
        res.status(200).json({ message: "Friend request accepted" });
        publish(
          existing.sender,
          "friend_request_accepted",
          existing._id,
          existing.recipient
        );
        return;
      }
      return res.status(404).json({ message: "Friend request not found" });
    }

    await linkFriends(accepted.sender, accepted.recipient);
    res.status(200).json({ message: "Friend request accepted" });
    publish(accepted.sender, "friend_request_accepted", accepted._id, accepted.recipient);
  } catch (error) {
    console.error("Error in acceptFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;

    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const deleted = await FriendRequest.findOneAndDelete({
      _id: requestId,
      status: "pending",
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    });

    if (!deleted) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    const actorId = req.user._id;
    const otherId = sameId(deleted.sender, actorId) ? deleted.recipient : deleted.sender;
    res.status(200).json({ message: "Friend request removed" });
    publish(otherId, "friend_request_removed", deleted._id, actorId);
  } catch (error) {
    console.error("Error in deleteFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFriendRequests(req, res) {
  try {
    const incomingReqs = await FriendRequest.find({
      recipient: req.user.id,
      status: "pending",
    })
      .populate("sender", FRIEND_FIELDS)
      .sort({ createdAt: -1 })
      .limit(INCOMING_LIMIT)
      .lean();

    const acceptedReqs = await FriendRequest.find({
      sender: req.user.id,
      status: "accepted",
    })
      .populate("recipient", "fullName profilePic")
      .sort({ updatedAt: -1 })
      .limit(ACCEPTED_LIMIT)
      .lean();

    res.status(200).json({ incomingReqs, acceptedReqs });
  } catch (error) {
    console.error("Error in getFriendRequests controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const outgoingRequests = await FriendRequest.find({
      sender: req.user.id,
      status: "pending",
    })
      .populate("recipient", "_id")
      .sort({ createdAt: -1 })
      .limit(OUTGOING_LIMIT)
      .lean();

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.error("Error in getOutgoingFriendReqs controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
