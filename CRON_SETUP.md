# Automatic Event Deactivation - Cron Setup

## Overview
Past events are automatically deactivated by setting `is_active = 0` when their date/time passes.

## Script Location
`public/backend/cron/deactivate-past-events.php`

## What It Does
- Checks all active events (`hosting_type = 'event'` AND `is_active = 1`)
- If `date_end` has passed → Sets `is_active = 0`
- If no `date_end`, uses `date_start` instead
- Updates `updated_at` timestamp
- Logs results to PHP error log

## Manual Execution

### Windows (PowerShell)
```powershell
cd public
php backend/cron/deactivate-past-events.php
```

### Linux/Mac
```bash
cd public
php backend/cron/deactivate-past-events.php
```

## Automatic Execution (Cron Job)

### Linux/Mac Cron
Add to crontab (`crontab -e`):
```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/frontend_bundle/public && php backend/cron/deactivate-past-events.php >> /var/log/event-deactivation.log 2>&1
```

### Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Name: "Deactivate Past Events"
4. Trigger: Daily at 2:00 AM
5. Action: Start a program
   - Program: `C:\path\to\php.exe`
   - Arguments: `backend/cron/deactivate-past-events.php`
   - Start in: `C:\path\to\frontend_bundle\public`

### Alternative: Node.js Cron
Install node-cron:
```bash
npm install node-cron
```

Create `server/cron-jobs.js`:
```javascript
const cron = require('node-cron');
const { exec } = require('child_process');

// Run daily at 2 AM
cron.schedule('0 2 * * *', () => {
  exec('cd public && php backend/cron/deactivate-past-events.php', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    console.log(`Deactivation output: ${stdout}`);
  });
});

console.log('Cron job scheduled: Deactivate past events daily at 2 AM');
```

## API Already Filters Inactive Events

The events API (`/backend/api/events.php`) already includes:
```php
$conditions = [
    "h.hosting_type = 'event'",
    'h.is_active = 1'  // Only shows active events
];
```

So once an event is deactivated, it automatically disappears from:
- Main page
- Collections page
- Search results
- All event listings

## Testing

Run manually to test:
```bash
cd public
php backend/cron/deactivate-past-events.php
```

Expected output:
```json
{
  "success": true,
  "message": "Deactivated X past events",
  "count": X,
  "timestamp": "2025-11-05 14:30:00"
}
```

## Notes
- Events are never deleted, just marked inactive
- Can be reactivated manually in database if needed
- Check PHP error logs for cron execution history
- Recommended: Run daily at 2 AM when traffic is low

