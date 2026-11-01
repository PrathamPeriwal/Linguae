import { axiosInstance } from "../../lib/axios";

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}
