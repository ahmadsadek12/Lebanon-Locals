# Lebanon Locals - Wishlist System Setup Guide

## Overview
The wishlist system allows users to save their favorite experiences, events, and stays for later viewing. The system uses a database backend with a clean API interface.

## Database Setup

### 1. Create the Wishlist Table

Run the SQL migration file:

```bash
mysql -u root -p lebanon_locals < database/migrations/create_wishlist_table.sql
```

Or manually execute the SQL:

```sql
CREATE TABLE IF NOT EXISTS `wishlist` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL COMMENT 'FK to users table',
  `item_id` INT(11) NOT NULL COMMENT 'ID of the experience/event/stay',
  `item_type` ENUM('experience', 'event', 'stay') NOT NULL COMMENT 'Type of item saved',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_wishlist_item` (`user_id`, `item_id`, `item_type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_item` (`item_id`, `item_type`),
  CONSTRAINT `fk_wishlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. Verify Table Creation

```sql
DESCRIBE wishlist;
```

Expected output:
```
+-----------+--------------------------------------+------+-----+-------------------+
| Field     | Type                                 | Null | Key | Default           |
+-----------+--------------------------------------+------+-----+-------------------+
| id        | int(11)                              | NO   | PRI | NULL              |
| user_id   | int(11)                              | NO   | MUL | NULL              |
| item_id   | int(11)                              | NO   | MUL | NULL              |
| item_type | enum('experience','event','stay')    | NO   |     | NULL              |
| created_at| timestamp                            | NO   |     | CURRENT_TIMESTAMP |
+-----------+--------------------------------------+------+-----+-------------------+
```

## API Endpoints

### GET `/backend/api/wishlist.php`
Retrieve all wishlist items for a user with full details

**Parameters:**
- `user_id` (integer, required) - User ID

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "title": "Mountain Hiking Adventure",
      "main_image": "images/hiking.jpg",
      "price": 50,
      "location": "Bcharre",
      "average_rating": 4.8,
      "total_reviews": 12,
      "_type": "experience",
      "wishlist_id": 5,
      "added_at": "2025-01-15 10:30:00"
    }
  ]
}
```

### POST `/backend/api/wishlist.php`
Add an item to the wishlist

**Body:**
```json
{
  "user_id": 1,
  "item_id": 5,
  "item_type": "experience"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to wishlist",
  "wishlist_id": 10
}
```

### DELETE `/backend/api/wishlist.php`
Remove an item from the wishlist

**Body:**
```json
{
  "user_id": 1,
  "item_id": 5,
  "item_type": "experience"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item removed from wishlist",
  "affected_rows": 1
}
```

## Frontend Integration

### Files Modified

1. **`public/assets/js/wishlist.js`** - Main wishlist management logic
2. **`public/assets/js/details.js`** - Details page heart button
3. **`public/assets/js/api.js`** - Card rendering with heart buttons
4. **`public/assets/js/collections.js`** - Collections page integration
5. **`public/assets/css/wishlist.css`** - Wishlist styling
6. **`public/wishlist.html`** - Wishlist page

### Pages Updated

- `index.html` - Added wishlist button to header, heart buttons on cards
- `details.html` - Added wishlist button to header, large heart button
- `collections.html` - Added wishlist button to header, heart buttons on cards

## How It Works

### 1. User Authentication
Currently uses a hardcoded `user_id = 1` for testing.

**TODO:** Integrate with session/auth system by updating:
```javascript
// In wishlist.js line 14
let currentUserId = 1; // Change to: window.currentUser?.id || null
```

### 2. Adding to Wishlist
- User clicks heart button on any card or details page
- JavaScript calls `WishlistManager.addToWishlist(id, type)`
- API creates record in `wishlist` table
- Heart icon changes to filled
- Toast notification appears
- Count badge updates

### 3. Viewing Wishlist
- User navigates to `/wishlist.html`
- Page calls `getWishlist()` API
- API returns full details (title, image, price, etc.)
- Items displayed in filterable grid
- Can filter by type: All, Experiences, Events, Stays

### 4. Removing from Wishlist
- User clicks filled heart button
- JavaScript calls `WishlistManager.removeFromWishlist(id, type)`
- API deletes record from `wishlist` table
- Heart icon changes to outline
- Item removed from wishlist page
- Count badge updates

## Image Display

Images are properly displayed in two places:

### 1. Wishlist Page
Images come from the `main_image` column:
- **Experiences/Events**: `hostings.main_image`
- **Stays**: `stays.main_image`

The API automatically fetches these and returns them in the response.

### 2. Fallback Images
If no image is available, defaults are used:
- Experiences: `images/logos/home_page_experience_image.webp`
- Stays: `images/logos/home_page_stay_image.webp`

## Caching

The wishlist data is cached for 30 seconds to reduce API calls:
```javascript
const CACHE_DURATION = 30000; // 30 seconds
```

Cache is invalidated when:
- Items are added
- Items are removed
- Forced refresh is requested

## Testing

### 1. Test Add to Wishlist
```bash
curl -X POST http://localhost:8080/backend/api/wishlist.php \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"item_id":1,"item_type":"experience"}'
```

### 2. Test Get Wishlist
```bash
curl "http://localhost:8080/backend/api/wishlist.php?user_id=1"
```

### 3. Test Remove from Wishlist
```bash
curl -X DELETE http://localhost:8080/backend/api/wishlist.php \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"item_id":1,"item_type":"experience"}'
```

## Security Notes

⚠️ **IMPORTANT FOR PRODUCTION:**

1. **Authentication Required**: The current implementation accepts `user_id` from the request. In production:
   - Use PHP sessions to get the authenticated user
   - Validate user ownership
   - Never trust client-sent user_id

2. **Update API to use sessions:**
```php
// In wishlist.php, replace:
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 1;

// With:
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit();
}
$user_id = $_SESSION['user_id'];
```

3. **CORS Settings**: Adjust for production domain in `wishlist.php`

## Troubleshooting

### Issue: Heart buttons not working
**Solution:** Check browser console for errors. Ensure `wishlist.js` is loaded before other scripts.

### Issue: Images not displaying
**Solution:** Verify image paths in database match actual file locations. Check `main_image` column values.

### Issue: Count not updating
**Solution:** Clear browser cache, check that `updateWishlistCount()` is being called.

### Issue: 401 Authentication Error
**Solution:** For testing, user_id=1 is hardcoded. Check that user with id=1 exists in database.

## Future Enhancements

1. **Authentication Integration**: Connect to actual user sessions
2. **Collections**: Group wishlist items into custom collections
3. **Sharing**: Share wishlist with friends
4. **Notifications**: Alert when wishlisted items have price drops
5. **Sync**: Sync wishlist across devices for logged-in users

---

**Created:** January 2025
**Version:** 1.0.0
