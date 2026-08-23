# SIH Artisan Marketplace

A full-stack marketplace platform connecting local artisans with buyers, built for **Smart India Hackathon (SIH)**. The platform uses a Django backend with a smart clustering engine to match artisans with relevant buyers, plus AI-powered product listing generation, paired with a React frontend for a modern, responsive user experience.

## Features

- Artisan and product listings
- Smart clustering engine to match artisans with buyers (bulk order fulfillment via micro-cooperatives)
- AI-powered catalog listing generation — upload a product photo and get an auto-generated title, description, price range, and tags (powered by Google Gemini)
- REST-style Django backend
- React + Vite powered frontend

## Tech Stack

**Backend:**
- Django
- SQLite (development database)
- Google Gemini API (AI listing generation)

**Frontend:**
- React
- Vite

## Project Structure

```
SIH-Artisan-Marketplace/
├── config/            # Django project settings
├── marketplace/        # Core Django app (models, views, clustering engine)
├── frontend/           # React + Vite frontend
├── manage.py
└── requirements.txt
```

## Getting Started

### Backend Setup (Django)

1. Clone the repository:
   ```bash
   git clone https://github.com/anuradhagajendra2023-crypto/SIH-Artisan-Marketplace.git
   cd SIH-Artisan-Marketplace
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate      # Windows
   source venv/bin/activate   # macOS/Linux
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root with your environment variables (see below).

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the development server (run this from the project root, not the `frontend` folder):
   ```bash
   python manage.py runserver
   ```

### Frontend Setup (React)

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

Note: both the backend (`python manage.py runserver`) and frontend (`npm run dev`) need to be running at the same time, in two separate terminals, for the app to work fully.

## Environment Variables

Create a `.env` file in the project root (this file is git-ignored and should never be committed):

```
GEMINI_API_KEY=your-google-gemini-api-key
```

Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) — no credit card required for the free tier.

## Contributing

This project was built as part of Smart India Hackathon (SIH). Contributions and suggestions are welcome via issues or pull requests.

## License

This project is currently unlicensed. All rights reserved by the contributors.
