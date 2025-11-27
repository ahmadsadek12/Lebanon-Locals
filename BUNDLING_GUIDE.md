# Asset Bundling Guide

This guide explains how to use the asset bundling system to improve page load performance.

## Overview

The bundling system combines commonly used JavaScript and CSS files into single bundles, reducing HTTP requests and improving load times.

## Bundled Files

### JavaScript Bundle (`assets/bundles/common.js`)
Combines the following files:
- `config.js` - Global configuration
- `load-modals.js` - Modal loading utilities
- `auth.js` - Authentication handling
- `api.js` - API integration layer
- `wishlist.js` - Wishlist functionality
- `notifications.js` - Notification system
- `header.js` - Header navigation
- `load-header-standard.js` - Standardized header loader
- `load-footer.js` - Footer loader

**Size:** ~100 KB (minified)

### CSS Bundle (`assets/bundles/common.css`)
Combines the following files:
- `variables.css` - CSS custom properties
- `auth.css` - Authentication modal styles

**Size:** ~16 KB (minified)

## Usage

### Development
During development, continue using individual files for easier debugging:
```html
<script src="assets/js/config.js"></script>
<script src="assets/js/auth.js"></script>
<!-- etc. -->
```

### Production
For production, replace individual script/style tags with bundles:

**Before:**
```html
<script src="assets/js/config.js"></script>
<script src="assets/js/load-modals.js"></script>
<script src="assets/js/auth.js"></script>
<script src="assets/js/api.js"></script>
<script src="assets/js/wishlist.js"></script>
<script src="assets/js/notifications.js"></script>
<script src="assets/js/header.js"></script>
<script src="assets/js/load-header-standard.js"></script>
<script src="assets/js/load-footer.js"></script>
```

**After:**
```html
<script src="assets/bundles/common.js"></script>
```

**CSS Before:**
```html
<link rel="stylesheet" href="assets/css/variables.css">
<link rel="stylesheet" href="assets/css/auth.css">
```

**CSS After:**
```html
<link rel="stylesheet" href="assets/bundles/common.css">
```

## Generating Bundles

Run the bundling script before deploying:

```bash
python scripts/bundle-assets.py
```

This will:
1. Read all common JavaScript and CSS files
2. Combine them in the correct order
3. Apply basic minification
4. Create bundles in `public/assets/bundles/`

## HTTP Caching

For optimal performance, configure your web server to cache bundles with long expiration times:

### Apache (.htaccess)
```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
    <FilesMatch "\.(js|css)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
</IfModule>
```

### Nginx
```nginx
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### PHP Built-in Server
For development, caching is handled by the browser. For production, use Apache or Nginx.

## Resource Hints

Add preload hints in your HTML `<head>` for critical bundles:

```html
<link rel="preload" href="assets/bundles/common.css" as="style">
<link rel="preload" href="assets/bundles/common.js" as="script">
```

## Versioning

When updating bundles, consider adding version query strings to bust cache:

```html
<script src="assets/bundles/common.js?v=1.0.0"></script>
```

Or use file hashing (recommended for production):
```html
<script src="assets/bundles/common.abc123.js"></script>
```

## Performance Benefits

Using bundles provides:
- **Fewer HTTP requests:** 9 JS files → 1 bundle
- **Better compression:** Larger files compress better
- **Reduced latency:** Single connection vs. multiple
- **Browser caching:** Single file to cache instead of many

## Notes

- Bundles are minified but not obfuscated (readable for debugging)
- Individual files remain available for development
- Bundle order matters - files are combined in the specified sequence
- Always test after bundling to ensure functionality

