"""
FastAPI Backend for Root Insurance Integration
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Literal
from decimal import Decimal
from datetime import datetime, date
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Root Insurance Integration API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Pydantic Models
# ============================================================================

class Address(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str = Field(..., alias="zipCode")

    class Config:
        populate_by_name = True


class Vehicle(BaseModel):
    year: int
    make: str
    model: str
    vin: Optional[str] = None


class QuoteRequest(BaseModel):
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    email: EmailStr
    phone: str
    address: Address
    vehicle: Vehicle

    class Config:
        populate_by_name = True


class QuoteResponse(BaseModel):
    quote_id: str
    premium_amount: float
    coverage_details: dict
    valid_until: str
    message: str = "Quote generated successfully"


class PaymentMethodRequest(BaseModel):
    quote_id: str = Field(..., alias="quoteId")
    type: Literal["card", "bank_account"]
    card_number: Optional[str] = Field(None, alias="cardNumber")
    card_exp_month: Optional[int] = Field(None, alias="cardExpMonth")
    card_exp_year: Optional[int] = Field(None, alias="cardExpYear")
    card_cvv: Optional[str] = Field(None, alias="cardCvv")
    bank_account_number: Optional[str] = Field(None, alias="bankAccountNumber")
    bank_routing_number: Optional[str] = Field(None, alias="bankRoutingNumber")

    class Config:
        populate_by_name = True

    @validator('card_number')
    def validate_card_number(cls, v, values):
        if values.get('type') == 'card' and not v:
            raise ValueError('Card number is required for card payments')
        return v


class PaymentMethodResponse(BaseModel):
    payment_method_id: str
    type: str
    last_four: Optional[str] = None
    message: str = "Payment method created successfully"


class BindRequest(BaseModel):
    quote_id: str = Field(..., alias="quoteId")
    payment_method_id: str = Field(..., alias="paymentMethodId")
    effective_date: Optional[str] = Field(None, alias="effectiveDate")

    class Config:
        populate_by_name = True


class BindResponse(BaseModel):
    policy_id: str
    policy_number: str
    effective_date: str
    expiration_date: str
    premium_amount: float
    status: str
    message: str = "Policy bound successfully"


# ============================================================================
# Root API Client
# ============================================================================

class RootAPIClient:
    """Client for interacting with Root Insurance API"""
    
    def __init__(self):
        self.api_key = os.getenv("ROOT_API_KEY")
        self.base_url = os.getenv("ROOT_API_BASE_URL", "https://sandbox.root.co.za/v1/insurance")
        
        if not self.api_key:
            raise ValueError("ROOT_API_KEY environment variable is required")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def create_quote(self, quote_data: QuoteRequest) -> dict:
        """Create a quote with Root API"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Transform data for Root API format
                payload = {
                    "type": "car",
                    "quote_package_id": os.getenv("ROOT_QUOTE_PACKAGE_ID", "default_package"),
                    "policyholder": {
                        "id": f"{quote_data.first_name.lower()}_{quote_data.last_name.lower()}_{datetime.now().timestamp()}",
                        "first_name": quote_data.first_name,
                        "last_name": quote_data.last_name,
                        "email": quote_data.email,
                        "cellphone": quote_data.phone
                    },
                    "vehicle": {
                        "year": quote_data.vehicle.year,
                        "make": quote_data.vehicle.make,
                        "model": quote_data.vehicle.model,
                        "vin": quote_data.vehicle.vin or f"VIN{datetime.now().timestamp()}"
                    }
                }
                
                response = await client.post(
                    f"{self.base_url}/quotes",
                    json=payload,
                    headers=self.headers
                )
                
                if response.status_code >= 400:
                    error_detail = response.json() if response.text else {}
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Root API error: {error_detail.get('message', 'Failed to create quote')}"
                    )
                
                return response.json()
            
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=504,
                    detail="Request to Root API timed out. Please try again."
                )
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=503,
                    detail=f"Unable to connect to Root API: {str(e)}"
                )
    
    async def create_payment_method(self, payment_data: PaymentMethodRequest) -> dict:
        """Create a payment method with Root API"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                payload = {
                    "type": payment_data.type,
                    "quote_id": payment_data.quote_id
                }
                
                if payment_data.type == "card":
                    payload["card"] = {
                        "number": payment_data.card_number,
                        "exp_month": payment_data.card_exp_month,
                        "exp_year": payment_data.card_exp_year,
                        "cvv": payment_data.card_cvv
                    }
                elif payment_data.type == "bank_account":
                    payload["bank_account"] = {
                        "account_number": payment_data.bank_account_number,
                        "routing_number": payment_data.bank_routing_number
                    }
                
                response = await client.post(
                    f"{self.base_url}/payment-methods",
                    json=payload,
                    headers=self.headers
                )
                
                if response.status_code >= 400:
                    error_detail = response.json() if response.text else {}
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Payment method creation failed: {error_detail.get('message', 'Invalid payment information')}"
                    )
                
                return response.json()
            
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=504,
                    detail="Request to Root API timed out. Please try again."
                )
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=503,
                    detail=f"Unable to connect to Root API: {str(e)}"
                )
    
    async def bind_policy(self, bind_data: BindRequest) -> dict:
        """Bind a policy with Root API"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                payload = {
                    "quote_id": bind_data.quote_id,
                    "payment_method_id": bind_data.payment_method_id,
                    "effective_date": bind_data.effective_date or date.today().isoformat()
                }
                
                response = await client.post(
                    f"{self.base_url}/policies",
                    json=payload,
                    headers=self.headers
                )
                
                if response.status_code >= 400:
                    error_detail = response.json() if response.text else {}
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Policy binding failed: {error_detail.get('message', 'Unable to bind policy')}"
                    )
                
                return response.json()
            
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=504,
                    detail="Request to Root API timed out. Please try again."
                )
            except httpx.RequestError as e:
                raise HTTPException(
                    status_code=503,
                    detail=f"Unable to connect to Root API: {str(e)}"
                )


