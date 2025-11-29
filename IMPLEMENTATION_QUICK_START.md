# Quick Start Implementation Guide

## 1. Security Fixes (Do First - 30 minutes)

### Fix CORS
```bash
# Update all API files to use cors.php
# Find all files:
grep -r "Access-Control-Allow-Origin: \*" public/backend/api/

# Replace in each file:
# OLD: header('Access-Control-Allow-Origin: *');
# NEW: require_once __DIR__ . '/../config/cors.php'; setCorsHeaders();
```

### Fix Error Display
```bash
# Add to .env:
echo "APP_ENV=production" >> .env

# database.php already updated to use error-handler.php
```

### Add Rate Limiting
```bash
# Create table:
mysql -u root -p lebanon_locals < public/backend/scripts/create-rate-limits-table.sql

# Update login.php and register.php (see examples in SECURITY_AND_PERFORMANCE_FIXES.md)
```

---

## 2. Performance Fixes (Do Next - 1 hour)

### Conditional Script Loading
✅ Already created: `public/assets/js/conditional-loader.js`
✅ Already updated: `index.html` and `checkout.html`

### Service Worker
✅ Already created: `public/sw.js`

**Add to index.html (before </body>):**
```html
<script>
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}
</script>
```

### Image Optimization
- Use ImageOptimizer.php in S3Uploader
- Update frontend to detect WebP support
- Convert existing images to WebP

---

## 3. UX Improvements (Do After - 2-3 hours)

### Checkout Improvements
- Remove duplicate summary
- Add guest checkout
- Auto-fill from profile
- Progress indicator

### Posting Wizard
- Break into 6 steps
- Add progress bar
- Implement draft saving
- Better mobile experience

---

## Files Created

✅ `public/backend/config/cors.php` - CORS helper
✅ `public/backend/config/error-handler.php` - Error handling
✅ `public/backend/config/rate-limiter.php` - Rate limiting
✅ `public/backend/scripts/create-rate-limits-table.sql` - Rate limit table
✅ `public/backend/utils/ImageOptimizer.php` - Image optimization
✅ `public/sw.js` - Service worker
✅ `public/assets/js/conditional-loader.js` - Conditional script loading

## Files Updated

✅ `public/backend/config/database.php` - Uses error-handler
✅ `public/backend/api/login.php` - Uses cors.php
✅ `public/backend/api/register.php` - Uses cors.php
✅ `public/index.html` - Conditional loading
✅ `public/checkout.html` - Conditional loading
✅ `public/assets/js/main.js` - Waits for GSAP if conditional loaded

## Next Steps

1. Update remaining API files to use cors.php (find with grep)
2. Add rate limiting to critical endpoints
3. Test service worker registration
4. Implement image optimization in upload flow
5. Build posting wizard (see POSTING_WIZARD_APPROACH.md)
6. Improve checkout (see CHECKOUT_IMPROVEMENTS.md)

