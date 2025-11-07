# Embedded Insurance Portal

Root Insurance integration portal with FastAPI backend and Next.js frontend.

## Project Structure

- `backend/` - Python FastAPI server that integrates with Root Insurance API
- `frontend/` - Next.js web application for customer quote flow

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env and add your ROOT_API_KEY
```

4. Run the server:
```bash
python main.py
```

Backend will be available at http://localhost:8000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env.local
# Edit .env.local if backend URL is different
```

4. Run the development server:
```bash
npm run dev
```

Frontend will be available at http://localhost:3000

## Features

- Single-page insurance quote flow
- Customer and vehicle information collection
- Secure payment method entry
- Real-time quote generation
- Policy binding and confirmation
- Error handling and loading states

## API Documentation

Backend API documentation available at http://localhost:8000/docs when running.