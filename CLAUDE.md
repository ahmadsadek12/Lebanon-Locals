# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lebanon Locals** is a marketplace platform connecting travelers with unique Lebanese experiences, events, and accommodations. The platform combines elements of Airbnb-style listings with local experience bookings, specifically tailored for Lebanon's tourism market.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 with CSS variables
- **Animation**: GSAP for smooth animations
- **Backend**: PHP 8.x with PDO for database access
- **Database**: MySQL 8.0 (lebanon_locals)
- **Server**: PHP built-in server for development
- **Version Control**: Git

## Development Commands

### Starting the Development Server

```bash
# Run PHP development server (recommended - backend API will work)
php -S 127.0.0.1:8080 -t public

# Alternative: Using Python (static files only, API won't work)
cd public
python -m http.server 8080

# Alternative: Using Node.js http-server (static files only)
npx http-server public -p 8080
```

### Database Operations

```bash
# Connect to MySQL
mysql -u root -p

# Create database
mysql -u root -p -e "CREATE DATABASE lebanon_locals CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema (when database_schema.sql exists)
mysql -u root -p lebanon_locals < database_schema.sql

# Backup database
mysqldump -u root -p lebanon_locals > backup_$(date +%Y%m%d).sql

# Check database connection from project
php public/backend/config/database.php
```

### Testing API Endpoints

```bash
# Test experiences API
curl http://localhost:8080/backend/api/experiences.php

# Test with filters
curl "http://localhost:8080/backend/api/experiences.php?location=Beirut&limit=10"

# Test events API
curl http://localhost:8080/backend/api/events.php

# Test stays API
curl http://localhost:8080/backend/api/stays.php

# Test amenities API
curl http://localhost:8080/backend/api/amenities.php

# Test subtypes API
curl http://localhost:8080/backend/api/subtypes.php
```

## Project Architecture

### High-Level Structure

```
frontend_bundle/
├── public/                      # Web root directory
│   ├── backend/                 # PHP backend API
│   │   ├── api/                 # REST API endpoints
│   │   │   ├── experiences.php  # GET experiences with filters
│   │   │   ├── events.php       # GET events with filters
│   │   │   ├── stays.php        # GET stays with filters
│   │   │   ├── amenities.php    # GET stay amenities
│   │   │   └── subtypes.php     # GET experience/event subtypes
│   │   └── config/
│   │       └── database.php     # PDO database connection class
│   ├── assets/                  # Organized modern assets
│   │   ├── css/
│   │   │   └── variables.css    # CSS custom properties
│   │   └── js/
│   │       ├── config.js        # Global configuration & feature flags
│   │       ├── main.js          # Main app logic, GSAP animations
│   │       ├── api.js           # API integration layer
│   │       └── collections.js   # Collections feature
│   ├── css/                     # Legacy CSS (being migrated)
│   ├── js/                      # Legacy JS (being migrated)
│   ├── images/                  # Image assets
│   └── *.html                   # Static pages
├── resources/                   # Additional resources
├── .env                         # Environment configuration (DO NOT COMMIT)
├── README.md                    # Project documentation
├── BACKEND_SETUP.md            # Backend setup guide
└── CLEANUP_SUMMARY.md          # Code cleanup documentation
```

### Database Architecture

The database follows a comprehensive schema with 35+ tables:

**Core Tables**:
- `users` - User accounts (guests, hosts, admins)
- `hostings` - Base table for experiences and events
- `stays` - Accommodation listings
- `bookings` - Booking records
- `reviews` - Rating and review system
- `payments` - Payment transactions

**Key Relationships**:
- Experiences and events inherit from `hostings` table (polymorphic design)
- Stays are separate entities with their own amenities system
- Users can be both guests and hosts
- Complex filtering through `experience_subtypes`, `stay_amenities`, and location fields

### Frontend Architecture

#### Configuration System (`public/assets/js/config.js`)

Centralized configuration using frozen object pattern:
- API configuration (baseUrl, timeout, version)
- Feature flags (search, auth, chat, booking, payments)
- UI configuration (animation speeds, breakpoints)
- Map configuration (default center: Beirut at 33.8886, 35.4955)
- Pricing configuration (USD currency)
- Contact information

**Feature flags control availability**: When implementing new features, update the corresponding flag in `config.js` to enable functionality.

#### Main Application (`public/assets/js/main.js`)

Modular JavaScript using IIFE pattern with:
- Hero section GSAP animations
- Section management (experiences, events, stays)
- Date picker integration
- Navigation handling
- Event delegation for performance

#### API Layer (`public/assets/js/api.js`)

Handles all backend communication:
- `loadStays()` - Fetches stays from API
- `loadEvents()` - Fetches events from API
- `loadExperiences()` - Fetches experiences from API
- Error handling and loading states

### Backend API Architecture

#### Database Connection (`public/backend/config/database.php`)

