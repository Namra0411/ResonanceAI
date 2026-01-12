import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export const getMe = async () => {
  const res = await API.get("/api/protected/me");
  return res.data;
};

export const logout = async () => {
  await API.post("/api/auth/logout");
};
