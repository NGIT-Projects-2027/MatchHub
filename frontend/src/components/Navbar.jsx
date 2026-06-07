import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDomain } from "@/context/DomainContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  BookOpen,
  User,
  LogOut,
  History,
  Menu,
  X,
  Layers,
} from "lucide-react";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { domain, setDomain } = useDomain();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setProfileOpen(false);
  };

  const handleDomainSwitch = (newDomain) => {
    setDomain(newDomain);
    // Navigate to home when switching domains
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const navLinks = [
    { path: "/", label: "Home", icon: domain === "movies" ? Film : BookOpen },
    { path: "/history", label: "History", icon: History },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(10, 10, 15, 0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
        }}
      >
        {/* Logo */}
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--gradient-button)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={20} color="white" />
          </div>
          <span
            style={{
              fontSize: "1.2rem",
              fontWeight: "700",
              letterSpacing: "-0.02em",
            }}
            className="gradient-text"
          >
            MatchHub
          </span>
        </a>

        {/* Domain Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--color-border)",
            padding: "3px",
            gap: "2px",
          }}
          className="domain-toggle"
        >
          <button
            onClick={() => handleDomainSwitch("movies")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.85rem",
              borderRadius: "var(--radius-full)",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.25s ease",
              background: domain === "movies"
                ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(168,85,247,0.15))"
                : "transparent",
              color: domain === "movies"
                ? "var(--color-accent-purple)"
                : "var(--color-text-muted)",
              boxShadow: domain === "movies"
                ? "0 0 12px rgba(139,92,246,0.15)"
                : "none",
            }}
          >
            <Film size={14} />
            Movies
          </button>
          <button
            onClick={() => handleDomainSwitch("books")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.35rem 0.85rem",
              borderRadius: "var(--radius-full)",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.25s ease",
              background: domain === "books"
                ? "linear-gradient(135deg, rgba(20,184,166,0.25), rgba(13,148,136,0.15))"
                : "transparent",
              color: domain === "books"
                ? "#14b8a6"
                : "var(--color-text-muted)",
              boxShadow: domain === "books"
                ? "0 0 12px rgba(20,184,166,0.15)"
                : "none",
            }}
          >
            <BookOpen size={14} />
            Books
          </button>
        </div>

        {/* Desktop Nav Links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
          className="desktop-nav"
        >
          {isAuthenticated &&
            navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  color: isActive(link.path)
                    ? "var(--color-accent-purple)"
                    : "var(--color-text-secondary)",
                  background: isActive(link.path)
                    ? "rgba(139, 92, 246, 0.1)"
                    : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <link.icon size={16} />
                {link.label}
              </Link>
            ))}
        </div>

        {/* Right Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isAuthenticated ? (
            <div style={{ position: "relative" }}>
              <button
                id="profile-button"
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--gradient-button)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "500",
                    maxWidth: "100px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.name || "User"}
                </span>
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: "200px",
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-card)",
                      overflow: "hidden",
                      zIndex: 50,
                    }}
                  >
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {user?.name}
                      </p>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.65rem 1rem",
                        textDecoration: "none",
                        color: "var(--color-text-secondary)",
                        fontSize: "0.85rem",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background =
                          "rgba(139, 92, 246, 0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                    >
                      <User size={15} /> Profile
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setProfileOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.65rem 1rem",
                        textDecoration: "none",
                        color: "var(--color-text-secondary)",
                        fontSize: "0.85rem",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background =
                          "rgba(139, 92, 246, 0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                    >
                      <History size={15} /> Search History
                    </Link>
                    <div
                      style={{
                        borderTop: "1px solid var(--color-border)",
                      }}
                    >
                      <button
                        id="logout-button"
                        onClick={handleLogout}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.65rem 1rem",
                          width: "100%",
                          border: "none",
                          background: "none",
                          color: "var(--color-error)",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.background =
                            "rgba(239, 68, 68, 0.1)")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.background = "transparent")
                        }
                      >
                        <LogOut size={15} /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link to="/login">
                <button className="btn-ghost">Login</button>
              </Link>
              <Link to="/signup">
                <button className="btn-gradient">Sign Up</button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .domain-toggle { transform: scale(0.9); }
        }
      `}</style>
    </nav>
  );
}
