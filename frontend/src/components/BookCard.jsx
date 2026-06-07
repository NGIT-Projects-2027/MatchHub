import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Heart, TrendingUp, BookOpen, User as UserIcon } from "lucide-react";

// Generate a consistent gradient based on book title
function getBookGradient(title) {
  const gradients = [
    "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)",
    "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
    "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
    "linear-gradient(135deg, #be123c 0%, #e11d48 100%)",
    "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
    "linear-gradient(135deg, #9333ea 0%, #a855f7 100%)",
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export default function BookCard({
  book,
  index = 0,
  showSimilarity = false,
  onFavorite,
  isFavorite = false,
  onClick,
}) {
  const [hovered, setHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const {
    title = "",
    author = "",
    year = "",
    publisher = "",
    isbn = "",
    similarity_score,
    avg_rating = 0,
    num_ratings = 0,
    image_url,
  } = book;

  const finalImageUrl = image_url || (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick && onClick(title)}
      className="glass-card"
      style={{
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Cover Image or Placeholder */}
      <div
        style={{
          width: "100%",
          height: "280px",
          background: getBookGradient(title),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {finalImageUrl && !imageError ? (
          <img
            src={finalImageUrl}
            alt={title}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <BookOpen size={48} style={{ color: "rgba(255,255,255,0.3)", marginBottom: "0.5rem" }} />
            <span
              style={{
                display: "block",
                fontSize: "1.2rem",
                fontWeight: "700",
                color: "rgba(255, 255, 255, 0.25)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                maxWidth: "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </span>
          </div>
        )}

        {/* Favorite button */}
        {onFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(book);
            }}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "rgba(0,0,0,0.5)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Heart
              size={16}
              fill={isFavorite ? "#ec4899" : "none"}
              color={isFavorite ? "#ec4899" : "white"}
            />
          </button>
        )}

        {/* Similarity badge */}
        {showSimilarity && similarity_score !== undefined && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              borderRadius: "var(--radius-full)",
              padding: "0.2rem 0.6rem",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#10b981",
            }}
          >
            <TrendingUp size={12} />
            {similarity_score}%
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "0.9rem" }}>
        {/* Title */}
        <h3
          style={{
            fontSize: "0.95rem",
            fontWeight: "600",
            color: "var(--color-text-primary)",
            marginBottom: "0.3rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h3>

        {/* Author */}
        {author && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              marginBottom: "0.3rem",
              fontSize: "0.82rem",
              color: "var(--color-text-secondary)",
            }}
          >
            <UserIcon size={12} style={{ flexShrink: 0, color: "var(--color-accent-purple)" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {author}
            </span>
          </div>
        )}

        {/* Year & Publisher */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.25rem",
            marginBottom: "0.5rem",
          }}
        >
          {year && year !== "0" && (
            <span className="badge" style={{ fontSize: "0.68rem" }}>
              {year}
            </span>
          )}
          {publisher && (
            <span className="badge" style={{ fontSize: "0.68rem" }}>
              {publisher.length > 20 ? publisher.substring(0, 20) + "…" : publisher}
            </span>
          )}
        </div>

        {/* Rating */}
        {avg_rating > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.4rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Star
                size={14}
                fill="var(--color-accent-amber)"
                color="var(--color-accent-amber)"
              />
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "var(--color-accent-amber)",
                }}
              >
                {avg_rating.toFixed(1)}
              </span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              {num_ratings.toLocaleString()} ratings
            </span>
          </div>
        )}

        {/* Similarity bar */}
        {showSimilarity && similarity_score !== undefined && (
          <div style={{ marginTop: "0.3rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.3rem",
                fontSize: "0.75rem",
              }}
            >
              <span style={{ color: "var(--color-text-muted)" }}>Similarity</span>
              <span style={{ color: "var(--color-accent-green)", fontWeight: "600" }}>
                {similarity_score}%
              </span>
            </div>
            <div className="similarity-bar">
              <motion.div
                className="similarity-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${similarity_score}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
