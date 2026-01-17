import { useEffect, useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { getDocumentSignedUrl } from "../api/documents";
import "./DocumentCard.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const SIGNED_URL_TTL = 5 * 60 * 1000; // 5 minutes

const statusIcon = {
  uploaded: "⏳",
  processing: "🔄",
  processed: "✅",
  failed: "❌",
};

/* ---------- persistent cache helpers ---------- */

const getCachedEntry = (id) => {
  try {
    const raw = localStorage.getItem(`doc_signed_url_${id}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const setCachedEntry = (id, entry) => {
  localStorage.setItem(
    `doc_signed_url_${id}`,
    JSON.stringify(entry)
  );
};

const clearCachedEntry = (id) => {
  localStorage.removeItem(`doc_signed_url_${id}`);
};

/* --------------------------------------------- */

const DocumentCard = ({ doc, onRename, onDelete }) => {
  if (!doc) return null;

  const cached = getCachedEntry(doc._id);

  const [signedUrl, setSignedUrl] = useState(() => {
    if (!cached) return null;
    if (Date.now() - cached.cachedAt > SIGNED_URL_TTL) return null;
    return cached.url;
  });

  const [displayName, setDisplayName] = useState(doc.filename);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState(doc.filename);

  const hasRefreshedRef = useRef(false);

  const loadSignedUrl = async (force = false) => {
    if (signedUrl && !force) return;

    const { url } = await getDocumentSignedUrl(doc._id);

    const entry = {
      url,
      cachedAt: Date.now(),
    };

    setCachedEntry(doc._id, entry);
    setSignedUrl(url);
  };

  const handleView = async () => {
    if (showRename) return;

    if (!signedUrl) {
      await loadSignedUrl();
    }

    const finalUrl =
      signedUrl ||
      getCachedEntry(doc._id)?.url;

    if (finalUrl) {
      window.open(finalUrl, "_blank");
    }
  };

  useEffect(() => {
    if (doc.fileType === "pdf" && !signedUrl) {
      loadSignedUrl();
    }
  }, []);

  const handlePdfLoadError = async () => {
    if (hasRefreshedRef.current) return;

    hasRefreshedRef.current = true;
    clearCachedEntry(doc._id);
    setSignedUrl(null);

    await loadSignedUrl(true);
  };

  const submitRename = async () => {
    if (!newName.trim()) return;

    // optimistic UI
    setDisplayName(newName);

    await onRename(doc._id, newName);
    setShowRename(false);
  };

  return (
    <>
      <div className="document-card" onClick={handleView}>
        <div className="document-thumbnail">
          {doc.fileType === "pdf" && signedUrl ? (
            <Document
              file={signedUrl}
              loading={null}
              onLoadError={handlePdfLoadError}
            >
              <Page
                pageNumber={1}
                width={140}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          ) : (
            <span className="file-icon">📄</span>
          )}
        </div>

        <div className="document-info">
          <div
            className="document-title"
            title={displayName}
          >
            {displayName}
          </div>

          <div className="document-meta">
            <span className="meta-small">
              {doc.fileType.toUpperCase()}
            </span>
            <span className="meta-small">
              {statusIcon[doc.status]} {doc.status}
            </span>
          </div>
        </div>

        <div
          className="document-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => setShowRename(true)}>
            Rename
          </button>
          <button onClick={() => onDelete(doc._id)}>
            Delete
          </button>
        </div>
      </div>

      {showRename && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Rename document</h3>
            <input
              className="modal-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowRename(false)}>
                Cancel
              </button>
              <button className="primary" onClick={submitRename}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentCard;
