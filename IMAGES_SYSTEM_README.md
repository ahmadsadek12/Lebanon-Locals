# Lebanon Locals - Multi-Image System

## Overview

The Lebanon Locals platform now supports multiple categorized images for both **stays** and **hostings** (experiences/events). This allows for organized photo galleries with filtering capabilities.

---

## System Architecture

### Two Image Tables

| Table | Purpose | Foreign Key | Filter By |
|-------|---------|-------------|-----------|
| `stay_images` | Accommodation photos | `stay_id` → `stays.id` | **Room** (Bedroom 1, Kitchen, etc.) |
| `hosting_images` | Experience/Event photos | `hosting_id` → `hostings.id` | **Category** (Activity, Location, etc.) |

Both tables share the same structure:
- Multiple images per listing
- Categorized/filterable
- Display order control
- Primary image flag
- Timestamps

---

## Quick Start

### 1. Tables Are Already Created

Both tables were created via migrations:
- ✅ `stay_images` table
- ✅ `hosting_images` table

### 2. API Endpoints Ready

**Stays:**
```
GET /backend/api/stay-images.php?stay_id=1
GET /backend/api/stay-images.php?stay_id=1&room=Bedroom%201
```

**Hostings:**
```
GET /backend/api/hosting-images.php?hosting_id=15
GET /backend/api/hosting-images.php?hosting_id=15&category=Activity
```

### 3. Add Your Images

**For a Stay:**
```sql
INSERT INTO stay_images (stay_id, room, image, display_order, is_primary) VALUES
(1, 'Living Room', 'images/stays/1/living-room.jpg', 1, 1),
(1, 'Bedroom 1', 'images/stays/1/bedroom-1.jpg', 1, 0),
(1, 'Kitchen', 'images/stays/1/kitchen.jpg', 1, 0);
```

**For a Hosting:**
```sql
INSERT INTO hosting_images (hosting_id, category, image, display_order, is_primary) VALUES
(15, 'Activity', 'images/host_experiences/15/hiking-main.jpg', 1, 1),
(15, 'Location', 'images/host_experiences/15/mountain-view.jpg', 1, 0),
(15, 'Group', 'images/host_experiences/15/group-photo.jpg', 1, 0);
```

---

## File Structure

```
frontend_bundle/
├── database/
│   ├── migrations/
│   │   ├── create_stay_images_table.sql
│   │   └── create_hosting_images_table.sql
│   ├── sample_stay_images.sql
│   ├── sample_hosting_images.sql
│   └── run_migration.php
│
├── public/
│   ├── backend/
│   │   └── api/
│   │       ├── stay-images.php
│   │       └── hosting-images.php
│   │
│   └── images/
│       ├── stays/
│       │   ├── 1/
│       │   │   ├── living-room.jpg
│       │   │   ├── bedroom-1.jpg
│       │   │   └── kitchen.jpg
│       │   └── 2/
│       │
│       └── host_experiences/
│           ├── 15/
│           │   ├── hiking-main.jpg
│           │   ├── mountain-view.jpg
│           │   └── group-photo.jpg
│           └── 16/
│
├── STAY_IMAGES_GUIDE.md          # Detailed stay images guide
├── HOSTING_IMAGES_GUIDE.md       # Detailed hosting images guide
└── IMAGES_SYSTEM_README.md       # This file
```

---

## Standard Categories

### Stay Images (by Room)
```
Bedrooms:    Master Bedroom, Bedroom 2, Bedroom 3
Bathrooms:   Master Bathroom, Bathroom 2, Bathroom 3
Common:      Living Room, Kitchen, Dining Room
Outdoor:     Exterior, Balcony, Terrace, Pool, Garden
Other:       View, Workspace, Parking
```

### Hosting Images (by Category)
```
Activity:    Activity, Action, Demonstration
Location:    Location, Venue, Destination, View
People:      Group, Host, Attendees
Details:     Equipment, Food & Drink, Setup, Details
Results:     Results, Certificate, Souvenir
```

---

## API Response Examples

### Stay Images API

**Request:**
```bash
curl "http://localhost:8080/backend/api/stay-images.php?stay_id=1"
```

**Response:**
```json
{
  "success": true,
  "stay_id": 1,
  "room_filter": null,
  "available_rooms": [
    "Living Room",
    "Bedroom 1",
    "Kitchen",
    "Bathroom 1"
  ],
  "count": 4,
  "data": [...]
}
```

### Hosting Images API

**Request:**
```bash
curl "http://localhost:8080/backend/api/hosting-images.php?hosting_id=15"
```

**Response:**
```json
{
  "success": true,
  "hosting_id": 15,
  "hosting_type": "experience",
  "category_filter": null,
  "available_categories": [
    "Activity",
    "Location",
    "Group"
  ],
  "count": 3,
  "data": [...]
}
```

---

## Frontend Integration Example

