import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export const searchDocuments = async (query) => {
  const res = await API.get("/api/search", {
    params: { q: query },
  });
  return res.data;
};
