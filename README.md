# BigQuery Release Radar 📡

A premium, modern web dashboard built with **Python Flask** and **Vanilla Web Technologies (HTML, CSS, JS)** that tracks Google Cloud's BigQuery release notes in real-time, offering instant search, type-filtering, and social sharing to X (Twitter).

---

## 🚀 Key Features

* **Server-side Feed Proxy & Parsing**: Fetches the official Google Cloud BigQuery RSS/Atom XML feed and splits large daily update logs into granular, type-based notes (e.g. *Features*, *Issues*, *Deprecations*).
* **Glassmorphic UI**: Beautiful dark-theme design utilizing modern typography, glowing ambient backdrops, clean timeline tracks, and micro-interactions.
* **Instant Client-side Search & Filtering**: Cache-assisted filtering and searching that updates the DOM instantly as you type.
* **Custom Twitter/X Composer Modal**: Includes an interactive modal previewing the tweet with a live character countdown, SVG progress ring, quick hashtag chips, and automatic URL shortlink embedding.

---

## 📂 Project Structure

```
sandeep-event-talks-app/
├── app.py                 # Flask server & XML parsing engine
├── templates/
│   └── index.html         # Main dashboard markup & modal layouts
├── static/
│   ├── css/
│   │   └── style.css      # Core styles, glassmorphism, & keyframe animations
│   └── js/
│       └── app.js         # API integration, search, filter, and modal logic
├── .gitignore             # Ignored files (virtualenvs, cache files, etc.)
└── README.md              # This file
```

---

## 🛠️ Getting Started

### Prerequisites
Make sure you have **Python 3.x** and `pip` installed on your local machine.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/scha54/sandeep-event-talks-app.git
   cd sandeep-event-talks-app
   ```

2. **Install dependencies**:
   This project uses standard library modules and the `requests` and `Flask` library:
   ```bash
   pip install Flask requests
   ```

---

## 💻 Running the Application

Start the local development server by running:

```bash
python app.py
```

By default, Flask will host the application locally. Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📝 How it Works

1. **Proxy XML Request**: The app calls the Google Cloud feed endpoint backend-to-backend to bypass browser CORS origin policies.
2. **XML Parsing**: In `app.py`, elements under the `<entry>` block are parsed. The html contents inside are split by `<h3>` tags to extract individual updates.
3. **Frontend Rendering**: In `app.js`, JSON results are cached. As you write search queries or select filters (like *Features*), items are filtered instantly and rendered in cards.
4. **Tweet Share**: Click the Twitter logo on any card. Customize the text or click tag chips inside the modal, and the browser will open the X Web Intent pre-filled with your customized tweet.