```javascript
// Load stay images with filtering
async function loadStayGallery(stayId) {
    const response = await fetch(`/backend/api/stay-images.php?stay_id=${stayId}`);
    const data = await response.json();

    // Get available room filters
    const rooms = data.available_rooms;

    // Create filter buttons
    rooms.forEach(room => {
        createFilterButton(room, () => {
            loadRoomImages(stayId, room);
        });
    });

    // Display all images
    displayImages(data.data);
}

// Load hosting images with filtering
async function loadHostingGallery(hostingId) {
    const response = await fetch(`/backend/api/hosting-images.php?hosting_id=${hostingId}`);
    const data = await response.json();

    // Get hosting type (experience or event)
    console.log('Type:', data.hosting_type);

    // Get available category filters
    const categories = data.available_categories;

    // Create filter buttons
    categories.forEach(category => {
        createFilterButton(category, () => {
            loadCategoryImages(hostingId, category);
        });
    });

    // Display all images
    displayImages(data.data);
}
```

---

## Database Queries

### Get Primary Image for Listing Card

**Stay:**
```sql
SELECT image FROM stay_images
WHERE stay_id = 1 AND is_primary = 1
LIMIT 1;
```

**Hosting:**
```sql
SELECT image FROM hosting_images
WHERE hosting_id = 15 AND is_primary = 1
LIMIT 1;
```

### Count Images per Category

**Stay:**
```sql
SELECT room, COUNT(*) as count
FROM stay_images
WHERE stay_id = 1
GROUP BY room;
```

**Hosting:**
```sql
SELECT category, COUNT(*) as count
FROM hosting_images
WHERE hosting_id = 15
GROUP BY category;
```

---

## Benefits

### For Stays
✅ Organize property photos by room
✅ Buyers can see exactly what each space looks like
✅ Better property presentation
✅ Improved booking conversion

### For Experiences/Events
✅ Show different aspects of the experience
✅ Filter by activity, location, results
✅ Better storytelling through organized photos
✅ Increased booking confidence

---

## Maintenance

### Adding Images

Use phpMyAdmin at `http://localhost:8080/pma` or direct SQL:

```sql
-- Stay image
INSERT INTO stay_images (stay_id, room, image, display_order, is_primary)
VALUES (1, 'Pool', 'images/stays/1/pool.jpg', 1, 0);

-- Hosting image
INSERT INTO hosting_images (hosting_id, category, image, display_order, is_primary)
VALUES (15, 'Equipment', 'images/host_experiences/15/gear.jpg', 1, 0);
```

### Updating Primary Image

```sql
-- Remove old primary
UPDATE stay_images SET is_primary = 0 WHERE stay_id = 1;

-- Set new primary
UPDATE stay_images SET is_primary = 1 WHERE id = 5;
```

### Deleting Images

```sql
-- Delete specific image
DELETE FROM stay_images WHERE id = 10;

-- Delete all images for a stay
DELETE FROM stay_images WHERE stay_id = 1;
```

---

## Testing Checklist

- [ ] Stay images API returns data
- [ ] Hosting images API returns data
- [ ] Available rooms/categories list correctly
- [ ] Filter by room/category works
- [ ] Primary image flag is set correctly
- [ ] Images display in correct order
- [ ] Foreign key constraints work (cascade delete)
- [ ] File paths are correct
- [ ] Images exist on filesystem

---

## Troubleshooting

### Issue: "Foreign key constraint fails"
**Solution:** Ensure the `stay_id` or `hosting_id` exists in the parent table:
```sql
SELECT id FROM stays WHERE id = 1;
SELECT id FROM hostings WHERE id = 15;
```

### Issue: API returns empty data
**Solution:** Check if images exist in database:
```sql
SELECT * FROM stay_images WHERE stay_id = 1;
SELECT * FROM hosting_images WHERE hosting_id = 15;
```

### Issue: Images not displaying
**Solution:** Verify file paths and permissions:
```bash
ls -la public/images/stays/1/
chmod 644 public/images/stays/1/*.jpg
```

---

## Documentation Files

| File | Description |
|------|-------------|
| `STAY_IMAGES_GUIDE.md` | Complete guide for stay images |
| `HOSTING_IMAGES_GUIDE.md` | Complete guide for hosting images |
| `IMAGES_SYSTEM_README.md` | This overview document |

---

## Next Steps

1. **Upload Images**: Add actual image files to `public/images/stays/` and `public/images/host_experiences/`

2. **Populate Database**: Use sample SQL files or phpMyAdmin to add image records

3. **Test APIs**: Use curl or browser to verify endpoints work

4. **Integrate Frontend**: Add image galleries to details pages with category filters

5. **Update Listing Cards**: Use primary images on listing cards instead of main_image column

---

## Future Enhancements

- [ ] Image upload functionality in admin panel
- [ ] Automatic thumbnail generation
- [ ] Image optimization/compression
- [ ] Lazy loading implementation
- [ ] Lightbox/modal gallery viewer
- [ ] Image alt text for accessibility
- [ ] Image caption support
- [ ] Drag-and-drop reordering

---

**Created:** 2025-11-02
**Version:** 1.0.0
**Status:** Production Ready ✅
