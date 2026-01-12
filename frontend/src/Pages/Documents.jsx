import { useEffect, useState } from "react";
import {
  fetchDocuments,
  deleteDocument,
  renameDocument,
  uploadDocument,
} from "../api/documents";

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadDocuments = async () => {
    const data = await fetchDocuments();
    setDocuments(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    setUploading(true);
    try {
      await uploadDocument(file);
      setFile(null);
      await loadDocuments();
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this document?")) return;
    await deleteDocument(id);
    loadDocuments();
  };

  const handleRename = async (doc) => {
    const newName = prompt("New filename", doc.filename);
    if (!newName) return;
    await renameDocument(doc._id, newName);
    loadDocuments();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h2>Your Documents</h2>

      {/* Upload Section */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="file"
          accept=".pdf,.txt"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button onClick={handleUpload} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {documents.length === 0 && <p>No documents uploaded</p>}

      <ul>
        {documents.map((doc) => (
          <li key={doc._id} style={{ marginBottom: 10 }}>
            <strong>{doc.filename}</strong> ({doc.fileType}) —{" "}
            {doc.status}
            <br />
            <button onClick={() => handleRename(doc)}>Rename</button>
            <button onClick={() => handleDelete(doc._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Documents;
