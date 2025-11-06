# Whish Payment Integration Guide
## Lebanon Locals - Complete Implementation

### 📌 Overview
This guide covers the complete Whish payment integration for Lebanon Locals platform, based on **Whish API Documentation v1.3 (October 2025)**.

---

## 🔧 Setup & Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Whish Payment Gateway Configuration
WHISH_ENVIRONMENT=sandbox
WHISH_CHANNEL=14802124
WHISH_SECRET=32c192dda3d54ea98ca005e521cf62e0
WHISH_WEBSITE_URL=http://localhost:8080
```

**Production Credentials**: Contact Whish support to get production credentials.

---

### 2. API Endpoints

| Environment | Base URL |
|-------------|----------|
| **Sandbox** | `https://lb.sandbox.whish.money/itel-service/api/` |
| **Production** | `https://whish.money/itel-service/api/` |

**Required Headers for All Requests:**
```
Content-Type: application/json
channel: <your_channel_id>
secret: <your_secret_key>
websiteurl: <your_website_url>
```

---

## 🔄 Payment Flow

### Complete User Journey

```
1. User selects Whish payment method on checkout
   ↓
2. Frontend calls: POST /backend/api/whish-create-payment.php
   Body: { amount, description, booking_id }
   ↓
3. Backend calls Whish API: POST /payment/whish
   Returns: { collectUrl: "https://whish.money/pay/8nQS2mL" }
   ↓
4. User redirected to collectUrl (Whish payment page)
   ↓
5. User enters phone number + OTP in Whish app
   ↓
6. Whish processes payment
   ↓
7. Whish calls our callback: GET /backend/api/whish-callback.php?status=success&booking_id=123
   ↓
8. Our backend updates booking status to "completed"
   ↓
9. User redirected to: /whish-payment-success.html?booking_id=123
   ↓
10. Success page checks status: POST /backend/api/whish-check-status.php
    Body: { external_id, currency }
    ↓
11. Displays confirmation to user
```

---

## 📁 Files Created/Modified

### Backend API Files

#### 1. `/backend/api/whish-create-payment.php`
**Purpose**: Creates a Whish payment session

**Request**:
```json
POST /backend/api/whish-create-payment.php
{
  "amount": 150.00,
  "description": "Lebanon Locals Booking #123",
  "booking_id": 123
}
```

**Response**:
```json
{
  "success": true,
  "redirect_url": "https://whish.money/pay/8nQS2mL",
  "external_id": 1231704112800,
  "transaction_id": 1231704112800
}
```

**Whish API Call**:
```json
POST https://lb.sandbox.whish.money/itel-service/api/payment/whish
Headers:
  Content-Type: application/json
  channel: 14802124
  secret: 32c192dda3d54ea98ca005e521cf62e0
  websiteurl: http://localhost:8080

Body:
{
  "amount": 150.00,
  "currency": "USD",
  "invoice": "Lebanon Locals Booking #123",
  "externalId": 1231704112800,
  "successCallbackUrl": "http://localhost:8080/backend/api/whish-callback.php?status=success&booking_id=123",
  "failureCallbackUrl": "http://localhost:8080/backend/api/whish-callback.php?status=failure&booking_id=123",
  "successRedirectUrl": "http://localhost:8080/whish-payment-success.html?booking_id=123",
  "failureRedirectUrl": "http://localhost:8080/whish-payment-cancel.html?booking_id=123"
}
```

---

#### 2. `/backend/api/whish-callback.php`
**Purpose**: Receives payment status callbacks from Whish (server-to-server)

**Whish Calls**:
```
GET /backend/api/whish-callback.php?status=success&booking_id=123
```

**Actions**:
- Updates booking `payment_status` to `'completed'` or `'failed'`
- Logs callback data to `/logs/whish-callbacks.log`
- Returns 200 OK to Whish

---

#### 3. `/backend/api/whish-check-status.php`
**Purpose**: Manually checks payment status

**Request**:
```json
POST /backend/api/whish-check-status.php
{
  "external_id": 1231704112800,
  "currency": "USD"
}
```

**Response**:
```json
{
  "success": true,
  "status": "success",
  "payer_phone": "96170902894",
  "external_id": 1231704112800
}
```

**Whish API Call**:
```json
POST https://lb.sandbox.whish.money/itel-service/api/payment/collect/status
Headers:
  Content-Type: application/json
  channel: 14802124
  secret: 32c192dda3d54ea98ca005e521cf62e0
  websiteurl: http://localhost:8080

Body:
{
  "currency": "USD",
  "externalId": 1231704112800
}
```

---

### Frontend Pages

#### 1. `/whish-payment-success.html`
**Purpose**: User lands here after successful payment

**Features**:
- Displays success message
- Shows booking ID
- Calls `whish-check-status.php` to verify payment
- Redirects to booking confirmation

---

#### 2. `/whish-payment-cancel.html`
**Purpose**: User lands here after failed/cancelled payment

**Features**:
- Displays failure message
- Provides option to retry payment
- Link back to booking page

