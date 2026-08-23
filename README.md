# SIH Artisan Marketplace

A full-stack marketplace platform connecting local artisans with buyers, built for **Smart India Hackathon (SIH)**. The platform uses a Django backend with a smart clustering engine to match artisans with relevant buyers, paired with a React frontend for a modern, responsive user experience.

## Features

- Artisan and product listings
- Smart clustering engine to match artisans with buyers
- REST-style Django backend
- React + Vite powered frontend

## Tech Stack

**Backend:**
- Django
- SQLite (development database)

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

4. Create a `.env` file in the project root with your environment variables (e.g. secret key, database config).

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the development server:
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

## Environment Variables

Create a `.env` file in the project root (this file is git-ignored and should never be committed):

```
SECRET_KEY=your-django-secret-key
DEBUG=True
```

## Contributing

This project was built as part of Smart India Hackathon (SIH). Contributions and suggestions are welcome via issues or pull requests.

## License

This project is currently unlicensed. All rights reserved by the contributors.