PDO-based connection class that:
- Loads credentials from `.env` file using custom env-loader
- Falls back to `env.local.php` if `.env` doesn't exist
- Returns PDO connection with utf8mb4 charset
- Includes error handling and debugging support

#### API Endpoints Pattern

All endpoints follow consistent structure:
1. CORS headers for cross-origin requests
2. Database connection via `Database` class
3. Query parameter validation and sanitization
4. SQL query with PDO prepared statements
5. JSON response with `success`, `count`, and `data` fields

**Common Query Parameters**:
- `limit` (default: 20) - Results per page
- `offset` (default: 0) - Pagination offset
- `location` - Filter by location string
- `guests` - Filter by guest capacity
- `start_date` / `end_date` - Date range filters

### CSS Architecture

#### Variables System (`public/assets/css/variables.css`)

Comprehensive CSS custom properties:
- **Colors**: Primary (#FF385C), neutral grays, status colors
- **Typography**: Font families (Circular), sizes, weights, line heights
- **Spacing**: Consistent scale (xs: 4px → xxl: 80px)
- **Layout**: Container widths, breakpoints, z-index layers
- **Effects**: Shadows, transitions, border radius

**Usage**: Always prefer CSS variables over hard-coded values for maintainability.

## Key Workflows

### Adding a New API Endpoint

1. Create PHP file in `public/backend/api/`
2. Include database connection: `include_once __DIR__ . '/../config/database.php';`
3. Set CORS headers for cross-origin requests
4. Instantiate `Database` class and get connection
5. Validate and sanitize query parameters
6. Write SQL query using PDO prepared statements
7. Return JSON response with `success`, `count`, `data` structure
8. Update `api.js` to add corresponding frontend function

### Implementing a New Frontend Feature

1. Check if feature flag exists in `config.js`, add if needed
2. Create modular function in appropriate JS file
3. Use event delegation for event listeners
4. Reference CSS variables from `variables.css`
5. Add error handling and loading states
6. Update feature flag to `true` when ready to enable

### Database Schema Changes

1. Make changes to database using SQL
2. Export updated schema: `mysqldump -u root -p --no-data lebanon_locals > database_schema.sql`
3. Test schema import on clean database
4. Update API endpoints if tables/columns changed
5. Update frontend API calls if response structure changed

## Important Patterns & Conventions

### JavaScript Patterns

- Use IIFE pattern for encapsulation: `(function() { ... })();`
- Reference frozen config object: `LebanonLocalsConfig.features.search`
- Event delegation for dynamic content: `document.addEventListener('click', handler);`
- Descriptive function names with JSDoc comments
- Error handling with try-catch blocks

### PHP Patterns

- PDO prepared statements for all database queries (prevents SQL injection)
- Consistent JSON response structure: `{ success: bool, count: int, data: array }`
- CORS headers on all API endpoints
- Input validation using `isset()`, `intval()`, `trim()`, etc.
- Error responses with appropriate HTTP status codes

### CSS Patterns

- Mobile-first responsive design
- CSS custom properties for all reusable values
- BEM naming convention recommended for new components
- Avoid `!important` unless absolutely necessary

### Security Practices

- NEVER commit `.env` file (contains database password)
- Always use PDO prepared statements (not string concatenation)
- Validate and sanitize all user inputs
- Set appropriate CORS headers
- Use `htmlspecialchars()` when outputting user content in HTML

## Database Configuration

Environment variables are stored in `.env` at project root:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=lebanon_locals
DB_USERNAME=root
DB_PASSWORD=[your-password]
```

The database connection class automatically loads these via `env-loader.php`.

## Known Issues & Limitations

1. **Legacy Code**: `public/css/` and `public/js/` contain old code being migrated to `public/assets/`
2. **Feature Flags**: Many features (search, auth, booking) are disabled pending backend implementation
3. **Database Schema**: Schema files are not in root - may need to be created/imported from existing database
4. **Mixed Architecture**: Some inline JavaScript still exists in HTML files during migration
5. **PhpMyAdmin**: Full phpMyAdmin installation exists in `public/pma/` - may be unnecessary for production

## Contact & Resources

- **Phone**: +961 81 434 070
- **Email**: info@lebanonlocals.com
- **Instagram**: [@lebanonlocals](https://instagram.com/lebanonlocals)
- **TikTok**: [@lebanonlocals](https://tiktok.com/@lebanonlocals)

## Additional Notes

- Default map center is Beirut (33.8886, 35.4955) - adjust in `config.js` for different focus
- Currency is USD with $ symbol - change in `config.js` if needed
- Date format is 'YYYY-MM-DD' internally, 'MMM DD, YYYY' for display
- When working with Python tools, always activate the venv first: `source venv/bin/activate` (if venv exists)
- This project has Cursor rules at `.cursor/rules/devin.mdc` that emphasize maintaining a scratchpad for task planning
