import { generateStreamToken } from "../lib/stream.js";

export async function getStreamToken(req, res) {
  try {
    const token = generateStreamToken(req.user.id);
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("Stream token was empty");
    }
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error in getStreamToken controller:", error?.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
