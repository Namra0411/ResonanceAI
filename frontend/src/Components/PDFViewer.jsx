import { Document, Page, pdfjs } from "react-pdf";
import "./PDFViewer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const PDFViewer = ({ documentId, currentPage, onTotalPages }) => {
  return (
    <div className="pdfviewer-root">
      <Document
        file={{
          url: `http://localhost:5000/api/documents/${documentId}/file`,
          withCredentials: true,
        }}
        onLoadSuccess={({ numPages }) => {
          if (onTotalPages) onTotalPages(numPages);
        }}
        loading={
          <div className="pdfviewer-loading">
            Loading document…
          </div>
        }
        error={
          <div className="pdfviewer-error">
            Failed to load PDF
          </div>
        }
      >
        <div className="pdfviewer-page-wrapper">
          <Page
            pageNumber={currentPage}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </div>
      </Document>
    </div>
  );
};

export default PDFViewer;
