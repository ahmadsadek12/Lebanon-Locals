# Verification Checklist

This document provides a checklist to verify all key flows and features are working correctly after recent improvements.

## Pre-Deployment Checklist

### Asset Bundling
- [ ] Run `python scripts/bundle-assets.py` to generate production bundles
- [ ] Verify `public/assets/bundles/common.js` exists (~100 KB)
- [ ] Verify `public/assets/bundles/common.css` exists (~16 KB)
- [ ] Test pages load correctly with bundles (if using in production)

### Header & Footer
- [ ] Verify header loads on all public pages
- [ ] Verify footer loads on pages with footer placeholder
- [ ] Check auth button shows correct state (Sign In vs Profile)
- [ ] Verify notification bell appears when logged in
- [ ] Test navigation words redirect correctly on index.html
- [ ] Verify no navigation words are highlighted on pages with `hide-nav-words` class

### Authentication Flow
- [ ] Test login on `login.html`
- [ ] Test signup on `signup.html`
- [ ] Verify redirect after successful login/signup
- [ ] Verify user menu modal opens when clicking profile button
- [ ] Test logout functionality
- [ ] Verify auth state persists across page refreshes

### Posting Flow
- [ ] Verify `posting.html` loads correctly
- [ ] Check that `posting.css` and `posting.js` are loaded
- [ ] Test creating an experience posting
- [ ] Test creating an event posting
- [ ] Test creating a stay posting
- [ ] Verify amenity selection works for stays
- [ ] Verify property type dropdown loads from API
- [ ] Test image uploads (main + additional)
- [ ] Verify image categorization (room/category) works
- [ ] Test form validation (required fields, character limits)
- [ ] Verify redirect to `my-host.html` after successful posting

### Edit Posting Flow
- [ ] Verify `edit-posting.html` loads correctly
- [ ] Test editing an experience
- [ ] Test editing an event
- [ ] Test editing a stay
- [ ] Verify amenities are pre-selected correctly
- [ ] Test updating images
- [ ] Verify changes save correctly

### Collections & Search
- [ ] Test `collections.html` loads with correct type parameter
- [ ] Verify filtering by location works
- [ ] Verify filtering by dates works
- [ ] Verify filtering by guests works
- [ ] Test subtype filtering
- [ ] Test amenity filtering (for stays)
- [ ] Verify pagination works
- [ ] Test sorting options

### Details Pages
- [ ] Test `details.html` loads listing details
- [ ] Verify amenities display correctly for stays
- [ ] Test image gallery functionality
- [ ] Verify booking/reserve button works
- [ ] Test wishlist heart button
- [ ] Verify map displays (if applicable)

### Checkout Flow
- [ ] Test navigating to checkout from details page
- [ ] Verify booking details display correctly
- [ ] Test payment method selection
- [ ] Verify form validation works
- [ ] Test successful booking creation
- [ ] Verify redirect to confirmation page

### Booking Confirmation
- [ ] Verify `booking-confirmation.html` displays booking details
- [ ] Test "Back to Home" button
- [ ] Verify notification is created for host/admin

### Notifications
- [ ] Verify notification bell appears in header when logged in
- [ ] Test notification count updates
- [ ] Verify notifications load when clicking bell
- [ ] Test notification deletion (X button)
- [ ] Verify read/unread states display correctly
- [ ] Test notification routing (clicking notification)

### My Host Dashboard
- [ ] Verify `my-host.html` loads for hosts/admins
- [ ] Test listing management (view, edit, delete)
- [ ] Verify bookings display correctly
- [ ] Test accept/reject booking functionality
- [ ] Verify notifications appear for pending bookings

### View Details (Host)
- [ ] Verify `view-details.html` loads for hosts/admins
- [ ] Test accept/reject buttons for pending bookings
- [ ] Verify booking details display correctly

### Wishlist
- [ ] Test adding items to wishlist
- [ ] Test removing items from wishlist
- [ ] Verify wishlist count updates in header
- [ ] Test `wishlist.html` page loads correctly
- [ ] Verify filtering by type works

### User Profile
- [ ] Test `user-profile.html` loads correctly
- [ ] Verify profile information displays
- [ ] Test editing profile
- [ ] Verify bookings tab shows user bookings
- [ ] Test reviews tab

### Reviews
- [ ] Test `review.html` page loads for past bookings
- [ ] Verify review submission works
- [ ] Test `listing-reviews.html` displays reviews
- [ ] Test `host-reviews.html` displays host reviews

### Form Validation
- [ ] Test inline errors appear on form fields
- [ ] Verify errors clear when user starts typing
- [ ] Test real-time validation (email, phone, etc.)
- [ ] Verify error summary box appears for multiple errors
- [ ] Test success states display correctly

### Skeleton Loading
- [ ] Verify skeleton cards appear on `index.html` while loading
- [ ] Test skeleton disappears when content loads
- [ ] Verify skeleton components are responsive

### Client-Side Caching
- [ ] Verify amenities load from cache on `posting.html`
- [ ] Verify property types load from cache
- [ ] Test cache expiration (6 hours TTL)
- [ ] Verify cache updates when data changes

### API Endpoints
- [ ] Test `/backend/api/experiences.php`
- [ ] Test `/backend/api/events.php`
- [ ] Test `/backend/api/stays.php`
- [ ] Test `/backend/api/amenities.php`
- [ ] Test `/backend/api/property-types.php`
- [ ] Test `/backend/api/subtypes.php`
- [ ] Verify all endpoints return proper JSON structure
- [ ] Test error handling (404, 500, etc.)

### Responsive Design
- [ ] Test on mobile devices (< 768px)
- [ ] Test on tablets (768px - 1024px)
- [ ] Test on desktop (> 1024px)
- [ ] Verify header is responsive
- [ ] Verify forms are responsive
- [ ] Test skeleton components on mobile

### Browser Compatibility
- [ ] Test in Chrome/Edge (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (if available)
- [ ] Verify JavaScript errors in console
- [ ] Check for CSS rendering issues

### Performance
- [ ] Run Lighthouse audit
- [ ] Verify page load times are acceptable
- [ ] Check bundle sizes are reasonable
- [ ] Verify images are optimized
- [ ] Test with slow network (throttle in DevTools)

## Post-Deployment Verification

### Production Checks
- [ ] Verify bundles are being served (if using)
- [ ] Check HTTP caching headers are set correctly
- [ ] Verify CDN is serving static assets (if applicable)
- [ ] Test SSL certificate is valid
- [ ] Verify database connection works
- [ ] Test S3 image uploads work
- [ ] Verify environment variables are set correctly

### Monitoring
- [ ] Check error logs for any issues
- [ ] Monitor API response times
- [ ] Verify notification system is working
- [ ] Check booking creation is working
- [ ] Monitor user authentication flow

## Known Issues to Watch

1. **Header Loading**: Some pages may need retry logic if header loads slowly
2. **Cache Invalidation**: Client-side cache may need manual clearing if data changes
3. **Image Uploads**: S3 uploads require proper AWS credentials in `.env`
4. **Notifications**: Ensure `notifications` table has correct schema (`from`, `to` columns)

## Quick Test Commands

```bash
# Test API endpoints
curl http://localhost:8080/backend/api/experiences.php
curl http://localhost:8080/backend/api/stays.php
curl http://localhost:8080/backend/api/amenities.php

# Check bundle generation
python scripts/bundle-assets.py

# Verify file structure
ls -la public/assets/bundles/
ls -la public/assets/css/
ls -la public/assets/js/
```

## Notes

- Run this checklist after major updates
- Update checklist as new features are added
- Document any issues found during verification
- Keep checklist synchronized with actual features

