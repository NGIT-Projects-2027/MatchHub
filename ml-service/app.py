"""
Flask ML Recommendation Service
Serves movie, book, and song recommendations from pre-trained pickle models.
"""

import os
import sys
import pickle
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

app = Flask(__name__)
CORS(app)

# --- Load Models ---
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

# --- Movie Model ---
print("[*] Loading ML models...")
movies = pickle.load(open(os.path.join(MODELS_DIR, "movies.pkl"), "rb"))
similarity = pickle.load(open(os.path.join(MODELS_DIR, "movies_similarity.pkl"), "rb"))
print(f"[OK] Loaded {len(movies)} movies, similarity matrix {similarity.shape}")

# Build title-to-index lookup (case-insensitive)
title_to_idx = {}
for idx, row in movies.iterrows():
    title_to_idx[row["title"].lower().strip()] = idx

# --- Book Model (graceful loading) ---
books = None
books_similarity = None
book_title_to_idx = {}

books_pkl_path = os.path.join(MODELS_DIR, "books.pkl")
books_sim_pkl_path = os.path.join(MODELS_DIR, "books_similarity.pkl")

if os.path.exists(books_pkl_path) and os.path.exists(books_sim_pkl_path):
    try:
        books = pickle.load(open(books_pkl_path, "rb"))
        books_similarity = pickle.load(open(books_sim_pkl_path, "rb"))
        for idx, row in books.iterrows():
            book_title_to_idx[row["title"].lower().strip()] = idx
        print(f"[OK] Loaded {len(books)} books, similarity matrix {books_similarity.shape}")
    except Exception as e:
        print(f"[WARN] Failed to load book models: {e}")
        books = None
        books_similarity = None
else:
    print("[WARN] Book model files not found. Book endpoints will return 503. Run train_books_model.py first.")


# --- Song Model (graceful loading) ---
songs = None
songs_similarity = None
song_title_to_idx = {}

songs_pkl_path = os.path.join(MODELS_DIR, "songs.pkl")
songs_sim_pkl_path = os.path.join(MODELS_DIR, "songs_similarity.pkl")

if os.path.exists(songs_pkl_path) and os.path.exists(songs_sim_pkl_path):
    try:
        songs = pickle.load(open(songs_pkl_path, "rb"))
        songs_similarity = pickle.load(open(songs_sim_pkl_path, "rb"))
        for idx, row in songs.iterrows():
            song_title_to_idx[row["title"].lower().strip()] = idx
        print(f"[OK] Loaded {len(songs)} songs, similarity matrix {songs_similarity.shape}")
    except Exception as e:
        print(f"[WARN] Failed to load song models: {e}")
        songs = None
        songs_similarity = None
else:
    print("[WARN] Song model files not found. Song endpoints will return 503. Run train_songs_model.py first.")



# ============================
# Movie Helper Functions
# ============================

def find_movie_index(movie_name):
    """Find movie index by exact or partial match."""
    movie_lower = movie_name.lower().strip()

    # Exact match
    if movie_lower in title_to_idx:
        return title_to_idx[movie_lower]

    # Partial match (title contains search term)
    matches = []
    for title, idx in title_to_idx.items():
        if movie_lower in title:
            matches.append((idx, title))

    if matches:
        # Return the shortest match (most relevant)
        matches.sort(key=lambda x: len(x[1]))
        return matches[0][0]

    return None


