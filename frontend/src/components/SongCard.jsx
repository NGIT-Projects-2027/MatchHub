import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Heart, TrendingUp, Music, User as UserIcon, Disc } from "lucide-react";

// Generate a consistent gradient based on song title
function getSongGradient(title) {
  const gradients = [
    "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
    "linear-gradient(135deg, #d946ef 0%, #a855f7 100%)",
    "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
    "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
    "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #eab308 100%)",
    "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
    "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
    "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export default function SongCard({
  song,
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
    artist = "",
    album = "",
    year = "",
    genre = "",
    songId = "",
    similarity_score,
    avg_rating = 0,
    num_ratings = 0,
    image_url,
  } = song;

  const API_BASE = import.meta.env.VITE_API_URL || "/api";
  const finalImageUrl = image_url || (title ? `${API_BASE}/songs/cover?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}` : "");

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
          height: "260px",
          background: getSongGradient(title),
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
            <Music size={48} style={{ color: "rgba(255,255,255,0.3)", marginBottom: "0.5rem" }} />
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
                margin: "0 auto",
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
              onFavorite(song);
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

        {/* Artist */}
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
          <UserIcon size={12} style={{ flexShrink: 0, color: "var(--color-accent-pink)" }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {artist}
          </span>
        </div>

        {/* Album */}
        {album && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              marginBottom: "0.4rem",
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
            }}
          >
            <Disc size={12} style={{ flexShrink: 0, color: "var(--color-text-muted)" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {album}
            </span>
          </div>
        )}

        {/* Year & Genre */}
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
          {genre && (
            <span className="badge" style={{ fontSize: "0.68rem", background: "rgba(236,72,153,0.1)", color: "#f43f5e", borderColor: "rgba(236,72,153,0.2)" }}>
              {genre}
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
                style={{ background: "linear-gradient(90deg, #ec4899, #8b5cf6)" }}
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
