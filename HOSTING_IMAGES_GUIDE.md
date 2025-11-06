# Hosting Images Table - Implementation Guide

## Overview

The `hosting_images` table allows you to organize and categorize images for your experience and event listings by category (e.g., "Activity", "Location", "Food & Drink", "Equipment", etc.). This enables filtered gallery views and better organization of hosting photos.

---

## Table Structure

```sql
hosting_images
├── id (INT) - Primary key
├── hosting_id (INT) - Foreign key to hostings table
├── category (VARCHAR) - Image category
├── image (VARCHAR) - Image file path
├── display_order (INT) - Order within category
├── is_primary (TINYINT) - Featured image flag (0 or 1)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

## Setup Instructions

### 1. Create the Table

Run the migration:

```bash
cd database
php run_migration.php migrations/create_hosting_images_table.sql
```

Or manually:

```bash
mysql -u root -p lebanon_locals < database/migrations/create_hosting_images_table.sql
```

### 2. Insert Sample Data (Optional)

```bash
mysql -u root -p lebanon_locals < database/sample_hosting_images.sql
```

---

## Adding Images for a Hosting

### Method 1: Direct SQL Insert

```sql
INSERT INTO hosting_images (hosting_id, category, image, display_order, is_primary) VALUES
(15, 'Activity', 'images/host_experiences/15/hiking-main.jpg', 1, 1),
(15, 'Location', 'images/host_experiences/15/mountain-view.jpg', 1, 0),
(15, 'Group', 'images/host_experiences/15/group-photo.jpg', 1, 0);
```

### Method 2: Using phpMyAdmin

1. Navigate to `http://localhost:8080/pma`
2. Select `lebanon_locals` database
3. Click on `hosting_images` table
4. Click "Insert" tab
5. Fill in the form and submit

---

## Standard Image Categories

Use these consistent categories across all hostings:

### Activity-Focused
- **Activity** - Main activity being performed (recommended for primary image)
- **Action** - Dynamic shots of the experience
- **Demonstration** - How-to or instructional shots

### Location-Focused
- **Location** - General location/scenery
- **Venue** - Specific venue/building (for events)
- **Destination** - Points of interest visited
- **View** - Scenic views

### People-Focused
- **Group** - Group photos of participants
- **Host** - Photos of the host/guide
- **Attendees** - Event participants

### Details
- **Equipment** - Gear, tools, materials provided
- **Food & Drink** - Culinary elements
- **Setup** - Event setup/preparation
- **Details** - Close-up details

### Results
- **Results** - What participants create/achieve
- **Certificate** - Completion certificates
- **Souvenir** - Takeaway items

---

## API Usage

### Endpoint

```
GET /backend/api/hosting-images.php
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `hosting_id` | Yes | The hosting ID to fetch images for |
| `category` | No | Filter by specific image category |

### Examples

**Get all images for a hosting:**
```bash
curl "http://localhost:8080/backend/api/hosting-images.php?hosting_id=15"
```

**Get images for a specific category:**
```bash
curl "http://localhost:8080/backend/api/hosting-images.php?hosting_id=15&category=Activity"
```

### Response Format

```json
{
  "success": true,
  "hosting_id": 15,
  "hosting_type": "experience",
  "category_filter": null,
  "available_categories": [
    "Activity",
    "Equipment",
    "Food & Drink",
    "Group",
    "Location"
  ],
  "count": 11,
  "data": [
    {
      "id": "1",
      "hosting_id": "15",
      "category": "Activity",
      "image": "images/host_experiences/15/hiking-main.jpg",
      "display_order": "1",
      "is_primary": true
    },
    {
      "id": "2",
      "hosting_id": "15",
      "category": "Activity",
      "image": "images/host_experiences/15/hiking-trail.jpg",
      "display_order": "2",
      "is_primary": false
    }
  ]
}
```

---

## Frontend Integration

### JavaScript Example

```javascript
// Fetch all images for a hosting
async function loadHostingImages(hostingId) {
    const response = await fetch(`/backend/api/hosting-images.php?hosting_id=${hostingId}`);
    const data = await response.json();

    if (data.success) {
        console.log('Type:', data.hosting_type); // 'experience' or 'event'
        console.log('Available categories:', data.available_categories);
        console.log('Images:', data.data);

        // Group images by category
        const imagesByCategory = {};
        data.data.forEach(img => {
            if (!imagesByCategory[img.category]) {
                imagesByCategory[img.category] = [];
            }
            imagesByCategory[img.category].push(img);
        });

        return imagesByCategory;
    }
}

// Filter images by category
async function loadCategoryImages(hostingId, categoryName) {
    const response = await fetch(
        `/backend/api/hosting-images.php?hosting_id=${hostingId}&category=${encodeURIComponent(categoryName)}`
    );
    const data = await response.json();
    return data.data;
}
```

### Gallery Filter UI Example

```html
<div class="gallery-filters">
    <button data-category="all" class="active">All Photos</button>
    <button data-category="Activity">Activity</button>
    <button data-category="Location">Location</button>
    <button data-category="Food & Drink">Food & Drink</button>
    <!-- More filters dynamically generated from available_categories -->
</div>

<div id="gallery-container">
    <!-- Images filtered by selected category -->
</div>
```

---

## Best Practices

### 1. Image Naming Convention

```
images/host_experiences/{hosting_id}/{category-name}-{number}.jpg