def get_recommendations(movie_name, top_n=10):
    """Get top N similar movies with similarity scores."""
    idx = find_movie_index(movie_name)
    if idx is None:
        return None

    scores = list(enumerate(similarity[idx]))
    scores = sorted(scores, key=lambda x: x[1], reverse=True)

    # Get searched movie genres for explanation
    searched_movie = movies.iloc[idx]
    searched_genres = set(searched_movie["genres"].split("|")) if pd.notna(searched_movie["genres"]) and searched_movie["genres"] != "" else set()

    recommendations = []
    for i in scores[1:top_n + 1]:
        movie = movies.iloc[i[0]]
        genres = movie["genres"].split("|") if pd.notna(movie["genres"]) and movie["genres"] != "" else []
        genres_set = set(genres)

        # Calculate genre match percentage
        if searched_genres and genres_set:
            genre_match = len(searched_genres & genres_set) / len(searched_genres | genres_set) * 100
        else:
            genre_match = 0

        recommendations.append({
            "movieId": int(movie["movieId"]),
            "title": movie["title"],
            "genres": genres,
            "similarity_score": round(float(i[1]) * 100, 1),
            "genre_match": round(genre_match, 1),
            "avg_rating": float(movie.get("avg_rating", 0)),
            "num_ratings": int(movie.get("num_ratings", 0))
        })

    # Also return the searched movie info
    searched_genres_list = list(searched_genres) if searched_genres else []

    return {
        "searched": {
            "movieId": int(searched_movie["movieId"]),
            "title": searched_movie["title"],
            "genres": searched_genres_list,
            "avg_rating": float(searched_movie.get("avg_rating", 0)),
            "num_ratings": int(searched_movie.get("num_ratings", 0))
        },
        "recommendations": recommendations
    }


# ============================
# Book Helper Functions
# ============================

def find_book_index(book_name):
    """Find book index by exact or partial match."""
    book_lower = book_name.lower().strip()

    # Exact match
    if book_lower in book_title_to_idx:
        return book_title_to_idx[book_lower]

    # Partial match (title contains search term)
    matches = []
    for title, idx in book_title_to_idx.items():
        if book_lower in title:
            matches.append((idx, title))

    if matches:
        # Return the shortest match (most relevant)
        matches.sort(key=lambda x: len(x[1]))
        return matches[0][0]

    return None


def get_book_recommendations(book_name, top_n=10):
    """Get top N similar books with similarity scores."""
    idx = find_book_index(book_name)
    if idx is None:
        return None

    scores = list(enumerate(books_similarity[idx]))
    scores = sorted(scores, key=lambda x: x[1], reverse=True)

    searched_book = books.iloc[idx]

    recommendations = []
    for i in scores[1:top_n + 1]:
        book = books.iloc[i[0]]
        recommendations.append({
            "isbn": str(book["isbn"]),
            "title": book["title"],
            "author": book["author"],
            "year": int(book["year"]),
            "publisher": book["publisher"],
            "image_url": book.get("image_url", ""),
            "similarity_score": round(float(i[1]) * 100, 1),
            "avg_rating": float(book.get("avg_rating", 0)),
            "num_ratings": int(book.get("num_ratings", 0))
        })

    return {
        "searched": {
            "isbn": str(searched_book["isbn"]),
            "title": searched_book["title"],
            "author": searched_book["author"],
            "year": int(searched_book["year"]),
            "publisher": searched_book["publisher"],
            "image_url": searched_book.get("image_url", ""),
            "avg_rating": float(searched_book.get("avg_rating", 0)),
            "num_ratings": int(searched_book.get("num_ratings", 0))
        },
        "recommendations": recommendations
    }


# ============================
# Song Helper Functions
# ============================

def find_song_index(song_name):
    """Find song index by exact or partial match."""
    song_lower = song_name.lower().strip()

    # Exact match
    if song_lower in song_title_to_idx:
        return song_title_to_idx[song_lower]

    # Partial match (title contains search term)
    matches = []
    for title, idx in song_title_to_idx.items():
        if song_lower in title:
            matches.append((idx, title))

    if matches:
        # Return the shortest match (most relevant)
        matches.sort(key=lambda x: len(x[1]))
        return matches[0][0]

    return None


def get_song_recommendations(song_name, top_n=10):
    """Get top N similar songs with similarity scores."""
    idx = find_song_index(song_name)
    if idx is None:
        return None

    scores = list(enumerate(songs_similarity[idx]))
    scores = sorted(scores, key=lambda x: x[1], reverse=True)

    searched_song = songs.iloc[idx]

    recommendations = []
    for i in scores[1:top_n + 1]:
        song = songs.iloc[i[0]]
        recommendations.append({
            "songId": str(song["songId"]),
            "title": song["title"],
            "artist": song["artist"],
            "album": song["album"],
            "year": int(song["year"]),
            "genre": song["genre"],
            "similarity_score": round(float(i[1]) * 100, 1),
            "avg_rating": float(song.get("avg_rating", 0)),
            "num_ratings": int(song.get("num_ratings", 0))
        })

    return {
        "searched": {
            "songId": str(searched_song["songId"]),
            "title": searched_song["title"],
            "artist": searched_song["artist"],
            "album": searched_song["album"],
            "year": int(searched_song["year"]),
            "genre": searched_song["genre"],
            "avg_rating": float(searched_song.get("avg_rating", 0)),
            "num_ratings": int(searched_song.get("num_ratings", 0))
        },
        "recommendations": recommendations
    }



