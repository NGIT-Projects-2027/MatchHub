# MatchHub 🎯 — Multi-Domain AI Recommendation Platform

Welcome to **MatchHub**, a state-of-the-art, full-stack, enterprise-grade recommendation platform spanning multiple media domains, specifically designed for movies and books. 

**🌐 Live Demo:** [https://movies-hub-recommendations.vercel.app](https://movies-hub-recommendations.vercel.app)

MatchHub leverages modern web technologies combined with Machine Learning (ML) techniques—specifically Natural Language Processing (NLP) and content-based filtering algorithms—to deliver highly personalized, instantaneous suggestions. By analyzing and transforming rich metadata attributes such as genres, plots, authors, cast, and publishers into mathematical vectors, the platform identifies the closest semantic matches to whatever media you search for.

Whether you are a film buff looking for movies similar to *The Dark Knight* or a voracious reader searching for books like *The Hobbit*, MatchHub serves as a centralized hub to explore, discover, and organize your favorite media.

---

## 📖 Table of Contents

1. [Platform Overview & Vision](#-platform-overview--vision)
2. [Comprehensive Feature List](#-comprehensive-feature-list)
3. [System Architecture & Technology Stack](#-system-architecture--technology-stack)
4. [Deep Dive: Machine Learning Engine](#-deep-dive-machine-learning-engine)
5. [Deep Dive: Backend API & TVDB Integration](#-deep-dive-backend-api--tvdb-integration)
6. [Deep Dive: Frontend Architecture](#-deep-dive-frontend-architecture)
7. [Database Schemas (MongoDB)](#-database-schemas-mongodb)
8. [Comprehensive API Specification](#-comprehensive-api-specification)
9. [Project Directory Structure](#-project-directory-structure)
10. [Local Development & Installation Guide](#-local-development--installation-guide)
11. [Configuration & Environment Variables](#-configuration--environment-variables)
12. [Deployment Guide](#-deployment-guide)
13. [Troubleshooting & FAQ](#-troubleshooting--faq)
14. [Future Roadmap & Enhancements](#-future-roadmap--enhancements)
15. [License & Attributions](#-license--attributions)

---

## 🔭 Platform Overview & Vision

The core vision behind MatchHub was to break away from siloed recommendation platforms. Typically, users rely on IMDB or Letterboxd for movies, and Goodreads for books. MatchHub unifies these domains under a single, cohesive, dark-mode application. 

Instead of relying on Collaborative Filtering (which suffers from the "cold start" problem and requires massive amounts of user behavior data), MatchHub utilizes **Content-Based Filtering**. This means the ML engine recommends items based strictly on their inherent properties (e.g., if you like a Christopher Nolan sci-fi movie starring Matthew McConaughey, the system mathematically calculates and surfaces other sci-fi movies by Nolan or with similar complex thematic structures).

---

## 🌟 Comprehensive Feature List

### 🧠 Advanced Content-Based ML Recommender Engine
- **Multi-Domain Intelligence**: Operates distinct ML pipelines for Movies (TMDB dataset) and Books (Book-Crossing dataset).
- **Intelligent NLP Parsing**: Parses complex, messy metadata (stringified JSON arrays, misspellings, disparate tags) into unified semantic text blocks.
- **Lightning-Fast Vector Math**: Computes Cosine Similarity against a 5000-dimensional matrix in mere milliseconds.
- **Memory Optimization**: Compresses the massive $N \times N$ similarity matrices into `float16` precision, reducing RAM overhead from hundreds of megabytes down to ~46MB, allowing the service to run on lightweight, free-tier cloud instances.

### 🖼️ Dynamic Media Loading & External Integrations
- **TVDB API Integration**: Connects seamlessly with the official TVDB API v4 to dynamically fetch high-resolution movie posters.
- **Google Books API Integration**: Employs a custom backend proxy to intercept cover requests and securely query the Google Books API for high-resolution book thumbnails without exposing API keys to the frontend.
- **Multi-Layered Fallback System**: If Google Books lacks a cover or quota is exceeded, the system automatically redirects to the free OpenLibrary database. If OpenLibrary also fails, the React frontend generates a beautiful, dynamic CSS gradient placeholder containing the item's title.
- **Smart Caching & Token Management**: Automatically handles TVDB OAuth login handshakes and intelligently sets `Cache-Control` headers for Google Books HTTP 302 redirects to minimize bandwidth.

### 🔐 Robust User Management & Security
- **Stateless JWT Authentication**: Secures all user interactions without relying on server-side session stores, improving horizontal scalability.
- **Password Cryptography**: Uses `bcrypt` to salt and hash passwords before they ever touch the MongoDB database.
- **Protected Routes**: Middleware verifies JSON Web Tokens on all mutating endpoints (adding favorites, accessing history).

### 📁 Custom Bookmarks, Analytics & User Profiles
- **Multi-Domain Favorites**: Users can curate cross-domain libraries, saving both movies and books to their personal profile.
- **Search History Tracking**: The backend silently logs all authenticated searches and the resulting AI recommendations, allowing users to revisit past discoveries.
- **Slick Autocomplete Search**: Real-time debounce dropdown lists querying the Flask ML in-memory indexes, presenting instantaneous title matches as the user types.

---

## 📐 System Architecture & Technology Stack

MatchHub is structured around a three-tier, decoupled microservice architecture. This separation of concerns allows the compute-heavy Python machine learning tasks to scale independently from the highly concurrent Node.js API requests.

```mermaid
graph TD
    A[React/Vite Frontend] <-->|HTTP / JSON Axios| B[Node.js / Express Backend Server]
    B <-->|Mongoose Driver| C[(MongoDB Atlas Cluster)]
    B <-->|Internal API Proxy| D[Python / Flask ML Microservice]
    B -->|REST Requests| E[External TVDB Poster API]
    D -.->|Pickle De-serialization| F[Trained AI Models in RAM]
```

### 1. The Presentation Layer: Frontend
- **Framework**: React 18 powered by Vite for rapid hot-reloading and optimized production builds.
- **Routing**: React Router DOM for seamless Single Page Application (SPA) navigation.
- **State Management**: React Context API combined with local storage hooks to manage user sessions and UI themes globally.
- **Styling**: A combination of raw, semantic CSS and utility classes, heavily utilizing CSS custom variables for a consistent design system (glassmorphism, dark themes, animated gradients).
- **Network**: Axios instances pre-configured with interceptors to inject JWT bearer tokens on the fly and automatically redirect to the login screen on `401 Unauthorized` responses.

### 2. The Application Layer: Node.js Backend
- **Environment**: Node.js v18+ running the Express web framework.
- **Database ORM**: Mongoose provides rigorous schema validation, query building, and relationship mapping for MongoDB.
- **Authentication**: `jsonwebtoken` and `bcryptjs`.
- **Proxying**: Acts as a secure intermediary. The frontend never talks directly to the Python ML server or the TVDB API. The Node.js backend sanitizes requests, appends secret API keys, and forwards them, preventing sensitive token leakage.

### 3. The Data Science Layer: Flask ML Service
- **Environment**: Python 3.10+ running Flask and Flask-CORS.
- **Data Engineering**: Pandas and NumPy are used for heavy data wrangling, cleaning, and matrix manipulation.
- **Machine Learning**: Scikit-Learn (`CountVectorizer`, `cosine_similarity`) forms the mathematical backbone of the recommendation algorithms.
- **Persistence**: Python's native `pickle` library serializes the fully trained matrices into binary files (`.pkl`), which are loaded directly into RAM upon server boot for zero-latency queries.

---

## 🧠 Deep Dive: Machine Learning Engine

To understand how the magic happens, let's trace the data engineering pipeline from raw CSV to live recommendation.

### The Movie Pipeline
The engine ingests the Kaggle TMDB 5000 dataset, which contains dense, nested JSON strings representing a movie's attributes.

1. **JSON Parsing & Extraction**:
   Using `ast.literal_eval`, the script traverses the raw dataset. It extracts the names of genres and keywords. For the cast, it specifically targets the top 3 billed actors. For the crew, it iterates through the objects until it finds the `job == "Director"` and extracts that single name.
   
2. **Entity Binding (Space Removal)**:
   In Natural Language Processing, a vectorizer treats spaces as token separators. If we leave the name "Tom Hanks" as is, the model sees "Tom" and "Hanks" as two separate concepts. By stripping spaces ("TomHanks"), we bind the first and last name into a single, unique semantic entity. This is applied to genres ("ScienceFiction"), actors, and directors.

3. **Tag Concatenation**:
   The parsed, space-stripped arrays are combined with the word-tokenized `overview` (the plot summary) to form one massive "tag" string per movie.
   ```python
   # Example output tag for 'Inception':
   "dom cobb is a skilled thief... action sciencefiction adventure leonardodicaprio josephgordon-levitt christophernolan dream subconscious..."
   ```

4. **Vectorization**:
   The `CountVectorizer` scans all 4,800+ movie tags, drops common English stop words ("the", "and", "is"), and limits the vocabulary to the 5,000 most frequently occurring unique tokens. Each movie is then mapped into a 5,000-dimensional vector space.
   $$\text{Movie Vector } = [0, 1, 0, 0, 3, \dots, 1]$$

5. **Cosine Similarity Computation**:
   To find similar movies, the engine calculates the Cosine Similarity between all vectors. Instead of measuring the Euclidean distance (which would be skewed by the length of the plot summary), it measures the cosine of the angle between the vectors.
   $$\text{Similarity}(A, B) = \frac{A \cdot B}{\|A\| \|B\|}$$
   This results in an $N \times N$ matrix where every movie has a `0.0` to `1.0` similarity score mapped against every other movie.

### The Book Pipeline
The Book pipeline utilizes the Book-Crossing dataset, applying a similar philosophy but with domain-specific tweaks:
1. **Implicit vs Explicit Ratings**: The dataset contains implicit ratings (value 0, meaning the user interacted but didn't rate). The script heavily filters the dataset, dropping all implicit ratings and keeping only books that have a critical mass of at least 10 explicit user ratings.
2. **Decade Grouping**: Publication years are mapped into semantic decades (e.g., `1990` -> `"1990s"`). This allows the vectorizer to group books from the same era together, improving the thematic accuracy of recommendations.
3. **Tag Generation**: The tag is a combination of the Title words, Author (space-stripped), Publisher (space-stripped), and Decade.

---

## ⚙️ Deep Dive: Backend API & TVDB Integration

The Node.js backend serves as the traffic controller for the entire application. 

### Middleware Architecture
1. **CORS & JSON**: Standard Express middleware allows cross-origin requests from the React frontend and parses incoming JSON bodies.
2. **Auth Middleware** (`backend/middleware/auth.js`): This critical piece of code intercepts requests to protected routes. It strips the `Bearer` token from the `Authorization` header, calls `jwt.verify()` against the environment's `JWT_SECRET`, and if valid, attaches the decoded user ID directly to the `req.user` object for downstream use.

### The TVDB Poster Lifecycle (`backend/routes/movies.js`)
Because the ML dataset doesn't contain live poster URLs, the backend integrates with TVDB.
1. **Token Generation**: On the first request, the server `POST`s the `TVDB_API_KEY` to the TVDB login endpoint. It receives a bearer token and caches it in a global variable `tvdbToken`, setting an expiration timestamp (`tvdbTokenExp`) to 28 days in the future.
2. **Title Sanitization**: Many ML datasets append years to titles (e.g., "Toy Story (1995)"). The backend uses a Regular Expression (`movie.title.replace(/\s*\(\d{4}\)$/, "")`) to strip this out, as the TVDB search API often fails if the year is included in the query string.
3. **Concurrent Fetching**: When the ML service returns 10 recommendations, the backend uses `Promise.all()` to fire off 10 concurrent requests to TVDB, rapidly appending `image_url` properties to the payload before sending the final response to the user.

### Book Cover Proxy & Google Books Integration (`backend/routes/books.js`)
Similar to movies, the ML dataset for books lacks high-quality cover images. MatchHub solves this via an intelligent backend proxy:
1. **Google Books API Priority**: The frontend image tags point to `/api/books/cover/:isbn`. The backend securely intercepts this and queries the Google Books API using the private `GOOGLE_BOOKS_API_KEY`. It scans the response for the highest possible resolution (`extraLarge`, `large`, `medium`) before falling back to lower resolutions.
2. **OpenLibrary Fallback**: If the Google Books API quota is exceeded, or if the API key is missing, or if Google simply doesn't have the book cover, the backend automatically issues an HTTP 302 Redirect to the free, public `OpenLibrary` covers API.
3. **Browser Caching**: The backend sets aggressive HTTP `Cache-Control` headers so the browser natively caches the 302 Redirects, significantly reducing API calls and improving load times.

---

## 🖥️ Deep Dive: Frontend Architecture

The frontend is designed to be visually striking, heavily reliant on a curated palette of deep charcoals, vibrant purples, and electric blues. 

### Context API (`AuthContext.jsx`)
Instead of prop-drilling authentication state through dozens of components, the app wraps the entire component tree in an `AuthProvider`. This provider exposes:
- `user`: The current user object (or null).
- `token`: The active JWT.
- `login()`, `signup()`, `logout()`: Abstracted functions that handle API calls, local storage manipulation, and state updates simultaneously.

### The Recommendation UI (`Home.jsx`)
The homepage features a tabbed interface allowing users to instantly swap between the Movies and Books domains. 
- **Debounced Search**: As the user types into the SearchBox, a `useEffect` hook with a `setTimeout` delays the API call by 300ms. This prevents the frontend from spamming the backend with requests for every single keystroke.
- **Results Presentation**: When a user clicks a movie, the state shifts. The hero section updates to display the "Searched Media", while a grid below renders the algorithmic recommendations. Each card displays a calculated "Similarity Match %", helping the user understand *why* the item was recommended.

---

## 🗄️ Database Schemas (MongoDB)

MatchHub utilizes strict NoSQL schemas enforced via Mongoose.

### 1. User Model (`models/User.js`)
Manages authentication credentials and cross-domain favorite libraries.
```javascript
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Encrypted via bcrypt
  createdAt: { type: Date, default: Date.now },
  favorites: [ // Movie Favorites
    {
      movieId: Number,
      title: String,
      genres: [String],
      addedAt: { type: Date, default: Date.now }
    }
  ],
  bookFavorites: [ // Book Favorites
    {
      isbn: String,
      title: String,
      author: String,
      imageUrl: String,
      addedAt: { type: Date, default: Date.now }
    }
  ]
});
```

### 2. History Model (`models/History.js`)
An analytical table that tracks user behavior and AI outputs over time.
```javascript
const HistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  search: { type: String, required: true },
  type: { type: String, enum: ['movie', 'book'], default: 'movie' },
  searchedAt: { type: Date, default: Date.now },
  results: [ // Snapshots the recommendations at the time of search
    {
      movieId: Number,
      title: String,
      genres: [String],
      similarity_score: Number
    }
  ]
});
```

---

## 📡 Comprehensive API Specification

The Node.js backend exposes a RESTful API. Below are the core endpoints.

### Authentication Endpoints

| Method | Endpoint | Description | Request Body | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new user | `{ name, email, password }` | No |
| `POST` | `/api/auth/login` | Authenticate and get JWT | `{ email, password }` | No |
| `GET` | `/api/auth/me` | Get current user profile | None | **Yes** |

### Movie Recommendation Endpoints

| Method | Endpoint | Description | Request Body | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/recommend` | Get movie AI recommendations | `{ movie, top_n }` | Optional* |
| `GET` | `/api/movies?q=...` | Autocomplete movie search | None | No |
| `GET` | `/api/trending` | Get top-rated movies | None | No |

*\* If a valid Bearer token is provided to `/api/recommend`, the search is automatically logged to the user's history.*

### Book Recommendation Endpoints

| Method | Endpoint | Description | Request Body | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/books/recommend` | Get book AI recommendations | `{ book, top_n }` | Optional* |
| `GET` | `/api/books/search?q=...`| Autocomplete book search | None | No |
| `GET` | `/api/books/trending` | Get top-rated books | None | No |

### User Data Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/history` | Retrieve user search history | **Yes** |
| `DELETE` | `/api/history` | Clear all user history | **Yes** |
| `GET` | `/api/favorites` | Get saved movies | **Yes** |
| `POST` | `/api/favorites` | Save movie to favorites | **Yes** |
| `DELETE` | `/api/favorites/:id`| Remove movie from favorites | **Yes** |
| `GET` | `/api/books/favorites` | Get saved books | **Yes** |
| `POST` | `/api/books/favorites` | Save book to favorites | **Yes** |
| `DELETE` | `/api/books/favorites/:isbn`| Remove book from favorites | **Yes** |

---

## 📂 Project Directory Structure

```text
matchhub/
├── backend/                   # Node.js Express API
│   ├── models/                # Mongoose Database Schemas (User.js, History.js)
│   ├── routes/                # Express Routers (auth.js, movies.js, books.js)
│   ├── middleware/            # JWT validation logic
│   ├── server.js              # Entry point & Express configuration
│   └── package.json           
├── frontend/                  # React Vite SPA
│   ├── src/                   
│   │   ├── components/        # Reusable UI components (Navbar, MovieCard)
│   │   ├── context/           # Global State (AuthContext)
│   │   ├── pages/             # Route level components (Home, Profile, Login)
│   │   ├── lib/               # Utilities and Axios setup
│   │   ├── index.css          # Global styles, variables, and Tailwind imports
│   │   └── App.jsx            # React Router setup
│   └── package.json
├── ml-service/                # Python Flask Microservice
│   ├── data/                  # Raw CSV datasets (movies/, books/)
│   ├── models/                # Generated Pickle files (.pkl)
│   ├── app.py                 # Flask server exposing ML endpoints
│   ├── train_movies_model.py  # Script to vectorize TMDB dataset
│   ├── train_books_model.py   # Script to vectorize Book-Crossing dataset
│   └── requirements.txt
└── README.md                  # This documentation
```

---

## 💻 Local Development & Installation Guide

To run the entire stack locally, you must launch all three services simultaneously.

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **MongoDB** (Local instance or Atlas Cluster URI)

### Step 1: Initialize the Machine Learning Service
```bash
cd ml-service
# Highly recommended: create a virtual environment
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate

# Install Data Science dependencies
pip install -r requirements.txt

# Run the training scripts to generate the .pkl matrices
python train_movies_model.py
python train_books_model.py

# Boot the Flask server
python app.py
```
*The Flask server will boot on `http://localhost:5000`.*

### Step 2: Initialize the Node.js Backend
Open a new terminal session.
```bash
cd backend
npm install

# Ensure your .env file is configured (see section below)
npm start
```
*The Express server will boot on `http://localhost:3001`.*

### Step 3: Initialize the React Frontend
Open a third terminal session.
```bash
cd frontend
npm install

npm run dev
```
*Vite will compile the frontend and serve it at `http://localhost:5173`. Open this URL in your browser.*

---

## ⚙️ Configuration & Environment Variables

The backend requires a `.env` file located at `backend/.env`. Below is the required configuration:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Listening port for the Node.js server. | `3001` |
| `MONGODB_URI` | Full connection URI for MongoDB. | `mongodb+srv://user:pass@cluster.mongodb.net/recommendation_system` |
| `JWT_SECRET` | Cryptographic secret for signing tokens. | `your_super_secret_random_string` |
| `FLASK_ML_URL` | Base URL of the Python ML service. | `http://localhost:5000` |
| `TVDB_API_KEY` | Developer key from TheTVDB API v4. | `abc123xyz...` |

---

## 🚀 Deployment Guide

MatchHub is designed to be easily deployable using Platform-as-a-Service (PaaS) providers like Render, Heroku, or DigitalOcean. A `render.yaml` infrastructure-as-code file is included in the repository root for automated deployment.

1. **Frontend**: Deployed as a static site. The Vite build command (`npm run build`) generates HTML/JS/CSS assets that can be hosted on Vercel, Netlify, or Render Static Sites.
2. **Backend**: Deployed as a Node Web Service. Ensure environment variables are securely injected via the PaaS dashboard.
3. **ML Service**: Deployed as a Python Web Service via Gunicorn (`gunicorn app:app`). Note that because the similarity matrices are held in RAM, the ML service requires an instance with **at least 512MB of RAM** (the `float16` optimization keeps the baseline usage around 150-200MB).

---

## 🔍 Troubleshooting & FAQ

#### Q: The React frontend displays a blank screen or a loading loop.
**Fix**: Ensure both the Node.js Backend (port 3001) and Flask ML Service (port 5000) are running. Open your browser console (F12) and check the Network tab. If requests to `localhost:3001` are failing with CORS or `CONNECTION_REFUSED` errors, your backend is offline.

#### Q: The movie recommendations load, but all posters show a blank color block with text.
**Fix**: The server might not be authenticated with the TVDB API. Ensure your `backend/.env` file contains a valid `TVDB_API_KEY`. The backend gracefully falls back to generating CSS placeholders if the TVDB API returns a 401 Unauthorized or 404 Not Found error.

#### Q: Python throws an `Out of Memory (OOM)` or `Killed` error when running `train_movies_model.py`.
**Fix**: The Cosine Similarity matrix for 4,800 movies requires significant memory. If running on an extremely constrained machine, modify the Python script to lower the `max_features` in the `CountVectorizer` (e.g., from 5000 down to 2500), which will drastically shrink the dimensions of the resulting matrix.

#### Q: The Node.js terminal displays `EADDRINUSE: address already in use :::3001`
**Fix**: Another node instance is running on port 3001. Find and terminate it. On Windows PowerShell, use:
`Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force`

#### Q: How can I customize the recommendation weighting?
**Fix**: Open `ml-service/train_movies_model.py` or `train_books_model.py`. You can adjust how the `tags` string is built. For example, if you want recommendations to heavily prioritize the Director, you can append the `crew` array to the `tags` string multiple times, artificially inflating its weight in the `CountVectorizer`. Once modified, re-run the training script to regenerate the `.pkl` models.

---

## 🔮 Future Roadmap & Enhancements

While MatchHub is highly functional, several enhancements are planned for future iterations:
1. **Third Domain Integration**: Adding support for Video Game recommendations (utilizing IGDB data).
2. **Hybrid Filtering System**: Combining the current Content-Based engine with Collaborative Filtering (matrix factorization) once the MongoDB database accumulates enough organic user rating data, providing the "best of both worlds".
3. **Automated Retraining**: Implementing an Apache Airflow or Celery cron job to periodically fetch new movies from TMDB, append them to the dataset, and automatically regenerate the `.pkl` files without downtime.
4. **Redis Caching**: Injecting Redis between the Node.js backend and Flask ML service to cache exact-match search results, reducing CPU cycles on the Python server for highly popular queries like "The Matrix".

---

## 📄 License & Attributions

MatchHub is built as an open-source educational portfolio project.

- **Datasets**: 
  - Movie datasets provided by GroupLens Research (MovieLens / TMDB 5000).
  - Book datasets provided by the Book-Crossing community.
- **Media Assets**: Movie poster imagery dynamically fetched and provided by [TheTVDB](https://thetvdb.com/). Book covers provided by the [Google Books API](https://developers.google.com/books) and [OpenLibrary](https://openlibrary.org/).
- **License**: MIT License. You are free to use, modify, and distribute this software for non-commercial and educational purposes.

---
*End of Documentation*
