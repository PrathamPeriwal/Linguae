import { axiosInstance } from "../../lib/axios";

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}
