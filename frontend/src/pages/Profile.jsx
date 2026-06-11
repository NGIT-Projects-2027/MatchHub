import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { favoritesAPI, bookFavoritesAPI, songFavoritesAPI, historyAPI } from "@/lib/api";
import { motion } from "framer-motion";
import MovieCard from "@/components/MovieCard";
import BookCard from "@/components/BookCard";
import SongCard from "@/components/SongCard";
import { User, Mail, Calendar, Heart, BookOpen, Music, History, LogOut } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [movieFavorites, setMovieFavorites] = useState([]);
  const [bookFavorites, setBookFavorites] = useState([]);
  const [songFavorites, setSongFavorites] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [tab, setTab] = useState("movieFavorites");

  useEffect(() => {
    loadMovieFavorites();
    loadBookFavorites();
    loadSongFavorites();
    loadRecent();
  }, []);

  const loadMovieFavorites = async () => {
    try { const res = await favoritesAPI.getFavorites(); setMovieFavorites(res.data); } catch (e) { console.error(e); }
  };
  const loadBookFavorites = async () => {
    try { const res = await bookFavoritesAPI.getFavorites(); setBookFavorites(res.data); } catch (e) { console.error(e); }
  };
  const loadSongFavorites = async () => {
    try { const res = await songFavoritesAPI.getFavorites(); setSongFavorites(res.data); } catch (e) { console.error(e); }
  };
  const loadRecent = async () => {
    try { const res = await historyAPI.getHistory(); setRecentSearches(res.data.slice(0, 10)); } catch (e) { console.error(e); }
  };
  const removeMovieFav = async (movie) => {
    try { await favoritesAPI.removeFavorite(movie.movieId); setMovieFavorites(prev => prev.filter(f => f.movieId !== movie.movieId)); } catch (e) { console.error(e); }
  };
  const removeBookFav = async (book) => {
    try { await bookFavoritesAPI.removeFavorite(book.isbn); setBookFavorites(prev => prev.filter(f => f.isbn !== book.isbn)); } catch (e) { console.error(e); }
  };
  const removeSongFav = async (song) => {
    try { await songFavoritesAPI.removeFavorite(song.songId); setSongFavorites(prev => prev.filter(f => f.songId !== song.songId)); } catch (e) { console.error(e); }
  };
  const handleLogout = () => { logout(); navigate("/login"); };

  const tabs = [
    { id: "movieFavorites", label: "Movies", icon: Heart, count: movieFavorites.length, color: "var(--color-accent-purple)" },
    { id: "bookFavorites", label: "Books", icon: BookOpen, count: bookFavorites.length, color: "#14b8a6" },
    { id: "songFavorites", label: "Songs", icon: Music, count: songFavorites.length, color: "#ec4899" },
    { id: "recent", label: "Recent", icon: History, count: recentSearches.length, color: "var(--color-text-secondary)" },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div className="bg-particles" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Profile Card */}
        <div className="glass-card" style={{ padding: "2rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--gradient-button)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: 700, color: "white", flexShrink: 0 }}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.4rem" }}>{user?.name}</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}><Mail size={14} /> {user?.email}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}><Calendar size={14} /> Member since {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--color-error)", borderColor: "rgba(239,68,68,0.3)" }}><LogOut size={16} /> Logout</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div className="glass-card" style={{ padding: "1.2rem", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", fontWeight: 700 }} className="gradient-text">{movieFavorites.length}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Movie Favorites</p>
          </div>
          <div className="glass-card" style={{ padding: "1.2rem", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: "#14b8a6" }}>{bookFavorites.length}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Book Favorites</p>
          </div>
          <div className="glass-card" style={{ padding: "1.2rem", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: "#ec4899" }}>{songFavorites.length}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Song Favorites</p>
          </div>
          <div className="glass-card" style={{ padding: "1.2rem", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", fontWeight: 700 }} className="gradient-text">{recentSearches.length}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Searches</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", border: "none", background: tab === t.id ? `${t.color}15` : "transparent", color: tab === t.id ? t.color : "var(--color-text-secondary)", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500, transition: "all 0.2s" }}>
              <t.icon size={16} /> {t.label} <span style={{ background: "var(--color-bg-input)", borderRadius: "var(--radius-full)", padding: "0.1rem 0.5rem", fontSize: "0.75rem" }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Movie Favorites Tab */}
        {tab === "movieFavorites" && (
          movieFavorites.length === 0 ? (
            <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
              <Heart size={48} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No movie favorites yet</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Heart movies from recommendations to save them here.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {movieFavorites.map((movie, idx) => <MovieCard key={movie.movieId} movie={movie} index={idx} onFavorite={removeMovieFav} isFavorite />)}
            </div>
          )
        )}

        {/* Book Favorites Tab */}
        {tab === "bookFavorites" && (
          bookFavorites.length === 0 ? (
            <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
              <BookOpen size={48} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No book favorites yet</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Heart books from recommendations to save them here.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {bookFavorites.map((book, idx) => <BookCard key={book.isbn} book={book} index={idx} onFavorite={removeBookFav} isFavorite />)}
            </div>
          )
        )}

        {/* Song Favorites Tab */}
        {tab === "songFavorites" && (
          songFavorites.length === 0 ? (
            <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
              <Music size={48} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No song favorites yet</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Heart songs from recommendations to save them here.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
              {songFavorites.map((song, idx) => <SongCard key={song.songId} song={song} index={idx} onFavorite={removeSongFav} isFavorite />)}
            </div>
          )
        )}

        {/* Recent Tab */}
        {tab === "recent" && (
          recentSearches.length === 0 ? (
            <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
              <History size={48} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
              <p style={{ color: "var(--color-text-muted)" }}>No recent searches.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recentSearches.map((item, idx) => (
                <div key={item._id || idx} className="glass-card" style={{ padding: "0.8rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {item.type === "book" ? <BookOpen size={14} style={{ color: "#14b8a6" }} /> : (item.type === "song" ? <Music size={14} style={{ color: "#ec4899" }} /> : <Heart size={14} style={{ color: "var(--color-accent-purple)" }} />)}
                    <span style={{ fontWeight: 500 }}>{item.search}</span>
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{new Date(item.searchedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )
        )}
      </motion.div>
    </div>
  );
}
