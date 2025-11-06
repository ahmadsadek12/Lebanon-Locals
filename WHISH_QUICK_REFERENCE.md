# Whish Payment - Quick Reference Card

## 🚀 Quick Start

### 1. Environment Setup
```env
WHISH_ENVIRONMENT=sandbox
WHISH_CHANNEL=14802124
WHISH_SECRET=32c192dda3d54ea98ca005e521cf62e0
WHISH_WEBSITE_URL=http://localhost:8080
```

### 2. Test in Sandbox
- **Phone**: `96170902894`
- **OTP**: `111111`
- **Result**: ✅ Success

---

## 📡 API Endpoints Summary

### Create Payment
```javascript
POST /backend/api/whish-create-payment.php
{
  "amount": 150.00,
  "description": "Booking #123",
  "booking_id": 123
}
// Returns: { redirect_url, external_id }
```

### Check Status
```javascript
POST /backend/api/whish-check-status.php
{
  "external_id": 1231704112800,
  "currency": "USD"
}
// Returns: { status: "success|pending|failed" }
```

### Callback Handler
```
GET /backend/api/whish-callback.php?status=success&booking_id=123
// Auto-updates database
```

---

## 🔄 Payment Flow Diagram

```
User Checkout
     ↓
Create Payment (Backend)
     ↓
Redirect to Whish (collectUrl)
     ↓
User Pays in Whish App
     ↓
Whish Calls Callback (Backend)
     ↓
Update Database
     ↓
Redirect to Success Page
     ↓
Verify Status
     ↓
Show Confirmation
```

---

## 🗂️ Files Overview

| File | Purpose |
|------|---------|
| `whish-create-payment.php` | Create payment session |
| `whish-check-status.php` | Check payment status |
| `whish-callback.php` | Receive Whish callbacks |
| `whish-payment-success.html` | Success redirect page |
| `whish-payment-cancel.html` | Failure redirect page |
| `logs/whish-callbacks.log` | Callback logging |

---

## 🧪 Test Commands

### 1. Start Server
```bash
php -S 127.0.0.1:8080 -t public
```

### 2. Test Create Payment
```bash
curl -X POST http://localhost:8080/backend/api/whish-create-payment.php \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "description": "Test Booking",
    "booking_id": 999
  }'
```

### 3. Test Check Status
```bash
curl -X POST http://localhost:8080/backend/api/whish-check-status.php \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": 9991704112800,
    "currency": "USD"
  }'
```

### 4. View Callback Logs
```bash
cat public/logs/whish-callbacks.log
```

---

## ⚠️ Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Whish not configured" | Check `.env` has WHISH_CHANNEL and WHISH_SECRET |
| "Authentication failed" | Verify credentials are correct |
| Callback not received | Ensure URL is publicly accessible |
| Status stays "pending" | Check callback handler logs |

---

## 🔐 Security Checklist

- [ ] `.env` file not in version control
- [ ] Using HTTPS in production
- [ ] Callback URL is publicly accessible
- [ ] Validating external_id in callbacks
- [ ] Logging all payment attempts
- [ ] Double-checking status before confirming

---

## 📞 Support Contacts

**Whish Technical Support**:
- Support via Whish app
- Email: support@whish.money

**Lebanon Locals**:
- Email: info@lebanonlocals.com
- Phone: +961 81 434 070

---

## 🌐 URLs

### Sandbox
- Base: `https://lb.sandbox.whish.money/itel-service/api/`
- Payment: `https://lb.sandbox.whish.money/itel-service/api/payment/whish`
- Status: `https://lb.sandbox.whish.money/itel-service/api/payment/collect/status`

### Production
- Base: `https://whish.money/itel-service/api/`
- Payment: `https://whish.money/itel-service/api/payment/whish`
- Status: `https://whish.money/itel-service/api/payment/collect/status`

---

**📚 Full Documentation**: See `WHISH_INTEGRATION_GUIDE.md`
**📖 API Reference**: See `Whish_API_Documentation.md`
