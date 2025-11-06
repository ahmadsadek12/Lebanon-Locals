# WhiSH Payment Integration Setup

## Merchant Information

**Merchant Phone Number**: +961 81 434 070

This phone number will receive all WhiSH payments from customers booking through Lebanon Locals.

## Integration Steps

### 1. Register WhiSH Merchant Account

1. Visit [WhiSH Money](https://whish.money) or download the WhiSH Money app
2. Register your merchant account using phone: **+961 81 434 070**
3. Complete merchant verification process
4. Obtain your merchant credentials:
   - API Key
   - Merchant ID
   - Secret Key (if required)

### 2. API Configuration

The WhiSH integration uses the following endpoints:

- **Production**: `https://whish.money/itel-service/api`
- **Sandbox**: `https://lb.sandbox.whish.money/itel-service/api`

### 3. Implementation Files

**Backend API Files**:
- `public/backend/api/whish-send-otp.php` - Sends OTP to customer
- `public/backend/api/create-booking.php` - Processes payment after OTP verification

**Frontend Files**:
- `public/checkout.html` - Checkout page with WhiSH payment option
- `public/assets/js/checkout.js` - WhiSH payment flow logic

### 4. Payment Flow

1. **Customer initiates booking**:
   - Selects WhiSH payment method
   - Enters their phone number

2. **OTP Request** (`whish-send-otp.php`):
   - System sends OTP to customer's phone
   - Customer receives OTP in WhiSH app
   - Customer enters OTP code

3. **Payment Processing** (`create-booking.php`):
   - System verifies OTP
   - Payment transfers to merchant phone: **+961 81 434 070**
   - Booking confirmed

### 5. Environment Variables

Add to `.env` file (when you receive credentials):

```env
WHISH_API_KEY=your_api_key_here
WHISH_MERCHANT_ID=your_merchant_id_here
WHISH_MERCHANT_PHONE=+96181434070
WHISH_ENVIRONMENT=production  # or 'sandbox' for testing
```

### 6. Testing

**Sandbox Testing**:
1. Use sandbox API endpoint for development
2. Test with sandbox credentials
3. Verify payment flow without real money

**Production**:
1. Switch to production endpoint
2. Use production credentials
3. Monitor transactions on merchant phone

## Current Status

⚠️ **TEMPORARY IMPLEMENTATION**: Currently using simulated responses for development.

To activate real WhiSH payments:
1. Complete merchant registration
2. Add API credentials to `.env`
3. Uncomment and configure the API calls in:
   - `whish-send-otp.php` (line 50-83)
   - `create-booking.php` (line 125-133)

## Support

- **WhiSH Support**: Contact through WhiSH Money app or website
- **Technical Issues**: Check `public/backend/api/whish-send-otp.php` for integration code
- **Payment Tracking**: All transactions will appear in the WhiSH app for phone +961 81 434 070

## Security Notes

- Never commit API keys to version control
- Store credentials in `.env` file
- Keep merchant phone number secure
- Monitor transactions regularly
- Enable two-factor authentication on WhiSH account
