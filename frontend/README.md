# Insurance Portal Frontend

Next.js frontend for the Root Insurance integration portal.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and set:
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8000)

## Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Features

- Single-page quote flow with three sections:
  1. Customer and vehicle information collection
  2. Payment method entry
  3. Policy confirmation display
- Real-time form validation
- Loading states during API calls
- Error handling with user-friendly messages
- Responsive design with Tailwind CSS

## API Integration

The frontend communicates with the backend API at the configured `NEXT_PUBLIC_API_URL`:

- `POST /quote` - Get insurance quote
- `POST /payment-method` - Create payment method
- `POST /bind` - Bind policy

## Build

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```
