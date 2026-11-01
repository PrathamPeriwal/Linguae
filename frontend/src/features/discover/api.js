import { axiosInstance } from "../../lib/axios";

export async function getRecommendedUsers({ cursor, q, language, signal } = {}) {
  const params = {};
  if (cursor) params.cursor = cursor;
  if (q) params.q = q;
  if (language) params.language = language;
  const response = await axiosInstance.get("/users", { params, signal });
  return response.data;
}
