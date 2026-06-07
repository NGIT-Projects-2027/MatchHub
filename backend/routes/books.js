const express = require("express");
const axios = require("axios");
const History = require("../models/History");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const FLASK_ML_URL = process.env.FLASK_ML_URL || "http://localhost:5000";

/**
 * POST /api/books/recommend
 * Get book recommendations (proxies to Flask ML service)
 * Saves search to history if user is authenticated
 */
router.post("/recommend", async (req, res) => {
  try {
    const { book, top_n } = req.body;

    if (!book) {
      return res.status(400).json({ error: "Book title is required." });
    }

    // Call Flask ML service
    const mlResponse = await axios.post(`${FLASK_ML_URL}/books/recommend`, {
      book,
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
          search: book,
          type: "book",
          results: result.recommendations.slice(0, 5).map((r) => ({
            title: r.title,
            similarity_score: r.similarity_score,
          })),
        });
      } catch (e) {
        // Silently fail on history save - don't block the response
        console.error("Failed to save book history:", e.message);
      }
    }

    res.json(result);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    console.error("Book recommend error:", err.message);
    res.status(500).json({ error: "ML service unavailable. Please try again." });
  }
});

/**
 * GET /api/books/search
 * Search books for autocomplete (proxies to Flask)
 */
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q || "";
    const mlResponse = await axios.get(`${FLASK_ML_URL}/books/search`, {
      params: { q: query },
    });
    res.json(mlResponse.data);
  } catch (err) {
    console.error("Books search error:", err.message);
    res.status(500).json({ error: "ML service unavailable." });
  }
});

/**
 * GET /api/books/trending
 * Get trending books (proxies to Flask)
 */
router.get("/trending", async (req, res) => {
  try {
    const mlResponse = await axios.get(`${FLASK_ML_URL}/books/trending`);
    const trendingBooks = mlResponse.data;
    res.json(trendingBooks);
  } catch (err) {
    console.error("Trending books error:", err.message);
    res.status(500).json({ error: "ML service unavailable." });
  }
});

/**
 * POST /api/books/favorites
 * Add a book to favorites
 */
router.post("/favorites", authMiddleware, async (req, res) => {
  try {
    const { isbn, title, author, imageUrl } = req.body;

    if (!isbn || !title) {
      return res.status(400).json({ error: "isbn and title are required." });
    }

    const user = await User.findById(req.user.id);

    // Check if already favorited
    const exists = user.bookFavorites.some((f) => f.isbn === isbn);
    if (exists) {
      return res.status(400).json({ error: "Book already in favorites." });
    }

    user.bookFavorites.push({ isbn, title, author: author || "", imageUrl: imageUrl || "" });
    await user.save();

    res.json({ message: "Added to favorites.", bookFavorites: user.bookFavorites });
  } catch (err) {
    console.error("Add book favorite error:", err);
    res.status(500).json({ error: "Failed to add favorite." });
  }
});

/**
 * DELETE /api/books/favorites/:isbn
 * Remove a book from favorites
 */
router.delete("/favorites/:isbn", authMiddleware, async (req, res) => {
  try {
    const isbn = req.params.isbn;

    const user = await User.findById(req.user.id);
    user.bookFavorites = user.bookFavorites.filter((f) => f.isbn !== isbn);
    await user.save();

    res.json({ message: "Removed from favorites.", bookFavorites: user.bookFavorites });
  } catch (err) {
    console.error("Remove book favorite error:", err);
    res.status(500).json({ error: "Failed to remove favorite." });
  }
});

/**
 * GET /api/books/favorites
 * Get user's favorite books
 */
router.get("/favorites", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const bookFavorites = user.bookFavorites.map((f) => f.toObject());
    res.json(bookFavorites);
  } catch (err) {
    console.error("Get book favorites error:", err);
    res.status(500).json({ error: "Failed to fetch favorites." });
  }
});

/**
 * GET /api/books/cover/:isbn
 * Proxy to fetch book covers from Google Books API to avoid exposing API key on frontend.
 * Returns a 302 Redirect to the actual image URL.
 */
router.get("/cover/:isbn", async (req, res) => {
  const { isbn } = req.params;
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  try {
    // Add aggressive caching so the browser doesn't spam our backend for images it already saw
    res.setHeader("Cache-Control", "public, max-age=864000");

    if (apiKey) {
      const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`);
      
      if (response.data.items && response.data.items.length > 0) {
        const volumeInfo = response.data.items[0].volumeInfo;
        if (volumeInfo.imageLinks) {
          // Try to get the highest quality available before falling back to thumbnail
          const links = volumeInfo.imageLinks;
          const bestImage = links.extraLarge || links.large || links.medium || links.small || links.thumbnail;
          
          if (bestImage) {
            // Redirect the browser directly to the high-quality image
            return res.redirect(bestImage.replace("http:", "https:"));
          }
        }
      }
    }
    
    // Fallback to OpenLibrary if Google doesn't have it or if API key is missing
    res.redirect(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`);
  } catch (err) {
    // Silent fallback to OpenLibrary on any error
    res.redirect(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`);
  }
});

module.exports = router;
