# Security and Performance Fixes - Implementation Guide

## 1. CORS Fix

### Step 1: Create CORS Helper
✅ Already created: `public/backend/config/cors.php`

### Step 2: Update All API Files

**Pattern to replace:**
```php
header('Access-Control-Allow-Origin: *');
```

**Replace with:**
```php
require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();
```

**Quick find/replace command:**
```bash
# Find all files with CORS *
grep -r "Access-Control-Allow-Origin: \*" public/backend/api/

# Then update each file manually or use sed
```

### Step 3: Add to .env
```env
ALLOWED_ORIGINS=https://www.lebanonlocals.com,https://lebanonlocals.com
```

---

## 2. Rate Limiting

### Step 1: Create Database Table
```bash
mysql -u root -p lebanon_locals < public/backend/scripts/create-rate-limits-table.sql
```

### Step 2: Update Login/Register APIs

**Before:**
```php
// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);
```

**After:**
```php
require_once __DIR__ . '/../config/rate-limiter.php';

$database = new Database();
$db = $database->getConnection();

// Rate limit: 5 attempts per 15 minutes per IP
$rateLimiter = new RateLimiter($db, 5, 900);
$rateLimiter->checkLimit(null, 'login'); // Use IP if no user

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);
```

### Step 3: Different Limits for Different Endpoints
```php
// Login: 5 per 15 minutes
$rateLimiter = new RateLimiter($db, 5, 900);

// Register: 3 per hour
$rateLimiter = new RateLimiter($db, 3, 3600);

// General API: 60 per minute
$rateLimiter = new RateLimiter($db, 60, 60);
```

---

## 3. Error Disclosure Fix

### Step 1: Update database.php

**Replace:**
```php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
```

**With:**
```php
require_once __DIR__ . '/error-handler.php';
setupErrorHandling();
```

### Step 2: Update All API Error Handling

**Before:**
```php
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
```

**After:**
```php
} catch (Exception $e) {
    handleApiError($e);
}
```

### Step 3: Add to .env
```env
APP_ENV=production
```

---

## 4. Large Bundles Fix

### Option A: Conditional Loading (Recommended)

**Create: `public/assets/js/conditional-loader.js`**
```javascript
(function() {
    'use strict';
    
    // Only load GSAP if needed
    if (document.querySelector('#hero') || document.querySelector('.gsap-animation')) {
        const gsapScript = document.createElement('script');
        gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
        gsapScript.async = true;
        document.head.appendChild(gsapScript);
        
        gsapScript.onload = () => {
            const scrollTriggerScript = document.createElement('script');
            scrollTriggerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';
            scrollTriggerScript.async = true;
            document.head.appendChild(scrollTriggerScript);
        };
    }
    
    // Only load jQuery if needed (check for jQuery-dependent code)
    if (document.querySelector('.bootstrap-modal') || document.querySelector('[data-toggle]')) {
        const jqueryScript = document.createElement('script');
        jqueryScript.src = 'js/jquery-3.5.0.js';
        jqueryScript.async = true;
        document.head.appendChild(jqueryScript);
        
        jqueryScript.onload = () => {
            const bootstrapScript = document.createElement('script');
            bootstrapScript.src = 'js/bootstrap.min.js';
            bootstrapScript.async = true;
            document.head.appendChild(bootstrapScript);
        };
    }
})();
```

**Update index.html:**
```html
<!-- Remove these -->
<!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script> -->
<!-- <script src="js/jquery-3.5.0.js"></script> -->

<!-- Add this -->
<script src="assets/js/conditional-loader.js"></script>
```

### Option B: Remove Unused Libraries

**Check jQuery usage:**
```bash
grep -r "\$(" public/assets/js/ | wc -l
grep -r "jQuery" public/assets/js/ | wc -l
```

If low usage, replace with vanilla JS.

---

## 5. Image Optimization

### Step 1: Update S3Uploader to Optimize

