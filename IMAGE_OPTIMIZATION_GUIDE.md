# Image Optimization Guide

This guide provides recommendations and tools for optimizing images in the Lebanon Locals platform.

## Current Image Usage

### Image Locations
- `public/images/` - Static images (logos, icons, backgrounds)
- `public/images/host_experiences/categories/` - Experience category images
- `public/images/property_type/` - Property type icons
- `public/images/logos/` - Brand logos
- `public/uploads/hostings/` - User-uploaded hosting images (S3)
- `public/uploads/stays/` - User-uploaded stay images (S3)

### Image Formats Currently Used
- `.jpg` / `.jpeg` - Photos
- `.png` - Icons, logos with transparency
- `.svg` - Vector graphics (logos, icons)
- `.webp` - Not yet implemented (recommended)

## Optimization Recommendations

### 1. Format Conversion

#### Convert to WebP
WebP provides 25-35% better compression than JPEG/PNG with similar quality.

**Tools:**
- **cwebp** (Google's WebP encoder) - Command line
- **ImageMagick** - Batch conversion
- **Squoosh** (web app) - Manual optimization
- **Sharp** (Node.js) - Programmatic conversion

**Example using cwebp:**
```bash
# Install cwebp (Windows: download from Google)
# macOS: brew install webp
# Linux: apt-get install webp

# Convert single image
cwebp -q 80 input.jpg -o output.webp

# Batch convert (bash script)
for file in *.jpg; do
    cwebp -q 80 "$file" -o "${file%.jpg}.webp"
done
```

**Example using ImageMagick:**
```bash
# Convert to WebP with 80% quality
magick convert input.jpg -quality 80 output.webp

# Batch convert
magick mogrify -format webp -quality 80 *.jpg
```

### 2. Image Compression

#### JPEG Optimization
- Use quality 80-85 for photos (good balance)
- Use quality 60-75 for thumbnails
- Remove EXIF data to reduce file size

**Tools:**
- **jpegoptim** - JPEG optimizer
- **mozjpeg** - Mozilla's JPEG encoder
- **ImageOptim** (macOS) - GUI tool

**Example:**
```bash
# Using jpegoptim
jpegoptim --max=85 --strip-all *.jpg

# Using ImageMagick
magick convert input.jpg -quality 85 -strip output.jpg
```

#### PNG Optimization
- Use PNG for images with transparency
- Convert to WebP if transparency not needed
- Use 8-bit PNG when possible

**Tools:**
- **pngquant** - PNG optimizer
- **optipng** - PNG optimizer
- **TinyPNG** (web service) - API available

**Example:**
```bash
# Using pngquant
pngquant --quality=65-80 input.png

# Using optipng
optipng -o7 input.png
```

### 3. Responsive Images

#### Implement srcset for Different Screen Sizes
```html
<!-- Current -->
<img src="images/hero.jpg" alt="Lebanon">

<!-- Optimized -->
<img 
    srcset="
        images/hero-400w.webp 400w,
        images/hero-800w.webp 800w,
        images/hero-1200w.webp 1200w
    "
    sizes="(max-width: 768px) 100vw, 1200px"
    src="images/hero-800w.webp"
    alt="Lebanon"
    loading="lazy"
>
```

#### Use Picture Element for Format Fallback
```html
<picture>
    <source srcset="images/hero.webp" type="image/webp">
    <source srcset="images/hero.jpg" type="image/jpeg">
    <img src="images/hero.jpg" alt="Lebanon" loading="lazy">
</picture>
```

### 4. Lazy Loading

Already implemented in some places, but ensure all images use:
```html
<img src="..." alt="..." loading="lazy">
```

### 5. Image Dimensions

#### Specify Width and Height
Prevents layout shift (CLS):
```html
<img 
    src="image.jpg" 
    alt="..." 
    width="800" 
    height="600"
    loading="lazy"
>
```

### 6. S3 Upload Optimization

Since images are uploaded to S3, optimize before upload:

**PHP Example (using GD library):**
```php
function optimizeImage($sourcePath, $targetPath, $quality = 85) {
    $imageInfo = getimagesize($sourcePath);
    $mimeType = $imageInfo['mime'];
    
    switch ($mimeType) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($sourcePath);
            imagejpeg($image, $targetPath, $quality);
            break;
        case 'image/png':
            $image = imagecreatefrompng($sourcePath);
            imagepng($image, $targetPath, 9);
            break;
        case 'image/webp':
            $image = imagecreatefromwebp($sourcePath);
            imagewebp($image, $targetPath, $quality);
            break;
    }
    
    imagedestroy($image);
}
```

## Implementation Plan

### Phase 1: Static Images
1. Convert all static images in `public/images/` to WebP
2. Create fallback JPEG/PNG versions
3. Update HTML to use `<picture>` elements
4. Compress existing JPEG/PNG files

### Phase 2: Dynamic Images
1. Add image optimization to upload process
2. Generate multiple sizes (thumbnail, medium, large)
3. Store optimized versions in S3
4. Update API responses to include multiple sizes

### Phase 3: Advanced
1. Implement responsive images with srcset
2. Add image CDN (CloudFront)
3. Implement automatic format detection
4. Add image compression API endpoint

## Tools & Resources

### Command Line Tools
- **cwebp** - WebP encoder: https://developers.google.com/speed/webp/download
- **jpegoptim** - JPEG optimizer: https://github.com/tjko/jpegoptim
- **pngquant** - PNG optimizer: https://pngquant.org/
- **ImageMagick** - All-purpose: https://imagemagick.org/

### Online Tools
- **Squoosh** - https://squoosh.app/
- **TinyPNG** - https://tinypng.com/
- **ImageOptim** - https://imageoptim.com/

### PHP Libraries
- **Intervention Image** - https://image.intervention.io/
- **Imagine** - https://imagine.readthedocs.io/

### Node.js Libraries
- **Sharp** - https://sharp.pixelplumbing.com/
- **imagemin** - https://github.com/imagemin/imagemin

## Quick Start Script

Create `scripts/optimize-images.sh`:

```bash
#!/bin/bash
# Optimize images in public/images/

cd public/images

# Convert JPEG to WebP
for file in *.jpg; do
    if [ -f "$file" ]; then
        cwebp -q 85 "$file" -o "${file%.jpg}.webp"
        echo "Converted $file to WebP"
    fi
done

# Optimize JPEG files
jpegoptim --max=85 --strip-all *.jpg

# Optimize PNG files
pngquant --quality=65-80 *.png

echo "Image optimization complete!"
```

## Performance Impact

### Expected Improvements
- **File Size**: 25-35% reduction with WebP
- **Page Load**: 20-30% faster with optimized images
- **Bandwidth**: Significant reduction in data transfer
- **User Experience**: Faster page loads, better mobile experience

### Metrics to Monitor
- Total image size per page
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Network transfer size

## Notes

- Always keep original images as backup
- Test image quality after optimization
- Monitor page load times before/after
- Consider user's device capabilities
- WebP has 95%+ browser support (2024)

