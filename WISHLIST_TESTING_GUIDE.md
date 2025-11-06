# Wishlist Testing Guide

## Quick Start

### 1. Start the Server
```bash
php -S 127.0.0.1:8080 -t public
```

### 2. Test the API
Visit: http://localhost:8080/test-wishlist.php

This will run automated tests for:
- GET wishlist items
- POST add item to wishlist
- DELETE remove item from wishlist

### 3. Test the UI

#### Test Main Page (index.html)
1. Visit: http://localhost:8080/
2. Scroll to Experiences, Events, or Stays sections
3. **Look for heart icons** on top-right of each card
4. **Click a heart** - it should:
   - Fill with color (red)
   - Show animation
   - Display toast: "Added to wishlist"
   - Update count badge in header
5. **Click the filled heart again** - it should:
   - Become outline/empty
   - Show animation
   - Display toast: "Removed from wishlist"
   - Decrease count badge

#### Test Details Page (details.html)
1. Click on any experience/event/stay card
2. **Look for large heart button** in the page header (next to title)
3. **Click the heart** - same behavior as cards
4. The heart state should match the card state

#### Test Collections Page (collections.html)
1. Click "View All" on any category
2. **Look for heart icons** on filtered results
3. Test clicking hearts - same behavior

#### Test Wishlist Page (wishlist.html)
1. Click the heart icon in the header (with count badge)
2. Should see all items you added
3. **Test filter tabs**:
   - Click "All" - shows everything
   - Click "Experiences" - shows only experiences
   - Click "Events" - shows only events
   - Click "Stays" - shows only stays
4. **Remove an item**:
   - Click the filled heart on any card
   - Item should disappear from the list
   - Counts should update
5. **Empty state**:
   - Remove all items
   - Should show: "Your wishlist is empty" with button to explore

## Expected Results

### ✅ Heart Icons Should Appear On:
- All experience cards on main page
- All event cards on main page
- All stay cards on main page
- All cards in collections/search results
- Detail page header (large heart button)
- All wishlist page cards

### ✅ Wishlist Count Badge Should:
- Appear in header of all pages
- Show number of items in wishlist
- Update immediately after add/remove
- Hide when count is 0 (or show 0)

### ✅ Database Should:
- Store items in `wishlist` table
- Prevent duplicates (same user, item_id, item_type)
- Delete items when removed
- Return items with full details (title, image, price, etc.)

## Troubleshooting

### Heart Icons Not Showing
**Check:**
1. Is `wishlist.js` loaded? (View page source, search for "wishlist.js")
2. Open browser console - any errors?
3. Check if `window.WishlistManager` exists (type in console)

### Heart Click Not Working
**Check:**
1. Browser console for errors
2. Network tab - is API call being made?
3. Check API response - is it successful?

### Count Badge Not Updating
**Check:**
1. Element with `id="wishlist-count"` exists in HTML
2. `updateWishlistCount()` function is being called
3. API is returning correct count

### API Errors
**Check:**
1. PHP server is running
2. Database connection works (check `.env` file)
3. `wishlist` table exists in database
4. Check `public/backend/api/wishlist.php` file exists

## Console Commands for Debugging

Open browser console (F12) and try:

```javascript
// Check if wishlist manager exists
window.WishlistManager

// Get current wishlist
await window.WishlistManager.getWishlist()

// Get wishlist count
await window.WishlistManager.getWishlistCount()

// Check if item is in wishlist
await window.WishlistManager.isInWishlist(1, 'experience')

// Add item to wishlist
await window.WishlistManager.addToWishlist(1, 'experience')

// Remove item from wishlist
await window.WishlistManager.removeFromWishlist(1, 'experience')

// Initialize all heart buttons
window.WishlistManager.initAllHeartButtons()
```

## Database Verification

Connect to MySQL and check:

```sql
-- View wishlist table structure
DESCRIBE wishlist;

-- View all wishlist items
SELECT * FROM wishlist;

-- View wishlist with item details
SELECT w.*, 
       CASE 
         WHEN w.item_type IN ('experience', 'event') THEN h.title
         WHEN w.item_type = 'stay' THEN s.title
       END as item_title
FROM wishlist w
LEFT JOIN hostings h ON w.item_id = h.id AND w.item_type = h.hosting_type
LEFT JOIN stays s ON w.item_id = s.id AND w.item_type = 'stay'
WHERE w.user_id = 1;

-- Count items by type
SELECT item_type, COUNT(*) as count 
FROM wishlist 
WHERE user_id = 1 
GROUP BY item_type;
```

## Common Issues

### Issue: "User not authenticated" error
**Solution**: The system currently uses `user_id = 1` for testing. This is hardcoded in `wishlist.js` line 14. Make sure your database has a user with `id = 1` in the `users` table.

### Issue: Heart state not syncing across pages
**Solution**: This is expected behavior. Heart states use a 30-second cache. Refresh the page or wait 30 seconds to see updated state.

### Issue: Duplicate items in wishlist
**Solution**: The database has a UNIQUE constraint. This shouldn't happen. If it does, check:
1. The constraint exists: `SHOW CREATE TABLE wishlist;`
2. The API is checking for duplicates before inserting

### Issue: "Database connection failed"
**Solution**: Check your `.env` file in project root:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=lebanon_locals
DB_USERNAME=root
DB_PASSWORD=your_password
```

## Success Criteria

All tests pass when:

- ✅ Heart icons appear on all cards
- ✅ Clicking hearts toggles state (outline ↔ filled)
- ✅ Items are added to database
- ✅ Items are removed from database  
- ✅ Wishlist count updates in real-time
- ✅ Wishlist page displays all saved items
- ✅ Filter tabs work correctly
- ✅ Toast notifications appear
- ✅ No console errors
- ✅ API test script shows all successful responses

## Next Steps After Testing

1. **Integrate Authentication**: Replace hardcoded `user_id = 1` with actual user session
2. **Handle Logged Out Users**: Show login prompt when unauthenticated users try to add to wishlist
3. **Add Loading States**: Show spinner while fetching wishlist
4. **Add Optimistic Updates**: Update UI immediately, then sync with server
5. **Add Error Messages**: Show user-friendly error messages when API fails

