# Payment Integration - Lebanon Locals

## ✅ Fully Integrated Payment Methods

### 1. Stripe Credit Card Payments

**Status**: ✅ **FULLY INTEGRATED AND READY**

**Credentials** (Test Mode):
- Publishable Key: `pk_test_Ah4G3SPQmw26w8hLzeADVWFN00LBtdU3x7`
- Secret Key: `sk_test_p86LCSnwIC1rjqL9Rl0ZB4Fq00Be8ULmHu`
- Client ID: `ca_FhQtyGctj6A1vWjrtQvNmpagvWM2XRJh`

**How It Works**:
1. Customer enters card details (name, number, expiry, CVV)
2. Frontend creates Stripe Payment Intent via backend API
3. Stripe securely processes the payment
4. Transaction ID stored in booking record
5. Confirmation sent to customer

**Files**:
- Frontend: `checkout.html`, `checkout.js`
- Backend: `stripe-create-payment-intent.php`
- Credentials: `.env`

**Test Cards**:
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Use any future expiry date and any 3-digit CVV

---

### 2. Whish Mobile Wallet

**Status**: ✅ **FULLY INTEGRATED AND READY**

**Credentials** (Sandbox Mode):
- Channel: `14802124`
- Secret: `32c192dda3d54ea98ca005e521cf62e0`
- Merchant Phone: `+961 81 434 070`

**How It Works**:
1. Customer enters phone number
2. System sends OTP via Whish API
3. Customer receives OTP in Whish app
4. Customer enters OTP to confirm
5. Payment transfers to merchant phone
6. Booking confirmed

**Files**:
- Frontend: `checkout.html`, `checkout.js`
- Backend: `whish-send-otp.php`, `create-booking.php`
- Credentials: `.env`

**API Endpoints**:
- Sandbox: `https://lb.sandbox.whish.money/api/v1/otp/send`
- Production: `https://whish.money/api/v1/otp/send`

---

### 3. Cash Payment

**Status**: ✅ **FULLY INTEGRATED**

**How It Works**:
- Only available if listing has `cash_enabled = true`
- Customer selects cash option
- Booking created with status "pending"
- Customer pays host directly upon arrival
- Host confirms payment manually

---

## Configuration Files

### .env
```env
# Stripe Configuration (Test Mode)
STRIPE_PUBLISHABLE_KEY=pk_test_Ah4G3SPQmw26w8hLzeADVWFN00LBtdU3x7
STRIPE_SECRET_KEY=sk_test_p86LCSnwIC1rjqL9Rl0ZB4Fq00Be8ULmHu
STRIPE_CLIENT_ID=ca_FhQtyGctj6A1vWjrtQvNmpagvWM2XRJh

# Whish Configuration (Sandbox Mode)
WHISH_ENVIRONMENT=sandbox
WHISH_CHANNEL=14802124
WHISH_SECRET=32c192dda3d54ea98ca005e521cf62e0
WHISH_MERCHANT_PHONE=+96181434070
```

---

## Payment Flow

### Stripe Card Payment
```
1. Customer → Checkout Page → Enters card details
2. Frontend → Create Payment Intent API → Backend validates
3. Backend → Stripe API → Creates payment intent
4. Stripe → Returns client secret → Frontend
5. Frontend → Stripe.confirmCardPayment() → Processes payment
6. Stripe → Returns transaction ID → Frontend
7. Frontend → Create Booking API → Saves booking with transaction ID
8. Backend → Database → Stores booking record
9. Customer → Redirected to confirmation page
```

### Whish Payment
```
1. Customer → Checkout Page → Enters phone number
2. Frontend → Send OTP API → Backend
3. Backend → Whish API → Sends OTP to customer's phone
4. Customer → Receives OTP in Whish app → Enters OTP
5. Frontend → Complete Booking → Transaction ID generated
6. Frontend → Create Booking API → Saves booking
7. Backend → Database → Stores booking record
8. Customer → Redirected to confirmation page
```

### Cash Payment
```
1. Customer → Checkout Page → Selects cash
2. Frontend → Create Booking API → Status: pending
3. Backend → Database → Stores booking
4. Customer → Pays host in person
5. Host → Manually confirms payment
```

---

## Testing

### Test Stripe Payment
1. Go to any listing → Click Reserve
2. Enter booking details
3. Select "Credit/Debit Card"
4. Use test card: `4242 4242 4242 4242`
5. Expiry: any future date (e.g., `12/25`)
6. CVV: any 3 digits (e.g., `123`)
7. Complete booking

### Test Whish Payment
1. Go to any listing → Click Reserve
2. Select "Whish"
3. Enter Lebanese phone number (+961...)
4. Click "Send OTP"
5. **Note**: In sandbox mode, OTP may not actually send
6. Enter any 6-digit code
7. Complete booking

### Test Cash Payment
1. Ensure listing has `cash_enabled = 1` in database
2. Go to listing → Click Reserve
3. Cash option will appear
4. Select "Pay with Cash"
5. Complete booking

---

## Going Live

### Stripe - Production Mode
1. Get production keys from Stripe Dashboard
2. Update `.env`:
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   STRIPE_SECRET_KEY=sk_live_xxxxx
   ```
3. Test with real card (small amount)
4. Enable live mode

### Whish - Production Mode
1. Contact Whish to move from sandbox to production
2. Get production credentials
3. Update `.env`:
   ```env
   WHISH_ENVIRONMENT=production
   WHISH_CHANNEL=your_production_channel
   WHISH_SECRET=your_production_secret
   ```
4. Test with real phone number
5. Enable live mode

---

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` file to version control
- Stripe Secret Key must stay on backend only
- Use HTTPS in production
- Validate all payments on backend
- Log all transactions for audit trail
- Monitor for fraudulent activity

---

## Support

**Stripe**: https://stripe.com/docs
**Whish**: Contact Whish support via their app or website
**Issues**: Check error logs in browser console and PHP error logs
