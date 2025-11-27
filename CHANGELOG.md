# Changelog

All notable changes to the Lebanon Locals project will be documented in this file.

## [Unreleased] - 2025-01-XX

### Added
- **Asset Bundling System**: Created bundling script (`scripts/bundle-assets.py`) to combine common JavaScript and CSS files
  - Generates `public/assets/bundles/common.js` (~100 KB) combining 9 JS files
  - Generates `public/assets/bundles/common.css` (~16 KB) combining 2 CSS files
  - Includes basic minification (removes comments, whitespace)
  - See [BUNDLING_GUIDE.md](BUNDLING_GUIDE.md) for usage

- **Skeleton Loading Components**: Added reusable skeleton placeholders for loading states
  - Card skeletons for listing cards
  - Horizontal scroll skeletons
  - List skeletons
  - Form field skeletons
  - Profile and table skeletons
  - Responsive adjustments
  - See [SKELETONS_AND_ERRORS_GUIDE.md](SKELETONS_AND_ERRORS_GUIDE.md) for usage

- **Inline Form Validation**: Implemented comprehensive form error handling system
  - Inline error messages with visual indicators
  - Real-time validation on field blur
  - Error summary box for multiple errors
  - Success states for positive feedback
  - Accessibility support (ARIA attributes)
  - Auto-scroll to errors
  - Email and phone validation utilities
  - See [SKELETONS_AND_ERRORS_GUIDE.md](SKELETONS_AND_ERRORS_GUIDE.md) for API

- **Client-Side Caching**: Added caching system for static data
  - TTL-based caching (6 hours) for amenities and property types
  - Reduces redundant API calls
  - Improves perceived performance
  - Cache utilities in `public/assets/js/api.js`

- **Unified Header/Footer System**: Standardized header and footer loading across all pages
  - `load-header-standard.js` - Standardized header loader
  - `load-footer.js` - Standardized footer loader
  - Consistent loading pattern across all public pages
  - Proper auth state initialization

- **Modular Posting Page**: Extracted inline styles and scripts from `posting.html`
  - `public/assets/css/posting.css` - All posting-specific styles
  - `public/assets/js/posting.js` - All posting-specific logic
  - Cleaner HTML (reduced from ~2,550 to ~1,940 lines)
  - Better code organization and maintainability

### Changed
- **Header Loading**: Replaced duplicate inline header loading scripts with shared `load-header-standard.js`
  - Updated 24+ HTML pages to use standardized loader
  - Consistent header initialization across all pages
  - Proper event handling for header loaded state

- **Footer Loading**: Replaced duplicate inline footer loading scripts with shared `load-footer.js`
  - Updated 9 HTML pages to use standardized loader
  - Consistent footer loading pattern

- **Form Error Handling**: Enhanced form validation with inline errors
  - Replaced alert-based errors with contextual inline messages
  - Added real-time validation feedback
  - Improved accessibility with ARIA attributes

- **Documentation**: Updated project documentation
  - Added performance optimization section to README.md
  - Created BUNDLING_GUIDE.md
  - Created SKELETONS_AND_ERRORS_GUIDE.md
  - Updated CLAUDE.md with new features and patterns

### Performance Improvements
- **Reduced HTTP Requests**: Bundling reduces 9 JS files → 1 bundle, 2 CSS files → 1 bundle
- **Better Compression**: Larger files compress better (gzip/brotli)
- **Client-Side Caching**: Reduced redundant API calls for static data
- **Skeleton Loading**: Improved perceived performance during async operations
- **Code Organization**: Better maintainability with modular CSS/JS files

### Technical Debt Addressed
- Extracted inline styles from `posting.html` to dedicated CSS file
- Extracted inline scripts from `posting.html` to dedicated JS file
- Unified header/footer loading across all pages
- Standardized error handling patterns

## Notes

- Bundles should be regenerated before each production deployment
- Client-side cache TTL is set to 6 hours (configurable in `api.js`)
- Skeleton components are responsive and work on all screen sizes
- Form validation system supports all standard HTML5 input types

