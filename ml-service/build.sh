#!/usr/bin/env bash
set -e

echo "[BUILD] Installing Python dependencies..."
pip install -r requirements.txt

if [ ! -f "models/movies.pkl" ]; then
    echo "[BUILD] Training movie model..."
    python train_movies_model.py
fi

if [ ! -f "models/books.pkl" ]; then
    echo "[BUILD] Training book model..."
    python train_books_model.py
fi

if [ ! -f "models/songs.pkl" ]; then
    echo "[BUILD] Training song model..."
    python train_songs_model.py
fi

echo "[BUILD] ML Service build complete! Model files:"
ls -lh models/

