# Stay Images Table - Implementation Guide

## Overview

The `stay_images` table allows you to organize and categorize images for your stay listings by room/area (e.g., "Bedroom 1", "Kitchen", "Bathroom 1", etc.). This enables filtered gallery views and better organization of property photos.

---

## Table Structure

```sql
stay_images
├── id (INT) - Primary key
├── stay_id (INT) - Foreign key to stays table
├── room (VARCHAR) - Room/area category
├── image (VARCHAR) - Image file path
├── display_order (INT) - Order within room category
├── is_primary (TINYINT) - Featured image flag (0 or 1)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

## Setup Instructions

### 1. Create the Table

Run the migration to create the table:

```bash
cd database
php run_migration.php
```

Or manually execute:

```bash
mysql -u root -p lebanon_locals < migrations/create_stay_images_table.sql
```

### 2. Insert Sample Data (Optional)

```bash
mysql -u root -p lebanon_locals < sample_stay_images.sql
```

---

## Adding Images for a Stay

### Method 1: Direct SQL Insert

```sql
INSERT INTO stay_images (stay_id, room, image, display_order, is_primary) VALUES
(1, 'Living Room', 'images/stays/1/living-room.jpg', 1, 1),
(1, 'Bedroom 1', 'images/stays/1/bedroom-1.jpg', 1, 0),
(1, 'Kitchen', 'images/stays/1/kitchen.jpg', 1, 0);
```

### Method 2: Using phpMyAdmin

1. Navigate to `http://localhost:8080/pma`
2. Select `lebanon_locals` database
3. Click on `stay_images` table
4. Click "Insert" tab
5. Fill in the form and submit

---

## Standard Room Categories

Use these consistent categories across all stays:

**Bedrooms:**
- `Master Bedroom`
- `Bedroom 2`, `Bedroom 3`, etc.

**Bathrooms:**
- `Master Bathroom`
- `Bathroom 2`, `Bathroom 3`, etc.

**Common Areas:**
- `Living Room`
- `Kitchen`
- `Dining Room`

**Outdoor Spaces:**
- `Exterior`
- `Balcony`
- `Terrace`
- `Pool`
- `Garden`

**Views & Location:**
- `View`
- `Neighborhood`

**Amenities:**
- `Workspace`
- `Parking`
- `Gym`

---

## API Usage

### Endpoint

```
GET /backend/api/stay-images.php
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `stay_id` | Yes | The stay ID to fetch images for |
| `room` | No | Filter by specific room category |

### Examples

**Get all images for a stay:**
```bash
curl "http://localhost:8080/backend/api/stay-images.php?stay_id=1"
```

**Get images for a specific room:**
```bash
curl "http://localhost:8080/backend/api/stay-images.php?stay_id=1&room=Bedroom%201"
```

### Response Format

```json
{
  "success": true,
  "stay_id": 1,
  "room_filter": null,
  "available_rooms": [
    "Bathroom 1",
    "Bedroom 1",
    "Bedroom 2",
    "Exterior",
    "Kitchen",
    "Living Room",
    "View"
  ],
  "count": 12,
  "data": [
    {
      "id": "1",
      "stay_id": "1",
      "room": "Living Room",
      "image": "images/stays/1/living-room-main.jpg",
      "display_order": "1",
      "is_primary": true
    },
    {
      "id": "2",
      "stay_id": "1",
      "room": "Bedroom 1",
      "image": "images/stays/1/bedroom-1.jpg",
      "display_order": "1",
      "is_primary": false
    }
  ]
}
```

---

## Frontend Integration

### JavaScript Example

```javascript
// Fetch all images for a stay
async function loadStayImages(stayId) {
    const response = await fetch(`/backend/api/stay-images.php?stay_id=${stayId}`);
    const data = await response.json();

    if (data.success) {
        console.log('Available rooms:', data.available_rooms);
        console.log('Images:', data.data);

        // Group images by room
        const imagesByRoom = {};
        data.data.forEach(img => {
            if (!imagesByRoom[img.room]) {
                imagesByRoom[img.room] = [];
            }
            imagesByRoom[img.room].push(img);
        });

        return imagesByRoom;
    }
}

// Filter images by room
async function loadRoomImages(stayId, roomName) {
    const response = await fetch(
        `/backend/api/stay-images.php?stay_id=${stayId}&room=${encodeURIComponent(roomName)}`
    );
    const data = await response.json();
    return data.data;
}
```

### Gallery Filter UI Example

```html
<div class="gallery-filters">
    <button data-room="all" class="active">All Photos</button>
    <button data-room="Bedroom 1">Bedroom 1</button>
    <button data-room="Kitchen">Kitchen</button>
    <button data-room="Bathroom 1">Bathroom 1</button>
    <!-- More filters dynamically generated from available_rooms -->
