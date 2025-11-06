# 🔌 Lebanon Locals - Backend Setup Guide

## ✅ What I Just Created:

### **Backend API Files:**
```
backend/
├── config/
│   └── database.php         # Database connection class
└── api/
    ├── experiences.php      # GET /api/experiences.php
    ├── events.php           # GET /api/events.php
    └── stays.php            # GET /api/stays.php
```

### **Frontend API Integration:**
```
public/assets/js/
└── api.js                   # Fetches data from backend
```

---

## 🚀 Setup Steps:

### **Step 1: Create Database**

```bash
mysql -u root -p
```

```sql
CREATE DATABASE lebanon_locals CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lebanon_locals;
```

### **Step 2: Import Schema**

```bash
mysql -u root -p lebanon_locals < database_schema.sql
```

### **Step 3: Add Sample Data**

```sql
USE lebanon_locals;

-- Insert a test user (host)
INSERT INTO users (email, password_hash, user_type, first_name, last_name, is_verified, is_active) 
VALUES ('host@test.com', '$2y$10$test', 'host', 'John', 'Doe', 1, 1);

-- Insert sample experience
INSERT INTO hostings (host_id, hosting_type, title, description, price, price_per_person, length_hours, max_guests, min_guests, location, is_active)
VALUES (1, 'experience', 'Master the Perfect Entrecôte', 'Learn to cook the perfect steak', 45.00, 1, 3, 10, 1, 'Beirut', 1);

-- Insert sample event
INSERT INTO hostings (host_id, hosting_type, title, description, price, price_per_person, date_start, date_end, max_guests, min_guests, location, is_active)
VALUES (1, 'event', 'Wine Tasting Evening', 'Taste Lebanese wines', 60.00, 1, '2025-11-15 19:00:00', '2025-11-15 22:00:00', 20, 5, 'Douma', 1);

-- Insert sample stay
INSERT INTO stays (host_id, title, description, price_per_night, max_guests, number_of_bedrooms, number_of_beds, number_of_bathrooms, location, is_active)
VALUES (1, 'Cozy Apartment in Beirut', 'Modern apartment in the heart of Beirut', 85.00, 4, 2, 2, 1.0, 'Beirut', 1);
```

### **Step 4: Configure Database Connection**

Edit `backend/config/database.php`:
```php
private $host = "localhost";        // Your MySQL host
private $db_name = "lebanon_locals"; // Your database name
private $username = "root";          // Your MySQL username
private $password = "";              // Your MySQL password
```

### **Step 5: Run PHP Server**

Stop the Python server first, then run:

```bash
# Windows PowerShell
cd C:\Users\96170\Desktop\Online Reach\Lebanon Locals\Website\Webapp\frontend_bundle
php -S 127.0.0.1:8080 -t public
```

### **Step 6: Test API Endpoints**

Open these URLs in your browser:

```
http://localhost:8080/backend/api/experiences.php
http://localhost:8080/backend/api/events.php
http://localhost:8080/backend/api/stays.php
```

You should see JSON responses like:
```json
{
    "success": true,
    "count": 1,
    "data": [
        {
            "id": 1,
            "title": "Master the Perfect Entrecôte",
            "price": "45.00",
            ...
        }
    ]
}
```

### **Step 7: View Your Website**

Open: **http://localhost:8080**

The page will now load data from your database! 🎉

---

## 🔍 How It Works:

```
┌─────────────┐
│   Browser   │
│ (index.html)│
└──────┬──────┘
       │
       │ 1. Page loads
       │ 2. api.js calls API.init()
       │
       ▼
┌──────────────────┐
│   api.js         │
│ - loadStays()    │
│ - loadEvents()   │
│ - loadExperiences()│
└──────┬───────────┘
       │
       │ 3. Fetch data via AJAX
       │
       ▼
┌──────────────────┐
│  Backend API     │
│  (PHP files)     │
│ - experiences.php│
│ - events.php     │
│ - stays.php      │
└──────┬───────────┘
       │
       │ 4. Query database
       │
       ▼
┌──────────────────┐
│   MySQL DB       │
│ lebanon_locals   │
│ - hostings       │
│ - stays          │
│ - users          │
└──────────────────┘
```

---

## 📊 API Endpoints Documentation:

### **GET /backend/api/experiences.php**

**Parameters:**
- `category` (optional) - Filter by category name
- `limit` (optional) - Number of results (default: 20)
- `offset` (optional) - Pagination offset (default: 0)

**Example:**
```
/backend/api/experiences.php?category=Culinary&limit=10
```

**Response:**
```json
{
    "success": true,
    "count": 10,
    "data": [...]
}
```

### **GET /backend/api/events.php**

**Parameters:**
- `limit` (optional)
- `offset` (optional)

**Note:** Only returns future events (date_start >= NOW())

### **GET /backend/api/stays.php**

**Parameters:**
- `limit` (optional)
- `offset` (optional)

---

## 🐛 Troubleshooting:

### **Issue: API returns "Database connection failed"**
**Solution:** Check database credentials in `backend/config/database.php`

### **Issue: API returns 404**
**Solution:** Make sure you're using PHP server, not Python:
```bash
php -S 127.0.0.1:8080 -t public
```

### **Issue: CORS errors in console**
**Solution:** Headers are already set in API files. Restart PHP server.

### **Issue: No data showing**
**Solution:** 
1. Check database has data: `SELECT * FROM hostings;`
2. Check API works: Visit `http://localhost:8080/backend/api/experiences.php`
3. Check browser console for errors (F12)

### **Issue: Images not showing**
**Solution:** Make sure `main_image` column has valid paths like:
```
images/logos/home_page_experience_image.webp
```

---

## 📝 Next Steps:

### **Immediate:**
1. ✅ Test database connection
2. ✅ Add sample data
3. ✅ Verify API responses
4. ✅ Check frontend loads data

### **Short Term:**
- Create more API endpoints (search, filters, details)
- Add authentication (login/signup)
- Implement booking system
- Add image upload functionality

### **Long Term:**
- Payment integration (Stripe/PayPal)
- Email notifications
- Admin dashboard
- Mobile app API

---

## 🎉 Success Indicators:

✅ Database created and schema imported
✅ Sample data inserted
✅ API endpoints returning JSON
✅ Frontend showing database content
✅ No more mock data!

**You now have a working full-stack application!** 🚀