**Add to `public/backend/utils/S3Uploader.php`:**
```php
require_once __DIR__ . '/ImageOptimizer.php';

public static function uploadAndOptimize($localTmpPath, $key, $contentType) {
    // Optimize before upload
    $optimizedPath = sys_get_temp_dir() . '/' . uniqid() . '.webp';
    $result = ImageOptimizer::optimizeAndConvert($localTmpPath, $optimizedPath, 85);
    
    if ($result && isset($result['webp'])) {
        // Upload WebP version
        $webpKey = str_replace(['.jpg', '.jpeg', '.png'], '.webp', $key);
        self::uploadFile($result['webp'], $webpKey, 'image/webp');
        
        // Also upload fallback JPEG
        if (isset($result['fallback'])) {
            self::uploadFile($result['fallback'], $key, 'image/jpeg');
        }
        
        return [
            'webp' => self::getPublicUrl($webpKey),
            'fallback' => self::getPublicUrl($key)
        ];
    }
    
    // Fallback to regular upload
    return self::uploadFile($localTmpPath, $key, $contentType);
}
```

### Step 2: Update Frontend to Use WebP

**In `details.js` or image rendering:**
```javascript
function getOptimizedImageUrl(originalUrl) {
    if (!originalUrl) return 'images/default_image.png';
    
    // Check WebP support
    const supportsWebP = document.createElement('canvas')
        .toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (supportsWebP) {
        return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    
    return originalUrl;
}
```

### Step 3: Use Responsive Images

```html
<picture>
    <source srcset="image-800w.webp" media="(max-width: 768px)" type="image/webp">
    <source srcset="image-1200w.webp" media="(min-width: 769px)" type="image/webp">
    <source srcset="image-800w.jpg" media="(max-width: 768px)" type="image/jpeg">
    <img src="image-1200w.jpg" alt="Listing" loading="lazy" width="1200" height="900">
</picture>
```

---

## 6. Service Worker

### Step 1: Create Service Worker
✅ Already created: `public/sw.js`

### Step 2: Register in index.html

**Add before closing `</body>`:**
```html
<script>
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => {
                console.log('[SW] Registered:', reg.scope);
            })
            .catch(err => {
                console.log('[SW] Registration failed:', err);
            });
    });
}
</script>
```

### Step 3: Update Cache Version
When you update assets, change `CACHE_NAME` in `sw.js` to force cache refresh.

---

## Quick Implementation Checklist

### Security (Do First)
- [ ] Update all APIs to use `cors.php` instead of `*`
- [ ] Create `rate_limits` table
- [ ] Add rate limiting to login.php and register.php
- [ ] Update database.php to use error-handler.php
- [ ] Set `APP_ENV=production` in .env

### Performance (Do Next)
- [ ] Create conditional-loader.js
- [ ] Remove GSAP/jQuery from pages that don't need them
- [ ] Register service worker in index.html
- [ ] Update image upload to use ImageOptimizer
- [ ] Add WebP support detection in frontend

### UX Improvements (Do After)
- [ ] Implement wizard for posting.html
- [ ] Improve checkout.html (remove duplicates, conditional loading)
- [ ] Add progress indicators
- [ ] Implement draft saving

---

## Testing

### Test CORS
```bash
curl -H "Origin: https://evil.com" http://localhost:8080/backend/api/login.php
# Should reject or only allow specific origins
```

### Test Rate Limiting
```bash
# Make 6 requests quickly
for i in {1..6}; do
    curl -X POST http://localhost:8080/backend/api/login.php \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"test"}'
done
# 6th should return 429
```

### Test Error Handling
```bash
# Should not show file paths or stack traces in production
curl http://localhost:8080/backend/api/nonexistent.php
```

### Test Service Worker
1. Open DevTools → Application → Service Workers
2. Check if registered
3. Go offline
4. Try to load page - should work from cache