</div>

<div id="gallery-container">
    <!-- Images filtered by selected room -->
</div>
```

---

## Best Practices

### 1. Image Naming Convention

```
images/stays/{stay_id}/{room-name}-{number}.jpg

Examples:
images/stays/1/living-room-main.jpg
images/stays/1/bedroom-1-view.jpg
images/stays/1/kitchen-2.jpg
```

### 2. Primary Image

- Set `is_primary = 1` for **exactly one image per stay**
- This should be your best/featured photo
- Used for thumbnails and listing cards
- Usually a living room or exterior shot

### 3. Display Order

- Use `display_order` to control photo sequence within each room
- Start from 1 for the best photo in each room
- Increment by 1 for additional photos

### 4. Consistent Room Names

- Use the same room names across all properties
- This allows for better filtering and UI consistency
- Avoid variations like "Living room", "livingroom", "Living"

---

## Example: Complete Property Setup

```sql
-- Stay ID: 5 (3-bedroom villa)

-- Primary/Featured Image
INSERT INTO stay_images (stay_id, room, image, display_order, is_primary) VALUES
(5, 'Exterior', 'images/stays/5/exterior-main.jpg', 1, 1);

-- All Rooms
INSERT INTO stay_images (stay_id, room, image, display_order, is_primary) VALUES
(5, 'Exterior', 'images/stays/5/exterior-side.jpg', 2, 0),
(5, 'Living Room', 'images/stays/5/living-1.jpg', 1, 0),
(5, 'Living Room', 'images/stays/5/living-2.jpg', 2, 0),
(5, 'Kitchen', 'images/stays/5/kitchen.jpg', 1, 0),
(5, 'Master Bedroom', 'images/stays/5/master-bedroom.jpg', 1, 0),
(5, 'Bedroom 2', 'images/stays/5/bedroom-2.jpg', 1, 0),
(5, 'Bedroom 3', 'images/stays/5/bedroom-3.jpg', 1, 0),
(5, 'Master Bathroom', 'images/stays/5/master-bath.jpg', 1, 0),
(5, 'Bathroom 2', 'images/stays/5/bath-2.jpg', 1, 0),
(5, 'Pool', 'images/stays/5/pool-1.jpg', 1, 0),
(5, 'Pool', 'images/stays/5/pool-2.jpg', 2, 0),
(5, 'View', 'images/stays/5/view.jpg', 1, 0);
```

---

## Testing

### Test the API

```bash
# Get all images for stay ID 1
curl "http://localhost:8080/backend/api/stay-images.php?stay_id=1"

# Get bedroom images only
curl "http://localhost:8080/backend/api/stay-images.php?stay_id=1&room=Bedroom%201"

# Get available room categories
curl "http://localhost:8080/backend/api/stay-images.php?stay_id=1" | jq '.available_rooms'
```

### Test in Browser

Visit: `http://localhost:8080/backend/api/stay-images.php?stay_id=1`

---

## Troubleshooting

### Images Not Showing

1. **Check image paths are correct**
   ```sql
   SELECT * FROM stay_images WHERE stay_id = 1;
   ```

2. **Verify images exist on filesystem**
   ```bash
   ls public/images/stays/1/
   ```

3. **Check file permissions**
   ```bash
   chmod 644 public/images/stays/1/*.jpg
   ```

### Foreign Key Error

If you get foreign key constraint errors, ensure:
- The `stay_id` exists in the `stays` table
- Data types match between tables

```sql
-- Check if stay exists
SELECT id, title FROM stays WHERE id = 1;
```

---

## Migration & Rollback

### Drop Table (if needed)

```sql
DROP TABLE IF EXISTS stay_images;
```

### Modify Table (add column example)

```sql
ALTER TABLE stay_images
ADD COLUMN caption VARCHAR(255) AFTER image;
```

---

## Future Enhancements

Consider adding these features:

1. **Image Dimensions** - Store width/height for responsive loading
2. **Alt Text** - For accessibility and SEO
3. **Upload Date** - Track when images were added
4. **File Size** - Monitor storage usage
5. **Approval Status** - For moderation workflow

---

## Support

For issues or questions:
- Check database logs: `tail -f /var/log/mysql/error.log`
- Review API errors in browser console
- Test SQL queries directly in phpMyAdmin

---

**Created:** 2025-11-02
**Version:** 1.0.0
