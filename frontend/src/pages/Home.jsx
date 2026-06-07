import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDomain } from "@/context/DomainContext";
import { movieAPI, favoritesAPI, bookAPI, bookFavoritesAPI } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import SearchBox from "@/components/SearchBox";
import MovieCard from "@/components/MovieCard";
import BookCard from "@/components/BookCard";
import { Sparkles, TrendingUp, Film, BookOpen } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { domain } = useDomain();
  const [recommendations, setRecommendations] = useState(null);
  const [searchedItem, setSearchedItem] = useState(null);
  const [trending, setTrending] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset state when domain changes
  useEffect(() => {
    setRecommendations(null);
    setSearchedItem(null);
    setError("");
    loadTrending();
    if (isAuthenticated) loadFavorites();
  }, [domain, isAuthenticated]);

  const loadTrending = async () => {
    try {
      if (domain === "movies") {
        const res = await movieAPI.trending();
        setTrending(res.data);
      } else {
        const res = await bookAPI.trending();
        setTrending(res.data);
      }
    } catch (err) { console.error("Trending error:", err); }
  };

  const loadFavorites = async () => {
    try {
      if (domain === "movies") {
        const res = await favoritesAPI.getFavorites();
        setFavorites(res.data);
      } else {
        const res = await bookFavoritesAPI.getFavorites();
        setFavorites(res.data);
      }
    } catch (err) { console.error("Favorites error:", err); }
  };

  const handleSearch = async (title) => {
    setLoading(true);
    setError("");
    setRecommendations(null);
    setSearchedItem(null);
    try {
      if (domain === "movies") {
        const res = await movieAPI.recommend(title);
        setSearchedItem(res.data.searched);
        setRecommendations(res.data.recommendations);
      } else {
        const res = await bookAPI.recommend(title);
        setSearchedItem(res.data.searched);
        setRecommendations(res.data.recommendations);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to get recommendations.");
    } finally { setLoading(false); }
  };

  const handleFavorite = async (item) => {
    if (!isAuthenticated) return;
    if (domain === "movies") {
      const isFav = favorites.some(f => f.movieId === item.movieId);
      try {
        if (isFav) {
          await favoritesAPI.removeFavorite(item.movieId);
          setFavorites(prev => prev.filter(f => f.movieId !== item.movieId));
        } else {
          await favoritesAPI.addFavorite({ movieId: item.movieId, title: item.title, genres: item.genres });
          setFavorites(prev => [...prev, { movieId: item.movieId, title: item.title, genres: item.genres }]);
        }
      } catch (err) { console.error("Favorite error:", err); }
    } else {
      const isFav = favorites.some(f => f.isbn === item.isbn);
      try {
        if (isFav) {
          await bookFavoritesAPI.removeFavorite(item.isbn);
          setFavorites(prev => prev.filter(f => f.isbn !== item.isbn));
        } else {
          await bookFavoritesAPI.addFavorite({ isbn: item.isbn, title: item.title, author: item.author, imageUrl: item.image_url });
          setFavorites(prev => [...prev, { isbn: item.isbn, title: item.title, author: item.author, imageUrl: item.image_url }]);
        }
      } catch (err) { console.error("Favorite error:", err); }
    }
  };

  const isFavorite = (item) => {
    if (domain === "movies") return favorites.some(f => f.movieId === item.movieId);
    return favorites.some(f => f.isbn === item.isbn);
  };

  const isMovies = domain === "movies";
  const accentColor = isMovies ? "var(--color-accent-purple)" : "#14b8a6";
  const DomainIcon = isMovies ? Film : BookOpen;
  const ItemCard = isMovies ? MovieCard : BookCard;
  const itemLabel = isMovies ? "Movie" : "Book";
  const itemKey = isMovies ? "movieId" : "isbn";

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="bg-particles" />

      {/* Hero Section */}
      <section style={{ textAlign: "center", padding: "4rem 1.5rem 2rem", maxWidth: 800, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} key={domain}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Sparkles size={20} style={{ color: "var(--color-accent-amber)" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--color-accent-amber)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>AI-Powered Recommendations</span>
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.15, marginBottom: "1rem", letterSpacing: "-0.03em" }}>
            Discover Your Next{" "}
            <span style={{ background: isMovies
              ? "linear-gradient(135deg, #8b5cf6, #a855f7, #c084fc)"
              : "linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Favorite {itemLabel}
            </span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "var(--color-text-secondary)", maxWidth: 520, margin: "0 auto 2rem", lineHeight: 1.6 }}>
            {isMovies
              ? "Search any movie and our ML engine finds the best matches using content-based similarity analysis."
              : "Search any book and our ML engine finds the best matches using author, publisher, and content analysis."}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} style={{ display: "flex", justifyContent: "center" }}>
          <SearchBox onSearch={handleSearch} loading={loading} domain={domain} />
        </motion.div>
      </section>

      {/* Error */}
      {error && (
        <div style={{ maxWidth: 640, margin: "0 auto 2rem", padding: "0 1.5rem" }}>
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: "0.8rem 1rem", fontSize: "0.9rem", color: "var(--color-error)", textAlign: "center" }}>{error}</div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.2rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 320, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <AnimatePresence>
        {recommendations && recommendations.length > 0 && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <DomainIcon size={20} style={{ color: accentColor }} />
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                {itemLabel}s similar to{" "}
                <span style={{ color: accentColor }}>{searchedItem?.title}</span>
              </h2>
            </div>

            {/* Searched item */}
            {searchedItem && (
              <div style={{ marginBottom: "2.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--color-text-secondary)" }}>Searched {itemLabel}</h3>
                <div style={{ maxWidth: "240px" }}>
                  <ItemCard
                    {...(isMovies ? { movie: searchedItem } : { book: searchedItem })}
                    onFavorite={isAuthenticated ? handleFavorite : undefined}
                    isFavorite={isFavorite(searchedItem)}
                  />
                </div>
              </div>
            )}

            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "var(--color-text-secondary)" }}>Recommended {itemLabel}s</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.2rem" }}>
              {recommendations.slice(0, 5).map((item, idx) => (
                <ItemCard
                  key={item[itemKey]}
                  {...(isMovies ? { movie: item } : { book: item })}
                  index={idx}
                  onFavorite={isAuthenticated ? handleFavorite : undefined}
                  isFavorite={isFavorite(item)}
                  onClick={handleSearch}
                />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Trending Section */}
      {!recommendations && trending.length > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <TrendingUp size={20} style={{ color: "var(--color-accent-pink)" }} />
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Trending {itemLabel}s</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.2rem" }}>
            {trending.map((item, idx) => (
              <ItemCard
                key={item[itemKey]}
                {...(isMovies ? { movie: item } : { book: item })}
                index={idx}
                onFavorite={isAuthenticated ? handleFavorite : undefined}
                isFavorite={isFavorite(item)}
                onClick={handleSearch}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
