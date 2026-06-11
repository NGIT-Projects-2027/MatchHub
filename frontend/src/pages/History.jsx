import { useState, useEffect } from "react";
import { historyAPI } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { History as HistoryIcon, Trash2, Clock, Search, BookOpen, Music, Film, AlertTriangle } from "lucide-react";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: "all", // "all" | "single"
    itemId: null,
    itemName: "",
  });

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const res = await historyAPI.getHistory();
      setHistory(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleClearAll = () => {
    setDeleteModal({
      isOpen: true,
      type: "all",
      itemId: null,
      itemName: "",
    });
  };

  const handleDeleteItem = (e, id, name) => {
    e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      type: "single",
      itemId: id,
      itemName: name,
    });
  };

  const confirmDelete = async () => {
    try {
      if (deleteModal.type === "all") {
        await historyAPI.clearHistory();
        setHistory([]);
      } else {
        await historyAPI.deleteHistoryItem(deleteModal.itemId);
        setHistory(prev => prev.filter(item => item._id !== deleteModal.itemId));
      }
    } catch (err) {
      console.error("Delete history error:", err);
    } finally {
      setDeleteModal({ isOpen: false, type: "all", itemId: null, itemName: "" });
    }
  };

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div className="bg-particles" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <HistoryIcon size={24} style={{ color: "var(--color-accent-purple)" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Search History</h1>
          </div>
          {history.length > 0 && (
            <button onClick={handleClearAll} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--color-error)", borderColor: "rgba(239,68,68,0.3)", fontSize: "0.85rem" }}>
              <Trash2 size={15} /> Clear All
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 72 }} />)}
          </div>
        ) : history.length === 0 ? (
          <div className="glass-card" style={{ padding: "3rem", textAlign: "center" }}>
            <Search size={48} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No search history</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Your search history will appear here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {history.map((item, idx) => (
              <motion.div key={item._id || idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="glass-card" style={{ padding: "0.9rem 1.2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: item.type === "book"
                    ? "rgba(20,184,166,0.15)"
                    : item.type === "song"
                    ? "rgba(236,72,153,0.15)"
                    : "rgba(139,92,246,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  {item.type === "book" ? (
                    <BookOpen size={18} style={{ color: "#14b8a6" }} />
                  ) : item.type === "song" ? (
                    <Music size={18} style={{ color: "#ec4899" }} />
                  ) : (
                    <Film size={18} style={{ color: "var(--color-accent-purple)" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.2rem" }}>{item.search}</p>
                  {item.results && item.results.length > 0 && (
                    <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Results: {item.results.map(r => r.title).join(", ")}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--color-text-muted)", fontSize: "0.78rem" }}>
                    <Clock size={13} />
                    {formatDate(item.searchedAt)}
                  </div>
                  <button
                    onClick={(e) => handleDeleteItem(e, item._id, item.search)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      padding: "5px",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--color-error)";
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--color-text-muted)";
                      e.currentTarget.style.background = "none";
                    }}
                    title="Delete search record"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10, 10, 15, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem"
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="glass-card"
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: "2rem",
                textAlign: "center",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.2rem",
              }}>
                <AlertTriangle size={24} style={{ color: "var(--color-error)" }} />
              </div>
              
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                {deleteModal.type === 'all' ? "Clear Search History?" : "Delete History Item?"}
              </h3>
              
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.8rem" }}>
                {deleteModal.type === 'all' 
                  ? "Are you sure you want to clear your entire search history? This action cannot be undone."
                  : `Are you sure you want to delete the search record for "${deleteModal.itemName}"?`
                }
              </p>
              
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                <button 
                  className="btn-ghost" 
                  onClick={() => setDeleteModal({ isOpen: false, type: "all", itemId: null, itemName: "" })}
                  style={{ flex: 1, padding: "0.65rem 1rem", fontSize: "0.9rem" }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-gradient"
                  onClick={confirmDelete}
                  style={{ 
                    flex: 1, 
                    padding: "0.65rem 1rem",
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    borderColor: "#ef4444",
                    color: "white",
                    fontSize: "0.9rem"
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