# ============================
# Common Endpoints
# ============================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "movies_count": len(movies),
        "books_count": len(books) if books is not None else 0,
        "songs_count": len(songs) if songs is not None else 0
    })


# ============================
# Movie Endpoints
# ============================

@app.route("/recommend", methods=["POST"])
def recommend():
    """Get movie recommendations."""
    data = request.get_json()
    if not data or "movie" not in data:
        return jsonify({"error": "Missing 'movie' field"}), 400

    movie_name = data["movie"]
    top_n = data.get("top_n", 10)

    result = get_recommendations(movie_name, top_n)
    if result is None:
        return jsonify({"error": f"Movie '{movie_name}' not found"}), 404

    return jsonify(result)


@app.route("/movies", methods=["GET"])
def get_movies():
    """Return all movie titles for autocomplete search."""
    query = request.args.get("q", "").lower().strip()

    if query == "all":
        result = []
        for _, movie in movies.iterrows():
            result.append({
                "movieId": int(movie["movieId"]),
                "title": movie["title"]
            })
        return jsonify(result)

    if query:
        filtered = movies[movies["title"].str.lower().str.contains(query, na=False)]
        filtered = filtered.head(20)
    else:
        filtered = movies.head(50)

    result = []
    for _, movie in filtered.iterrows():
        genres = movie["genres"].split("|") if pd.notna(movie["genres"]) and movie["genres"] != "" else []
        result.append({
            "movieId": int(movie["movieId"]),
            "title": movie["title"],
            "genres": genres,
            "avg_rating": float(movie.get("avg_rating", 0)),
            "num_ratings": int(movie.get("num_ratings", 0))
        })

    return jsonify(result)


@app.route("/trending", methods=["GET"])
def trending():
    """Return top-rated movies with significant number of ratings."""
    popular = movies[movies["num_ratings"] >= 50].copy()
    popular = popular.sort_values("avg_rating", ascending=False).head(20)

    result = []
    for _, movie in popular.iterrows():
        genres = movie["genres"].split("|") if pd.notna(movie["genres"]) and movie["genres"] != "" else []
        result.append({
            "movieId": int(movie["movieId"]),
            "title": movie["title"],
            "genres": genres,
            "avg_rating": float(movie["avg_rating"]),
            "num_ratings": int(movie["num_ratings"])
        })

    return jsonify(result)


# ============================
# Book Endpoints
# ============================

@app.route("/books/recommend", methods=["POST"])
def books_recommend():
    """Get book recommendations."""
    if books is None or books_similarity is None:
        return jsonify({"error": "Book model not loaded. Run train_books_model.py first."}), 503

    data = request.get_json()
    if not data or "book" not in data:
        return jsonify({"error": "Missing 'book' field"}), 400

    book_name = data["book"]
    top_n = data.get("top_n", 10)

    result = get_book_recommendations(book_name, top_n)
    if result is None:
        return jsonify({"error": f"Book '{book_name}' not found"}), 404

    return jsonify(result)


@app.route("/books/search", methods=["GET"])
def books_search():
    """Return book titles matching query for autocomplete search."""
    if books is None:
        return jsonify({"error": "Book model not loaded. Run train_books_model.py first."}), 503

    query = request.args.get("q", "").lower().strip()

    if query == "all":
        result = []
        for _, book in books.iterrows():
            result.append({
                "isbn": str(book["isbn"]),
                "title": book["title"],
                "author": book["author"],
                "year": int(book["year"]),
                "publisher": book["publisher"],
                "image_url": book.get("image_url", ""),
                "avg_rating": float(book.get("avg_rating", 0)),
                "num_ratings": int(book.get("num_ratings", 0))
            })
        return jsonify(result)

    if query:
        filtered = books[books["title"].str.lower().str.contains(query, na=False)]
        filtered = filtered.head(20)
    else:
        filtered = books.head(50)

    result = []
    for _, book in filtered.iterrows():
        result.append({
            "isbn": str(book["isbn"]),
            "title": book["title"],
            "author": book["author"],
            "year": int(book["year"]),
            "publisher": book["publisher"],
            "image_url": book.get("image_url", ""),
            "avg_rating": float(book.get("avg_rating", 0)),
            "num_ratings": int(book.get("num_ratings", 0))
        })

    return jsonify(result)