---

## 🧪 Testing

### Sandbox Testing

**Test Credentials (Sandbox)**:
- ✅ **Success Case**:
  - Phone: `96170902894`
  - OTP: `111111`

- ❌ **Failure Case**:
  - Any phone number + wrong OTP

**Note**: Real OTP is NOT sent in sandbox mode.

### Test the Complete Flow

1. **Start Local Server**:
```bash
php -S 127.0.0.1:8080 -t public
```

2. **Go to Checkout Page**:
```
http://localhost:8080/checkout.html?id=1&type=stay
```

3. **Select Whish Payment**

4. **Enter Test Amount**: e.g., $50

5. **Click "Pay with Whish"**

6. **You'll be redirected to Whish Payment Page**:
```
https://whish.money/pay/8nQS2mL
```

7. **Enter Test Phone**: `96170902894`

8. **Enter OTP**: `111111`

9. **Submit Payment**

10. **Verify Redirect**: Should go to `/whish-payment-success.html`

11. **Check Database**:
```sql
SELECT * FROM bookings WHERE id = 123;
-- payment_status should be 'completed'
```

12. **Check Callback Log**:
```bash
cat public/logs/whish-callbacks.log
```

---

## 🔍 API Response Codes

### Whish API Responses

**Success Response**:
```json
{
  "status": true,
  "code": null,
  "dialog": null,
  "extra": null,
  "data": {
    "collectUrl": "https://whish.money/pay/8nQS2mL"
  }
}
```

**Error Response**:
```json
{
  "status": false,
  "code": "AUTH_ERROR",
  "dialog": "Authentication failed",
  "extra": null,
  "data": null
}
```

### Payment Status Values

| Status | Description |
|--------|-------------|
| `success` | Payment completed successfully |
| `pending` | Payment initiated but not completed |
| `failed` | Payment failed |
| `cancelled` | Payment cancelled by user |

---

## 🚀 Going to Production

### Steps to Enable Live Mode

1. **Get Production Credentials**:
   - Contact Whish support
   - Request production `channel` and `secret`
   - Get your account verified

2. **Update `.env`**:
```env
WHISH_ENVIRONMENT=production
WHISH_CHANNEL=<your_production_channel>
WHISH_SECRET=<your_production_secret>
WHISH_WEBSITE_URL=https://www.lebanonlocals.com
```

3. **Update Callback URLs**:
   - Ensure your server is publicly accessible
   - Whish needs to reach your callback endpoint
   - Use HTTPS in production

4. **Test with Real Payment**:
   - Use actual Lebanese phone number
   - Make small test transaction ($1)
   - Verify callback is received
   - Check database update

5. **Monitor Logs**:
   - Check `/logs/whish-callbacks.log`
   - Monitor for failed transactions
   - Set up error alerting

---

## 🛡️ Security Considerations

### Important Security Measures

1. **Never expose credentials**:
   - Keep `.env` out of version control
   - Store `WHISH_SECRET` securely
   - Use environment variables only

2. **Validate Callbacks**:
   - Verify callback comes from Whish IP addresses
   - Log all callback attempts
   - Check external_id matches your records

3. **Use HTTPS in Production**:
   - Whish requires HTTPS for production
   - Encrypt all API communication
   - Validate SSL certificates

4. **Implement Rate Limiting**:
   - Prevent payment spam
   - Limit API calls per user
   - Block suspicious activity

5. **Double-Check Payment Status**:
   - Always verify with `whish-check-status.php`
   - Don't trust redirect-only confirmation
   - Cross-reference with database

---

## 📊 Database Schema

### Required Table Columns

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_external_id BIGINT;
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue 1: "Whish not configured"
**Solution**: Check `.env` file has `WHISH_CHANNEL` and `WHISH_SECRET`

#### Issue 2: "Authentication failed"
**Solution**: Verify credentials are correct, try sandbox mode first

#### Issue 3: "No collect URL returned"
**Solution**: Check Whish API response in logs, verify request format

#### Issue 4: Callback not received
**Solution**:
- Check callback URL is publicly accessible
- Verify firewall allows Whish IPs
- Check `/logs/whish-callbacks.log`

#### Issue 5: Payment succeeds but status stays "pending"
**Solution**:
- Check callback handler is working
- Verify database connection
- Check booking ID is correct

---

## 📞 Support

### Get Help

**Whish Support**:
- Website: https://whish.money
- Email: support@whish.money
- Phone: Contact via Whish app

**Lebanon Locals Support**:
- Email: info@lebanonlocals.com
- Phone: +961 81 434 070

---

## 📝 Additional Resources

### Official Documentation
- [Whish API Documentation v1.3](./Whish_API_Documentation.md)
- [Payment Integration Overview](./PAYMENT_INTEGRATION.md)

### Useful Links
- Whish Dashboard: https://whish.money/dashboard
- Whish Sandbox: https://sandbox.whish.money

---

**Last Updated**: January 2025
**Version**: 1.0.0
**API Version**: Whish API v1.3 (October 2025)
