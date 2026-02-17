import { useParams } from "react-router-dom";
import { useState, useRef } from "react";
import PDFViewer from "../Components/PDFViewer";
import DocumentChat from "./DocumentChat";
import "./DocumentPage.css";

const MIN_CHAT_WIDTH = 320;
const MAX_CHAT_WIDTH = 560;

const DocumentPage = () => {
  const { id: documentId } = useParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [chatWidth, setChatWidth] = useState(420);

  const draggingRef = useRef(false);

  const goPrev = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const goNext = () => {
    if (!totalPages) return;
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const onMouseDown = () => {
    draggingRef.current = true;
  };

  const onMouseMove = (e) => {
    if (!draggingRef.current) return;

    const newWidth =
      window.innerWidth - e.clientX;

    if (
      newWidth >= MIN_CHAT_WIDTH &&
      newWidth <= MAX_CHAT_WIDTH
    ) {
      setChatWidth(newWidth);
    }
  };

  const onMouseUp = () => {
    draggingRef.current = false;
  };

  return (
    <div
      className="docpage-root"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <div className="docpage-layout">
        {/* PDF PANEL */}
        <div className="docpage-pdf">
          <div className="docpage-toolbar">
            <button
              className="docpage-btn"
              onClick={goPrev}
              disabled={currentPage === 1}
            >
              ◀ Prev
            </button>

            <span className="docpage-page-indicator">
              {totalPages
                ? `Page ${currentPage} / ${totalPages}`
                : "Loading…"}
            </span>

            <button
              className="docpage-btn"
              onClick={goNext}
              disabled={
                !totalPages ||
                currentPage === totalPages
              }
            >
              Next ▶
            </button>
          </div>

          <div className="docpage-pdf-viewer">
            <PDFViewer
              documentId={documentId}
              currentPage={currentPage}
              onTotalPages={setTotalPages}
            />
          </div>
        </div>

        {/* SPLITTER */}
        <div
          className="docpage-splitter"
          onMouseDown={onMouseDown}
        />

        {/* CHAT PANEL */}
        <div
          className="docpage-chat"
          style={{ width: chatWidth }}
        >
          <DocumentChat
            documentId={documentId}
            onPageClick={setCurrentPage}
            embedded
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentPage;