@app.route("/books/trending", methods=["GET"])
def books_trending():
    """Return top-rated books with significant number of ratings (>= 50)."""
    if books is None:
        return jsonify({"error": "Book model not loaded. Run train_books_model.py first."}), 503

    popular = books[books["num_ratings"] >= 50].copy()
    popular = popular.sort_values("avg_rating", ascending=False).head(20)

    result = []
    for _, book in popular.iterrows():
        result.append({
            "isbn": str(book["isbn"]),
            "title": book["title"],
            "author": book["author"],
            "year": int(book["year"]),
            "publisher": book["publisher"],
            "image_url": book.get("image_url", ""),
            "avg_rating": float(book["avg_rating"]),
            "num_ratings": int(book["num_ratings"])
        })

    return jsonify(result)


# ============================
# Song Endpoints
# ============================

@app.route("/songs/recommend", methods=["POST"])
def songs_recommend():
    """Get song recommendations."""
    if songs is None or songs_similarity is None:
        return jsonify({"error": "Song model not loaded. Run train_songs_model.py first."}), 503

    data = request.get_json()
    if not data or "song" not in data:
        return jsonify({"error": "Missing 'song' field"}), 400

    song_name = data["song"]
    top_n = data.get("top_n", 10)

    result = get_song_recommendations(song_name, top_n)
    if result is None:
        return jsonify({"error": f"Song '{song_name}' not found"}), 404

    return jsonify(result)


@app.route("/songs/search", methods=["GET"])
def songs_search():
    """Return song titles matching query for autocomplete search."""
    if songs is None:
        return jsonify({"error": "Song model not loaded. Run train_songs_model.py first."}), 503

    query = request.args.get("q", "").lower().strip()

    if query == "all":
        result = []
        for _, song in songs.iterrows():
            result.append({
                "songId": str(song["songId"]),
                "title": song["title"],
                "artist": song["artist"],
                "album": song["album"],
                "year": int(song["year"]),
                "genre": song["genre"],
                "avg_rating": float(song.get("avg_rating", 0)),
                "num_ratings": int(song.get("num_ratings", 0))
            })
        return jsonify(result)

    if query:
        filtered = songs[songs["title"].str.lower().str.contains(query, na=False)]
        filtered = filtered.head(20)
    else:
        filtered = songs.head(50)

    result = []
    for _, song in filtered.iterrows():
        result.append({
            "songId": str(song["songId"]),
            "title": song["title"],
            "artist": song["artist"],
            "album": song["album"],
            "year": int(song["year"]),
            "genre": song["genre"],
            "avg_rating": float(song.get("avg_rating", 0)),
            "num_ratings": int(song.get("num_ratings", 0))
        })

    return jsonify(result)


@app.route("/songs/trending", methods=["GET"])
def songs_trending():
    """Return top-rated songs with significant number of ratings."""
    if songs is None:
        return jsonify({"error": "Song model not loaded. Run train_songs_model.py first."}), 503

    popular = songs[songs["num_ratings"] >= 50].copy()
    popular = popular.sort_values("avg_rating", ascending=False).head(20)

    result = []
    for _, song in popular.iterrows():
        result.append({
            "songId": str(song["songId"]),
            "title": song["title"],
            "artist": song["artist"],
            "album": song["album"],
            "year": int(song["year"]),
            "genre": song["genre"],
            "avg_rating": float(song["avg_rating"]),
            "num_ratings": int(song["num_ratings"])
        })

    return jsonify(result)


if __name__ == "__main__":
    print("[*] Starting Flask ML Service on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=False)
