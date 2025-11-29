# Checkout.html Improvements

## Current Issues

1. **Duplicate Order Summary** - Same summary appears in both left and right columns
2. **Stripe.js Always Loads** - Loads even when user selects cash/whish
3. **No Guest Checkout** - Requires login
4. **Payment Method Selection** - Could be more prominent
5. **No Auto-fill** - Doesn't use logged-in user's info
6. **No Progress Indicator** - User doesn't know where they are in process

## Recommended Improvements

### 1. Remove Duplicate Summary
- Keep summary only in right column (desktop)
- Move to bottom on mobile
- Remove from left column entirely

### 2. Conditional Script Loading
```javascript
// Only load Stripe when card payment selected
document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
    radio.addEventListener('change', function() {
        if (this.value === 'card' && !window.Stripe) {
            loadStripe();
        }
    });
});

function loadStripe() {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => initializeStripe();
    document.head.appendChild(script);
}
```

### 3. Guest Checkout
- Add "Continue as Guest" button
- Show email/phone form for guests
- Store booking with guest info (no user_id)

### 4. Better Payment UX
- Larger payment method cards
- Icons more visible
- Selected state more obvious
- Add payment method descriptions

### 5. Auto-fill from Profile
```javascript
// Pre-fill from logged-in user
if (currentUser) {
    document.getElementById('contact-email').value = currentUser.email || '';
    document.getElementById('contact-phone').value = currentUser.phone_number || '';
}
```

### 6. Progress Indicator
```html
<div class="checkout-progress">
    <div class="progress-step active">1. Booking Details</div>
    <div class="progress-step">2. Payment</div>
    <div class="progress-step">3. Review</div>
</div>
```

### 7. Form Validation
- Real-time validation
- Better error messages
- Phone number format validation
- Email format validation

### 8. Security Improvements
- Add CSRF token
- Validate payment on server
- Secure payment data handling

