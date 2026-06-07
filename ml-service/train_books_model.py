"""
Book Recommendation Model Trainer (Book-Crossing Version)
Trains a content-based recommendation model using the Book-Crossing dataset.
Saves pickle files for the Flask ML service.
"""

import os
import sys
import pandas as pd
import numpy as np
import pickle
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "books")
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def get_decade(year):
    """Convert a publication year to a decade string like '1990s'."""
    try:
        y = int(year)
        if y < 1900 or y > 2099:
            return "unknown"
        decade = (y // 10) * 10
        return f"{decade}s"
    except (ValueError, TypeError):
        return "unknown"


def train_books_model():
    """Train the content-based recommendation model using Book-Crossing dataset."""
    books_path = os.path.join(DATA_DIR, "BX-Books.csv")
    ratings_path = os.path.join(DATA_DIR, "BX-Book-Ratings.csv")

    if not os.path.exists(books_path) or not os.path.exists(ratings_path):
        print(f"\n[ERROR] Book-Crossing dataset files not found in {DATA_DIR}!")
        print("Please download 'BX-Books.csv' and 'BX-Book-Ratings.csv'")
        print("from Kaggle (https://www.kaggle.com/datasets/arashnic/book-recommendation-dataset)")
        print(f"and place them directly inside the {DATA_DIR} folder.")
        sys.exit(1)

    print("\n[*] Loading datasets...")
    books = pd.read_csv(books_path, sep=";", encoding="latin-1", on_bad_lines="skip")
    ratings = pd.read_csv(ratings_path, sep=";", encoding="latin-1", on_bad_lines="skip")

    print(f"  Books loaded: {books.shape}")
    print(f"  Ratings loaded: {ratings.shape}")

    # Standardize column names
    books.columns = books.columns.str.strip()
    ratings.columns = ratings.columns.str.strip()

    # Filter to explicit ratings only (rating > 0)
    print("[*] Filtering to explicit ratings (Rating > 0)...")
    explicit_ratings = ratings[ratings["Rating"] > 0].copy()
    print(f"  Explicit ratings: {len(explicit_ratings)}")

    # Compute average rating and number of ratings per ISBN
    print("[*] Computing rating statistics per book...")
    rating_stats = explicit_ratings.groupby("ISBN").agg(
        avg_rating=("Rating", "mean"),
        num_ratings=("Rating", "count")
    ).reset_index()

    rating_stats["avg_rating"] = rating_stats["avg_rating"].round(1)

    # Filter to books with >= 10 explicit ratings
    rating_stats = rating_stats[rating_stats["num_ratings"] >= 10]
    print(f"  Books with >= 10 explicit ratings: {len(rating_stats)}")

    # Merge books with rating stats
    print("[*] Merging datasets and preprocessing...")
    books = books.merge(rating_stats, on="ISBN", how="inner")
    print(f"  Merged dataframe: {books.shape}")

    # Drop rows with missing critical fields
    books = books.dropna(subset=["Title", "Author", "Publisher"])

    # Clean year column
    books["Year"] = pd.to_numeric(books["Year"], errors="coerce").fillna(0).astype(int)

    # Build tags
    print("[*] Creating tags...")

    def build_tags(row):
        """Build tag string from title words + author + publisher + decade."""
        # Tokenized title words
        title_words = str(row["Title"]).split()

        # Author with spaces stripped (e.g. "J.K.Rowling")
        author = [str(row["Author"]).replace(" ", "")]

        # Publisher with spaces stripped
        publisher = [str(row["Publisher"]).replace(" ", "")]

        # Decade grouping
        decade = [get_decade(row["Year"])]

        all_tags = title_words + author + publisher + decade
        return " ".join(all_tags).lower()

    books["tags"] = books.apply(build_tags, axis=1)

    # Add dummy Image-URL-L if missing
    if "Image-URL-L" not in books.columns:
        books["Image-URL-L"] = ""

    # Select and rename columns for final dataframe
    new_df = books[["ISBN", "Title", "Author", "Year",
                     "Publisher", "Image-URL-L", "tags", "avg_rating", "num_ratings"]].copy()
    new_df.columns = ["isbn", "title", "author", "year", "publisher", "image_url", "tags", "avg_rating", "num_ratings"]

    # Reset index for consistent similarity matrix indexing
    new_df = new_df.reset_index(drop=True)

    print(f"    Final dataframe shape: {new_df.shape}")

    # Vectorization
    print("\n[*] Computing CountVectorizer vectors...")
    cv = CountVectorizer(max_features=5000, stop_words="english")
    vectors = cv.fit_transform(new_df["tags"]).toarray()

    # Cosine Similarity
    print("[*] Computing cosine similarity matrix...")
    similarity = cosine_similarity(vectors)

    # Cast to float16 to drastically reduce memory usage
    similarity = similarity.astype(np.float16)

    print(f"    Similarity matrix shape: {similarity.shape}, Memory: {similarity.nbytes / (1024**2):.1f} MB")

    # Save pickle files
    os.makedirs(MODELS_DIR, exist_ok=True)
    books_pkl_path = os.path.join(MODELS_DIR, "books.pkl")
    similarity_pkl_path = os.path.join(MODELS_DIR, "books_similarity.pkl")

    pickle.dump(new_df, open(books_pkl_path, "wb"))
    pickle.dump(similarity, open(similarity_pkl_path, "wb"))

    print(f"\n[SAVED] {books_pkl_path}")
    print(f"[SAVED] {similarity_pkl_path}")
    print(f"\n[OK] Book model training complete!")

    # Quick test
    test_book = new_df.iloc[0]["title"]
    try:
        idx = new_df[new_df["title"] == test_book].index[0]
        scores = list(enumerate(similarity[idx]))
        scores = sorted(scores, key=lambda x: x[1], reverse=True)

        print(f"\n[TEST] Top 5 similar to '{test_book}':")
        for i in scores[1:6]:
            title = new_df.iloc[i[0]]["title"]
            author = new_df.iloc[i[0]]["author"]
            score = round(i[1] * 100, 1)
            print(f"       {title} by {author} -- {score}% similar")
    except IndexError:
        print(f"\n[TEST] '{test_book}' not found in dataset.")


if __name__ == "__main__":
    train_books_model()
