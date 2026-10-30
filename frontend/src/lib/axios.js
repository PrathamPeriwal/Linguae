import axios from "axios";
import { getErrorMessage } from "./errors";

const devBase =
  import.meta.env.VITE_API_BASE_URL_DEV || "http://localhost:5001/api";
const prodBase = import.meta.env.VITE_API_BASE_URL || "/api";
const BASE_URL = import.meta.env.MODE === "development" ? devBase : prodBase;

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send cookies with the request
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    error.userMessage = getErrorMessage(error);
    return Promise.reject(error);
  }
);
