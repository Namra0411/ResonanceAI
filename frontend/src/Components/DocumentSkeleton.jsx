import "./DocumentSkeleton.css";

const DocumentSkeleton = () => {
  return (
    <div className="doc-skeleton">
      <div className="skeleton-thumb" />
      <div className="skeleton-line short" />
      <div className="skeleton-line" />
    </div>
  );
};

export default DocumentSkeleton;