# Initialize Root API client
root_client = RootAPIClient()


# ============================================================================
# API Endpoints
# ============================================================================

@app.post("/quote", response_model=QuoteResponse)
async def create_quote(quote_request: QuoteRequest):
    """
    Create an insurance quote
    Requirements: 1.1, 1.2, 6.1, 6.2, 7.2, 8.1
    """
    try:
        root_response = await root_client.create_quote(quote_request)
        
        # Transform Root API response to our format
        return QuoteResponse(
            quote_id=root_response.get("quote_id", root_response.get("id")),
            premium_amount=float(root_response.get("monthly_premium", root_response.get("premium_amount", 0))),
            coverage_details=root_response.get("coverage", {}),
            valid_until=(datetime.now().isoformat() if not root_response.get("valid_until") 
                        else root_response.get("valid_until"))
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while generating your quote. Please try again. Error: {str(e)}"
        )


@app.post("/payment-method", response_model=PaymentMethodResponse)
async def create_payment_method(payment_request: PaymentMethodRequest):
    """
    Create a payment method
    Requirements: 3.2, 4.2, 8.1
    """
    try:
        root_response = await root_client.create_payment_method(payment_request)
        
        # Extract last four digits if available
        last_four = None
        if payment_request.type == "card" and payment_request.card_number:
            last_four = payment_request.card_number[-4:]
        
        return PaymentMethodResponse(
            payment_method_id=root_response.get("payment_method_id", root_response.get("id")),
            type=payment_request.type,
            last_four=last_four
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing your payment method. Please verify your information and try again."
        )


@app.post("/bind", response_model=BindResponse)
async def bind_policy(bind_request: BindRequest):
    """
    Bind an insurance policy
    Requirements: 4.1, 4.2, 4.3, 7.2
    """
    try:
        root_response = await root_client.bind_policy(bind_request)
        
        # Calculate expiration date (typically 1 year from effective date)
        effective = date.fromisoformat(root_response.get("effective_date", date.today().isoformat()))
        expiration = date(effective.year + 1, effective.month, effective.day)
        
        return BindResponse(
            policy_id=root_response.get("policy_id", root_response.get("id")),
            policy_number=root_response.get("policy_number", f"POL-{root_response.get('id', 'UNKNOWN')}"),
            effective_date=root_response.get("effective_date", date.today().isoformat()),
            expiration_date=root_response.get("expiration_date", expiration.isoformat()),
            premium_amount=float(root_response.get("monthly_premium", root_response.get("premium_amount", 0))),
            status=root_response.get("status", "active")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while binding your policy. Please try again or contact support."
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "root-insurance-backend"}


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with user-friendly messages"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "An unexpected error occurred. Please try again later.",
            "status_code": 500
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
