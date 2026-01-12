import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export const fetchDocuments = async () => {
  const res = await API.get("/api/documents");
  return res.data;
};

export const deleteDocument = async (id) => {
  await API.delete(`/api/documents/${id}`);
};

export const renameDocument = async (id, filename) => {
  const res = await API.patch(`/api/documents/${id}`, { filename });
  return res.data;
};
export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await API.post("/api/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};
