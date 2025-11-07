'use client';

import { useState } from 'react';
import axios from 'axios';

interface QuoteFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleVin: string;
}

interface PaymentFormData {
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvv: string;
}

interface QuoteResponse {
  quote_id: string;
  premium_amount: number;
  coverage_details: any;
}

interface PolicyResponse {
  policy_number: string;
  policy_id: string;
  effective_date: string;
  premium_amount: number;
}

export default function QuotePage() {
  const [currentSection, setCurrentSection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [quoteData, setQuoteData] = useState<QuoteFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleVin: '',
  });

  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    cardNumber: '',
    cardExpMonth: '',
    cardExpYear: '',
    cardCvv: '',
  });

  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | null>(null);
  const [policyResponse, setPolicyResponse] = useState<PolicyResponse | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleQuoteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format phone number
    if (name === 'phone') {
      formattedValue = value.replace(/[^\d+\-() ]/g, '');
    }

    // Format ZIP code
    if (name === 'zipCode') {
      formattedValue = value.replace(/[^\d-]/g, '').slice(0, 10);
    }

    // Format vehicle year
    if (name === 'vehicleYear') {
      formattedValue = value.replace(/[^\d]/g, '').slice(0, 4);
    }

    setQuoteData({ ...quoteData, [name]: formattedValue });
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number (digits only)
    if (name === 'cardNumber') {
      formattedValue = value.replace(/[^\d]/g, '').slice(0, 16);
    }

    // Format expiration month (2 digits)
    if (name === 'cardExpMonth') {
      formattedValue = value.replace(/[^\d]/g, '').slice(0, 2);
    }

    // Format expiration year (4 digits)
    if (name === 'cardExpYear') {
      formattedValue = value.replace(/[^\d]/g, '').slice(0, 4);
    }

    // Format CVV (3-4 digits)
    if (name === 'cardCvv') {
      formattedValue = value.replace(/[^\d]/g, '').slice(0, 4);
    }

    setPaymentData({ ...paymentData, [name]: formattedValue });
  };

  const validateSection1 = () => {
    // Check required fields
    if (!quoteData.firstName || !quoteData.lastName || !quoteData.email || 
        !quoteData.phone || !quoteData.street || !quoteData.city || 
        !quoteData.state || !quoteData.zipCode || !quoteData.vehicleYear || 
        !quoteData.vehicleMake || !quoteData.vehicleModel) {
      setError('Please fill in all required fields');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(quoteData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Validate phone format (basic check for digits)
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    if (!phoneRegex.test(quoteData.phone)) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return false;
    }

    // Validate ZIP code (5 or 9 digits)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(quoteData.zipCode)) {
      setError('Please enter a valid ZIP code (e.g., 12345 or 12345-6789)');
      return false;
    }

    // Validate vehicle year
    const currentYear = new Date().getFullYear();
    const year = parseInt(quoteData.vehicleYear);
    if (isNaN(year) || year < 1900 || year > currentYear + 1) {
      setError(`Please enter a valid vehicle year (1900-${currentYear + 1})`);
      return false;
    }

    setError('');
    return true;
  };

  const validateSection2 = () => {
    // Check required fields
    if (!paymentData.cardNumber || !paymentData.cardExpMonth || 
        !paymentData.cardExpYear || !paymentData.cardCvv) {
      setError('Please fill in all payment fields');
      return false;
    }

    // Validate card number (13-19 digits)
    const cardRegex = /^\d{13,19}$/;
    if (!cardRegex.test(paymentData.cardNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid card number (13-19 digits)');
      return false;
    }

    // Validate expiration month (01-12)
    const month = parseInt(paymentData.cardExpMonth);
    if (isNaN(month) || month < 1 || month > 12) {
      setError('Please enter a valid expiration month (01-12)');
      return false;
    }

    // Validate expiration year (current year or future)
    const currentYear = new Date().getFullYear();
    const year = parseInt(paymentData.cardExpYear);
    if (isNaN(year) || year < currentYear || year > currentYear + 20) {
      setError(`Please enter a valid expiration year (${currentYear}-${currentYear + 20})`);
      return false;
    }

    // Check if card is expired
    const currentMonth = new Date().getMonth() + 1;
    if (year === currentYear && month < currentMonth) {
      setError('Card has expired. Please use a valid card');
      return false;
    }

    // Validate CVV (3-4 digits)
    const cvvRegex = /^\d{3,4}$/;
    if (!cvvRegex.test(paymentData.cardCvv)) {
      setError('Please enter a valid CVV (3-4 digits)');
      return false;
    }

    setError('');
    return true;
  };

  const handleGetQuote = async () => {
    if (!validateSection1()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/quote`, {
        first_name: quoteData.firstName,
        last_name: quoteData.lastName,
        email: quoteData.email,
        phone: quoteData.phone,
        address: {
          street: quoteData.street,
          city: quoteData.city,
          state: quoteData.state,
          zip_code: quoteData.zipCode,
        },
        vehicle: {
          year: parseInt(quoteData.vehicleYear),
          make: quoteData.vehicleMake,
          model: quoteData.vehicleModel,
          vin: quoteData.vehicleVin || undefined,
        },
      });

      setQuoteResponse(response.data);
      setCurrentSection(2);
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        // Handle Pydantic validation errors
        const errorMessages = errorDetail.map((e: any) => e.msg).join(', ');
        setError(`Validation error: ${errorMessages}`);
      } else if (typeof errorDetail === 'string') {
        setError(errorDetail);
      } else {
        setError('Failed to get quote. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBindPolicy = async () => {
    if (!validateSection2()) return;
    if (!quoteResponse) return;

    setLoading(true);
    setError('');

    try {
      // Step 1: Create payment method
      const paymentResponse = await axios.post(`${API_BASE_URL}/payment-method`, {
        quote_id: quoteResponse.quote_id,
        type: 'card',
        card_number: paymentData.cardNumber,
        card_exp_month: parseInt(paymentData.cardExpMonth),
        card_exp_year: parseInt(paymentData.cardExpYear),
        card_cvv: paymentData.cardCvv,
      });

      // Step 2: Bind policy
      const bindResponse = await axios.post(`${API_BASE_URL}/bind`, {
        quote_id: quoteResponse.quote_id,
        payment_method_id: paymentResponse.data.payment_method_id,
      });

      setPolicyResponse(bindResponse.data);
      setCurrentSection(3);
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        // Handle Pydantic validation errors
        const errorMessages = errorDetail.map((e: any) => e.msg).join(', ');
        setError(`Validation error: ${errorMessages}`);
      } else if (typeof errorDetail === 'string') {
        setError(errorDetail);
      } else {
        setError('Failed to bind policy. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Get Your Insurance Quote</h1>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`flex-1 text-center ${currentSection >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${currentSection >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                  1
                </div>
                <p className="mt-2 text-sm">Customer Info</p>
              </div>
              <div className={`flex-1 h-1 ${currentSection >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex-1 text-center ${currentSection >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${currentSection >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                  2
                </div>
                <p className="mt-2 text-sm">Payment Info</p>
              </div>
              <div className={`flex-1 h-1 ${currentSection >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex-1 text-center ${currentSection >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${currentSection >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                  3
                </div>
                <p className="mt-2 text-sm">Confirmation</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Section 1: Customer Information */}
          {currentSection === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={quoteData.firstName}
                    onChange={handleQuoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={quoteData.lastName}
                    onChange={handleQuoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={quoteData.email}
                    onChange={handleQuoteInputChange}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={quoteData.phone}
                    onChange={handleQuoteInputChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-6">Address</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  name="street"
                  value={quoteData.street}
                  onChange={handleQuoteInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={quoteData.city}
                    onChange={handleQuoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={quoteData.state}
                    onChange={handleQuoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={quoteData.zipCode}
                    onChange={handleQuoteInputChange}
                    placeholder="12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-6">Vehicle Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <input
                    type="text"
                    name="vehicleYear"
                    value={quoteData.vehicleYear}
                    onChange={handleQuoteInputChange}
                    placeholder="2024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                  <input
                    type="text"
                    name="vehicleMake"
                    value={quoteData.vehicleMake}
                    onChange={handleQuoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input
                    type="text"
                    name="vehicleModel"
                    value={quoteData.vehicleModel}
                    onChange={handleQuoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN (Optional)</label>
                  <input
                    type="text"
                    name="vehicleVin"
                    value={quoteData.vehicleVin}
                    onChange={handleQuoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>
              </div>

              <button
                onClick={handleGetQuote}
                disabled={loading}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Getting Quote...' : 'Get Quote'}
              </button>
            </div>
          )}

          {/* Section 2: Payment Information */}
          {currentSection === 2 && quoteResponse && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Quote</h3>
                <p className="text-3xl font-bold text-blue-600">${quoteResponse.premium_amount.toFixed(2)}</p>
                <p className="text-sm text-gray-600 mt-1">Annual Premium</p>
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number *</label>
                <input
                  type="text"
                  name="cardNumber"
                  value={paymentData.cardNumber}
                  onChange={handlePaymentInputChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength={16}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exp Month *</label>
                  <input
                    type="text"
                    name="cardExpMonth"
                    value={paymentData.cardExpMonth}
                    onChange={handlePaymentInputChange}
                    placeholder="MM"
                    maxLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exp Year *</label>
                  <input
                    type="text"
                    name="cardExpYear"
                    value={paymentData.cardExpYear}
                    onChange={handlePaymentInputChange}
                    placeholder="YYYY"
                    maxLength={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV *</label>
                  <input
                    type="text"
                    name="cardCvv"
                    value={paymentData.cardCvv}
                    onChange={handlePaymentInputChange}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setCurrentSection(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleBindPolicy}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Processing...' : 'Bind Policy'}
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Confirmation */}
          {currentSection === 3 && policyResponse && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Policy Bound Successfully!</h2>
                <p className="text-gray-600">Your insurance policy is now active</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-600">Policy Number:</span>
                  <span className="font-semibold text-gray-900">{policyResponse.policy_number}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-600">Policy ID:</span>
                  <span className="font-semibold text-gray-900">{policyResponse.policy_id}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-600">Effective Date:</span>
                  <span className="font-semibold text-gray-900">{policyResponse.effective_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Annual Premium:</span>
                  <span className="font-semibold text-green-600 text-xl">${policyResponse.premium_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Next Steps:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>Check your email for policy documents</li>
                  <li>Download your insurance card</li>
                  <li>Save your policy number for future reference</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setCurrentSection(1);
                  setQuoteResponse(null);
                  setPolicyResponse(null);
                  setQuoteData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    vehicleYear: '',
                    vehicleMake: '',
                    vehicleModel: '',
                    vehicleVin: '',
                  });
                  setPaymentData({
                    cardNumber: '',
                    cardExpMonth: '',
                    cardExpYear: '',
                    cardCvv: '',
                  });
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
              >
                Get Another Quote
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
