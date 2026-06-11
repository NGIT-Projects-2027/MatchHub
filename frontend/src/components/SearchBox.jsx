import { useState, useEffect, useRef, useCallback } from "react";
import { movieAPI, bookAPI, songAPI } from "@/lib/api";
import { Search, X, Film, BookOpen, Music, Loader2, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SearchBox({ onSearch, loading: externalLoading, domain = "movies" }) {
  const [query, setQuery] = useState("");
  const [allItems, setAllItems] = useState([]);   // pre-loaded for movies/songs
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingBooks, setFetchingBooks] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const bookDebounceRef = useRef(null);

  useEffect(() => {
    // Reset on domain change
    setQuery("");
    setSuggestions([]);
    setAllItems([]);
    setShowSuggestions(false);

    // Pre-load all items for movies and songs (small datasets — fast)
    // For books (5,444 items) we use server-side search on every keystroke
    if (domain === "movies") {
      movieAPI.search("all").then(res => setAllItems(res.data)).catch(console.error);
    } else if (domain === "songs") {
      songAPI.search("all").then(res => setAllItems(res.data)).catch(console.error);
    }
    // books: no pre-load, server filters on demand

    // Close suggestions on outside click
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [domain]);

  // Server-side book search with debounce
  const searchBooksOnServer = useCallback((q) => {
    if (bookDebounceRef.current) clearTimeout(bookDebounceRef.current);
    bookDebounceRef.current = setTimeout(async () => {
      try {
        setFetchingBooks(true);
        const res = await bookAPI.search(q || "");
        setSuggestions(res.data);
      } catch (err) {
        console.error("Book search error:", err);
      } finally {
        setFetchingBooks(false);
      }
    }, 300);
  }, []);

  const filterItems = (q) => {
    // For books, filtering is done server-side (see handleInputChange)
    if (domain === "books") return;
    if (!q) {
      setSuggestions(allItems.slice(0, 100));
      return;
    }
    const lowerQ = q.toLowerCase();
    const filtered = allItems.filter((item) => item.title.toLowerCase().includes(lowerQ));
    setSuggestions(filtered.slice(0, 100));
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    if (domain === "books") {
      searchBooksOnServer(value);
    } else {
      filterItems(value);
    }
  };

  const handleFocus = () => {
    setShowSuggestions(true);
    if (domain === "books") {
      searchBooksOnServer(query);
    } else {
      filterItems(query);
    }
  };

  const handleSelect = (item) => {
    setQuery(item.title);
    setShowSuggestions(false);
    onSearch(item.title);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const DomainIcon = domain === "movies" ? Film : (domain === "books" ? BookOpen : Music);
  const placeholderText = domain === "movies"
    ? "Search for a movie... (e.g., Toy Story, Avatar, Inception)"
    : domain === "books"
    ? "Search for a book... (e.g., Harry Potter, The Great Gatsby)"
    : "Search for a song... (e.g., Yesterday, Thriller, Yellow)";

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", maxWidth: "640px" }}>
      <form onSubmit={handleSubmit}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <div
            style={{
              position: "absolute",
              left: "1rem",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {externalLoading || fetchingBooks ? (
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Search size={20} />
            )}
          </div>
          <input
            ref={inputRef}
            id="search-input"
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholderText}
            className="input-field"
            style={{
              paddingLeft: "2.8rem",
              paddingRight: query ? "5rem" : "1rem",
              height: "52px",
              fontSize: "1rem",
              borderRadius: "var(--radius-xl)",
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: "absolute",
                right: "70px",
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                display: "flex",
                padding: "4px",
              }}
            >
              <X size={18} />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || externalLoading}
            className="btn-gradient"
            style={{
              position: "absolute",
              right: "4px",
              height: "44px",
              borderRadius: "var(--radius-lg)",
              padding: "0 1.2rem",
              fontSize: "0.9rem",
            }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-card)",
              overflow: "hidden",
              zIndex: 50,
              maxHeight: "360px",
              overflowY: "auto",
            }}
          >
            {suggestions.map((item, idx) => (
              <button
                key={domain === "movies" ? item.movieId : (domain === "books" ? item.isbn : item.songId)}
                onClick={() => handleSelect(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  padding: "0.7rem 1rem",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  borderBottom:
                    idx < suggestions.length - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = domain === "movies"
                    ? "rgba(139, 92, 246, 0.08)"
                    : domain === "books"
                    ? "rgba(20, 184, 166, 0.08)"
                    : "rgba(236, 72, 153, 0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <DomainIcon
                  size={16}
                  style={{ color: domain === "movies" ? "var(--color-accent-purple)" : (domain === "books" ? "#14b8a6" : "#ec4899"), flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "500",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.3rem",
                      marginTop: "0.2rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {domain === "movies" ? (
                      item.genres?.slice(0, 3).map((g) => (
                        <span key={g} style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                          {g}
                        </span>
                      ))
                    ) : domain === "books" ? (
                      <>
                        {item.author && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                            <UserIcon size={10} /> {item.author}
                          </span>
                        )}
                        {item.year && item.year !== "0" && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                            • {item.year}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {item.artist && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                            <UserIcon size={10} /> {item.artist}
                          </span>
                        )}
                        {item.album && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                            • {item.album}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {item.avg_rating > 0 && (
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-accent-amber)",
                      fontWeight: "600",
                      flexShrink: 0,
                    }}
                  >
                    ★ {item.avg_rating.toFixed(1)}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
