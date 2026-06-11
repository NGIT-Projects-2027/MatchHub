const express = require("express");
const axios = require("axios");
const History = require("../models/History");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const FLASK_ML_URL = process.env.FLASK_ML_URL || "http://localhost:5000";

/**
 * POST /api/songs/recommend
 * Get song recommendations (proxies to Flask ML service)
 * Saves search to history if user is authenticated
 */
router.post("/recommend", async (req, res) => {
  try {
    const { song, top_n } = req.body;

    if (!song) {
      return res.status(400).json({ error: "Song title is required." });
    }

    // Call Flask ML service
    const mlResponse = await axios.post(`${FLASK_ML_URL}/songs/recommend`, {
      song,
      top_n: top_n || 10,
    });

    const result = mlResponse.data;

    // Save to history if user is authenticated
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(
          authHeader.split(" ")[1],
          process.env.JWT_SECRET
        );

        await History.create({
          userId: decoded.id,
          search: song,
          type: "song",
          results: result.recommendations.slice(0, 5).map((r) => ({
            title: r.title,
            similarity_score: r.similarity_score,
          })),
        });
      } catch (e) {
        // Silently fail on history save - don't block the response
        console.error("Failed to save song history:", e.message);
      }
    }

    res.json(result);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    console.error("Song recommend error:", err.message);
    res.status(500).json({ error: "ML service unavailable. Please try again." });
  }
});

/**
 * GET /api/songs/search
 * Search songs for autocomplete (proxies to Flask)
 */
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q || "";
    const mlResponse = await axios.get(`${FLASK_ML_URL}/songs/search`, {
      params: { q: query },
    });
    res.json(mlResponse.data);
  } catch (err) {
    console.error("Songs search error:", err.message);
    res.status(500).json({ error: "ML service unavailable." });
  }
});

/**
 * GET /api/songs/trending
 * Get trending songs (proxies to Flask)
 */
router.get("/trending", async (req, res) => {
  try {
    const mlResponse = await axios.get(`${FLASK_ML_URL}/songs/trending`);
    const trendingSongs = mlResponse.data;
    res.json(trendingSongs);
  } catch (err) {
    console.error("Trending songs error:", err.message);
    res.status(500).json({ error: "ML service unavailable." });
  }
});

/**
 * POST /api/songs/favorites
 * Add a song to favorites
 */
router.post("/favorites", authMiddleware, async (req, res) => {
  try {
    const { songId, title, artist, album } = req.body;

    if (!songId || !title) {
      return res.status(400).json({ error: "songId and title are required." });
    }

    const user = await User.findById(req.user.id);

    // Check if already favorited
    const exists = user.songFavorites.some((f) => f.songId === songId);
    if (exists) {
      return res.status(400).json({ error: "Song already in favorites." });
    }

    user.songFavorites.push({ songId, title, artist: artist || "", album: album || "" });
    await user.save();

    res.json({ message: "Added to favorites.", songFavorites: user.songFavorites });
  } catch (err) {
    console.error("Add song favorite error:", err);
    res.status(500).json({ error: "Failed to add favorite." });
  }
});

/**
 * DELETE /api/songs/favorites/:songId
 * Remove a song from favorites
 */
router.delete("/favorites/:songId", authMiddleware, async (req, res) => {
  try {
    const songId = req.params.songId;

    const user = await User.findById(req.user.id);
    user.songFavorites = user.songFavorites.filter((f) => f.songId !== songId);
    await user.save();

    res.json({ message: "Removed from favorites.", songFavorites: user.songFavorites });
  } catch (err) {
    console.error("Remove song favorite error:", err);
    res.status(500).json({ error: "Failed to remove favorite." });
  }
});

/**
 * GET /api/songs/favorites
 * Get user's favorite songs
 */
router.get("/favorites", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const songFavorites = user.songFavorites.map((f) => f.toObject());
    res.json(songFavorites);
  } catch (err) {
    console.error("Get song favorites error:", err);
    res.status(500).json({ error: "Failed to fetch favorites." });
  }
});

/**
 * GET /api/songs/cover
 * Proxy to fetch song cover art using public iTunes Search API.
 * Returns a 302 Redirect to the actual high-res image URL.
 */
router.get("/cover", async (req, res) => {
  const { title, artist } = req.query;

  if (!title) {
    return res.redirect("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop");
  }

  try {
    // Add caching
    res.setHeader("Cache-Control", "public, max-age=864000");

    const searchTerm = `${title} ${artist || ""}`.trim();
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&limit=1&entity=song`;

    const response = await axios.get(itunesUrl);
    
    if (response.data.results && response.data.results.length > 0) {
      let artworkUrl = response.data.results[0].artworkUrl100;
      if (artworkUrl) {
        // Upgrade size from 100x100 to 600x600 for high quality
        artworkUrl = artworkUrl.replace("100x100bb.jpg", "600x600bb.jpg");
        return res.redirect(artworkUrl);
      }
    }

    // Fallback if no cover found
    res.redirect("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop");
  } catch (err) {
    console.error("iTunes cover error:", err.message);
    res.redirect("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop");
  }
});

module.exports = router;
