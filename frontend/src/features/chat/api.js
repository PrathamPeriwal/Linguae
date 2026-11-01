import { axiosInstance } from "../../lib/axios";

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}
