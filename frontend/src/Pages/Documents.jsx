import { useEffect, useState } from "react";
import {
  fetchDocuments,
  deleteDocument,
  renameDocument,
  uploadDocument,
} from "../api/documents";
import DocumentCard from "../Components/DocumentCard";
import DocumentSkeleton from "../Components/DocumentSkeleton";
import { useNavigate } from "react-router-dom";
import "./Documents.css";
import Navbar from "../Components/Navbar";

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();

  const loadDocuments = async () => {
    setLoading(true);
    const data = await fetchDocuments();
    setDocuments(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async () => {
    if (!file) {
      showToast("Please select a file first");
      return;
    }

    setUploading(true);
    try {
      await uploadDocument(file);
      setFile(null);
      loadDocuments();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    await deleteDocument(confirmDelete);
    setConfirmDelete(null);
    loadDocuments();
  };

  return (
    <>
      <Navbar />

      <div className="docs-root">
        {/* Header */}
        <div className="docs-top">
          <h1>Your documents</h1>

          <button
            className="search-icon-btn"
            onClick={() => navigate("/search")}
            title="Search documents"
          >
            🔍
          </button>
        </div>

        {/* Upload */}
        <div className="docs-upload">
          <label
            className={`file-picker ${uploading ? "disabled" : ""}`}
          >
            Choose file
            <input
              type="file"
              accept=".pdf,.txt"
              hidden
              disabled={uploading}               // ✅ CHANGE #1
              onChange={(e) => {
                if (!uploading) {
                  setFile(e.target.files[0]);   // ✅ CHANGE #2
                }
              }}
            />
          </label>

          <span className="file-name">
            {file ? file.name : "No file selected"}
          </span>

          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>

        {/* Grid */}
        <div className="docs-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <DocumentSkeleton key={i} />
              ))
            : documents.map((doc) => (
                <DocumentCard
                  key={doc._id}
                  doc={doc}
                  onRename={renameDocument}
                  onDelete={() => setConfirmDelete(doc._id)}
                />
              ))}
        </div>

        {/* Delete Confirmation */}
        {confirmDelete && (
          <div className="modal-backdrop">
            <div className="modal">
              <h3>Delete document?</h3>
              <p>This action cannot be undone.</p>
              <div className="modal-actions">
                <button onClick={() => setConfirmDelete(null)}>
                  Cancel
                </button>
                <button className="danger" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Documents;

/* simple toast */
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
