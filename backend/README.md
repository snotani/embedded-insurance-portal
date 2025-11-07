# Root Insurance Backend API

FastAPI backend for Root Insurance integration.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your Root API key
```

3. Run the server:
```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `POST /quote` - Create an insurance quote
- `POST /payment-method` - Create a payment method
- `POST /bind` - Bind an insurance policy
- `GET /health` - Health check

## Environment Variables

- `ROOT_API_KEY` - Your Root Insurance API key (required)
- `ROOT_API_BASE_URL` - Root API base URL (default: https://sandbox.root.co.za/v1/insurance)
- `ROOT_QUOTE_PACKAGE_ID` - Quote package ID (optional)

## Testing

The API will be available at `http://localhost:8000`

API documentation is available at `http://localhost:8000/docs`
