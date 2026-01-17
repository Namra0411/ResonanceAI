import { useEffect, useState } from "react";
import { searchDocuments } from "../api/search";
import DocumentCard from "../Components/DocumentCard";
import "./Search.css";
import Navbar from "../Components/Navbar";

const DEBOUNCE_DELAY = 300;

const Search = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchDocuments(query);
        setResults(data);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <>
    <Navbar></Navbar>
    <div className="search-root">
      {/* Header */}
      <div className="search-header">
        <h1>Search your documents</h1>
        <p>Find information instantly across all your files</p>
      </div>

      {/* Search Input */}
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Type to search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="search-loading">
          Searching…
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="search-results">
          {/* Content Matches */}
          <section>
            <div className="search-section-header">
              <h3>Matches by content</h3>
              <span>
                {results.contentMatches?.length || 0}
              </span>
            </div>

            {results.contentMatches?.length > 0 ? (
              <div className="search-grid">
                {results.contentMatches.map((doc) => (
                  <DocumentCard
                    key={doc.documentId}
                    doc={{
                      _id: doc.documentId,
                      filename: doc.filename,
                      fileType: "pdf",
                      status: "processed",
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="search-empty">
                No content matches
              </div>
            )}
          </section>

          {/* Filename Matches */}
          <section>
            <div className="search-section-header">
              <h3>Matches by filename</h3>
              <span>
                {results.nameMatches?.length || 0}
              </span>
            </div>

            {results.nameMatches?.length > 0 ? (
              <div className="search-grid">
                {results.nameMatches.map((doc) => (
                  <DocumentCard
                    key={doc.documentId}
                    doc={{
                      _id: doc.documentId,
                      filename: doc.filename,
                      fileType: "pdf",
                      status: "processed",
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="search-empty">
                No filename matches
              </div>
            )}
          </section>
        </div>
      )}

      {/* Initial State */}
      {!query && (
        <div className="search-hint">
          Start typing to search your documents
        </div>
      )}
    </div>
    </>
  );
};

export default Search;