Examples:
images/host_experiences/15/activity-main.jpg
images/host_experiences/15/location-mountain.jpg
images/host_experiences/15/group-photo-1.jpg
```

### 2. Primary Image

- Set `is_primary = 1` for **exactly one image per hosting**
- This should be your best/featured photo
- Used for thumbnails and listing cards
- Usually an "Activity" or "Venue" shot

### 3. Display Order

- Use `display_order` to control photo sequence within each category
- Start from 1 for the best photo in each category
- Increment by 1 for additional photos

### 4. Category Selection

**For Experiences:**
- Use "Activity" for action shots
- Use "Location" for scenic views
- Use "Group" for participant photos
- Use "Equipment" for gear/tools provided

**For Events:**
- Use "Venue" for the event space
- Use "Activity" for performances/activities
- Use "Attendees" for crowd shots
- Use "Setup" for behind-the-scenes

---

## Example Use Cases

### Hiking Experience
```sql
INSERT INTO hosting_images (hosting_id, category, image, display_order, is_primary) VALUES
(15, 'Activity', 'images/host_experiences/15/hiking-main.jpg', 1, 1),
(15, 'Activity', 'images/host_experiences/15/hiking-trail.jpg', 2, 0),
(15, 'Location', 'images/host_experiences/15/mountain-view.jpg', 1, 0),
(15, 'Group', 'images/host_experiences/15/group-summit.jpg', 1, 0),
(15, 'Equipment', 'images/host_experiences/15/hiking-gear.jpg', 1, 0),
(15, 'Food & Drink', 'images/host_experiences/15/picnic.jpg', 1, 0);
```

### Cooking Class
```sql
INSERT INTO hosting_images (hosting_id, category, image, display_order, is_primary) VALUES
(2, 'Activity', 'images/host_experiences/2/cooking-main.jpg', 1, 1),
(2, 'Venue', 'images/host_experiences/2/kitchen.jpg', 1, 0),
(2, 'Food & Drink', 'images/host_experiences/2/ingredients.jpg', 1, 0),
(2, 'Results', 'images/host_experiences/2/finished-dish.jpg', 1, 0),
(2, 'Group', 'images/host_experiences/2/class-photo.jpg', 1, 0);
```

### Concert Event
```sql
INSERT INTO hosting_images (hosting_id, category, image, display_order, is_primary) VALUES
(3, 'Venue', 'images/host_experiences/3/concert-hall.jpg', 1, 1),
(3, 'Activity', 'images/host_experiences/3/performance.jpg', 1, 0),
(3, 'Attendees', 'images/host_experiences/3/crowd.jpg', 1, 0),
(3, 'Setup', 'images/host_experiences/3/stage.jpg', 1, 0);
```

---

## Testing

### Test the API

```bash
# Get all images for hosting ID 15
curl "http://localhost:8080/backend/api/hosting-images.php?hosting_id=15"

# Get activity images only
curl "http://localhost:8080/backend/api/hosting-images.php?hosting_id=15&category=Activity"

# Get available categories
curl "http://localhost:8080/backend/api/hosting-images.php?hosting_id=15" | jq '.available_categories'

# Check hosting type
curl "http://localhost:8080/backend/api/hosting-images.php?hosting_id=15" | jq '.hosting_type'
```

### Test in Browser

Visit: `http://localhost:8080/backend/api/hosting-images.php?hosting_id=15`

---

## Comparison: Hosting Images vs Stay Images

| Feature | `hosting_images` | `stay_images` |
|---------|-----------------|---------------|
| **Purpose** | Experiences & Events | Accommodation |
| **Filter By** | Category (Activity, Location, etc.) | Room (Bedroom 1, Kitchen, etc.) |
| **Primary Use** | Activity/event photos | Property tour |
| **Categories** | 10-15 flexible categories | Room-based structure |
| **Foreign Key** | `hosting_id` → `hostings.id` | `stay_id` → `stays.id` |

---

## Troubleshooting

### Images Not Showing

1. **Check image paths are correct**
   ```sql
   SELECT * FROM hosting_images WHERE hosting_id = 15;
   ```

2. **Verify images exist on filesystem**
   ```bash
   ls public/images/host_experiences/15/
   ```

3. **Check file permissions**
   ```bash
   chmod 644 public/images/host_experiences/15/*.jpg
   ```

### Foreign Key Error

Ensure the `hosting_id` exists:

```sql
-- Check if hosting exists
SELECT id, title, hosting_type FROM hostings WHERE id = 15;
```

### Wrong Hosting Type

Check the hosting_type in the response:

```bash
curl "http://localhost:8080/backend/api/hosting-images.php?hosting_id=15" | jq '.hosting_type'
```

Should return either `"experience"` or `"event"`.

---

## Advanced Usage

### Get Primary Image Only

```sql
SELECT image FROM hosting_images
WHERE hosting_id = 15 AND is_primary = 1
LIMIT 1;
```

### Count Images by Category

```sql
SELECT category, COUNT(*) as count
FROM hosting_images
WHERE hosting_id = 15
GROUP BY category
ORDER BY count DESC;
```

### Get All Categories Used

```sql
SELECT DISTINCT category
FROM hosting_images
ORDER BY category;
```

---

## Migration & Rollback

### Drop Table (if needed)

```sql
DROP TABLE IF EXISTS hosting_images;
```

### Add New Column

```sql
ALTER TABLE hosting_images
ADD COLUMN caption VARCHAR(255) AFTER image;
```

---

## Future Enhancements

Consider adding:

1. **Image Dimensions** - Width/height for responsive loading
2. **Alt Text** - For accessibility and SEO
3. **Photographer Credit** - Attribution field
4. **Upload Date** - Track when added
5. **View Count** - Track popular images
6. **Tags** - Additional categorization

---

**Created:** 2025-11-02
**Version:** 1.0.0
**Related:** See `STAY_IMAGES_GUIDE.md` for stays implementation
