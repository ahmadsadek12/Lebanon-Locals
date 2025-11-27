# Skeletons & Inline Errors Guide

This guide explains how to use the skeleton loading components and inline form error handling system.

## Skeleton Loading Components

Skeleton loaders provide visual feedback while content is loading, improving perceived performance.

### CSS File
Include `assets/css/skeletons.css` in your HTML:

```html
<link rel="stylesheet" href="assets/css/skeletons.css">
```

### Available Components

#### Card Skeleton
```html
<div class="skeleton-card">
    <div class="skeleton skeleton-card-image"></div>
    <div class="skeleton skeleton-card-title"></div>
    <div class="skeleton skeleton-card-subtitle"></div>
    <div class="skeleton skeleton-card-details"></div>
    <div class="skeleton skeleton-card-details"></div>
</div>
```

#### Horizontal Scroll Skeleton
```html
<div class="horizontal-scroll-skeleton" id="items-skeleton">
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
</div>
```

#### List Skeleton
```html
<div class="skeleton-list">
    <div class="skeleton-list-item">
        <div class="skeleton skeleton-list-image"></div>
        <div class="skeleton-list-content">
            <div class="skeleton skeleton-list-title"></div>
            <div class="skeleton skeleton-list-text"></div>
            <div class="skeleton skeleton-list-text"></div>
        </div>
    </div>
</div>
```

#### Form Field Skeleton
```html
<div class="skeleton-field">
    <div class="skeleton skeleton-label"></div>
    <div class="skeleton skeleton-input"></div>
</div>
```

### Usage Pattern

1. Show skeleton while loading:
```javascript
document.getElementById('items-skeleton').style.display = 'flex';
document.getElementById('items-list').style.display = 'none';
```

2. Hide skeleton when content loads:
```javascript
document.getElementById('items-skeleton').classList.add('skeleton-hidden');
document.getElementById('items-list').style.display = 'block';
```

## Inline Form Errors

Inline error handling provides immediate, contextual feedback for form validation.

### CSS File
Include `assets/css/form-errors.css` in your HTML:

```html
<link rel="stylesheet" href="assets/css/form-errors.css">
```

### JavaScript File
Include `assets/js/form-validation.js` in your HTML:

```html
<script src="assets/js/form-validation.js"></script>
```

### HTML Structure

Wrap form fields in `.form-group` containers:

```html
<div class="form-group">
    <label for="email">Email <span class="required">*</span></label>
    <input type="email" id="email" name="email" required>
    <!-- Error will appear here automatically -->
</div>
```

### JavaScript API

#### Show Field Error
```javascript
FormValidation.showError('email', 'Please enter a valid email address');
// or
FormValidation.showError(document.getElementById('email'), 'Invalid email');
```

#### Clear Field Error
```javascript
FormValidation.clearError('email');
```

#### Show Field Success
```javascript
FormValidation.showSuccess('email', 'Email looks good!');
```

#### Clear All Errors
```javascript
FormValidation.clearAll('my-form');
```

#### Show Error Summary
```javascript
FormValidation.showSummary('my-form', [
    'Email is required',
    'Password must be at least 8 characters',
    'Phone number is invalid'
]);
```

#### Hide Error Summary
```javascript
FormValidation.hideSummary('my-form');
```

### Real-time Validation

The system automatically validates fields on blur:

- **Email**: Validates email format
- **Phone**: Validates phone number format (8+ digits)
- **Required**: Checks if field is filled
- **Min/Max Length**: Validates character limits
- **Number**: Validates min/max values

### Example: Form Submission with Validation

```javascript
document.getElementById('my-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Clear previous errors
    FormValidation.clearAll('my-form');
    FormValidation.hideSummary('my-form');
    
    const errors = [];
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Validate email
    if (!email) {
        FormValidation.showError('email', 'Email is required');
        errors.push('Email is required');
    } else if (!FormValidation.isValidEmail(email)) {
        FormValidation.showError('email', 'Please enter a valid email address');
        errors.push('Invalid email format');
    }
    
    // Validate password
    if (!password) {
        FormValidation.showError('password', 'Password is required');
        errors.push('Password is required');
    } else if (password.length < 8) {
        FormValidation.showError('password', 'Password must be at least 8 characters');
        errors.push('Password too short');
    }
    
    // Show summary if errors exist
    if (errors.length > 0) {
        FormValidation.showSummary('my-form', errors);
        return;
    }
    
    // Submit form if valid
    this.submit();
});
```

### Styling States

The system automatically adds classes:

- `.has-error` - Applied to `.form-group` when field has error
- `.has-success` - Applied to `.form-group` when field is valid
- `.field-error.show` - Error message is visible
- `.field-success.show` - Success message is visible

### Accessibility

- Error messages have `role="alert"` and `aria-live="polite"`
- Error summary has `role="alert"` for screen readers
- Fields with errors are automatically focused
- Error messages scroll into view if needed

### Best Practices

1. **Clear errors on input**: Errors automatically clear when user starts typing
2. **Validate on blur**: Real-time validation happens on field blur
3. **Show summary**: Use error summary for multiple validation errors
4. **Be specific**: Provide clear, actionable error messages
5. **Success feedback**: Use success states for positive reinforcement

## Integration Examples

### Login Form
```html
<form id="login-form">
    <div class="form-group">
        <label for="login-email">Email</label>
        <input type="email" id="login-email" required>
    </div>
    <div class="form-group">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" required>
    </div>
    <button type="submit">Sign In</button>
</form>
```

### Collections Page with Skeleton
```html
<div class="horizontal-scroll-skeleton" id="items-skeleton">
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
</div>
<div class="horizontal-scroll" id="items-list" style="display: none;">
    <!-- Items will render here -->
</div>
```

```javascript
// Show skeleton while loading
document.getElementById('items-skeleton').style.display = 'flex';

// Load data
fetch('/api/items')
    .then(response => response.json())
    .then(data => {
        // Render items
        renderItems(data);
        
        // Hide skeleton, show content
        document.getElementById('items-skeleton').classList.add('skeleton-hidden');
        document.getElementById('items-list').style.display = 'flex';
    });
```

