<?php
/**
 * Image Optimizer Utility
 * Handles image optimization and WebP conversion
 */

class ImageOptimizer {
    /**
     * Optimize and convert image to WebP
     * @param string $sourcePath Source image path
     * @param string $targetPath Target path (without extension)
     * @param int $quality Quality (0-100)
     * @return array ['webp' => path, 'fallback' => path] or false on error
     */
    public static function optimizeAndConvert($sourcePath, $targetPath, $quality = 85) {
        if (!file_exists($sourcePath)) {
            return false;
        }
        
        $imageInfo = getimagesize($sourcePath);
        if (!$imageInfo) {
            return false;
        }
        
        $mimeType = $imageInfo['mime'];
        $results = [];
        
        // Create image resource
        $image = null;
        switch ($mimeType) {
            case 'image/jpeg':
                $image = @imagecreatefromjpeg($sourcePath);
                break;
            case 'image/png':
                $image = @imagecreatefrompng($sourcePath);
                // Preserve transparency for PNG
                imagealphablending($image, false);
                imagesavealpha($image, true);
                break;
            case 'image/gif':
                $image = @imagecreatefromgif($sourcePath);
                break;
            default:
                return false;
        }
        
        if (!$image) {
            return false;
        }
        
        // Try WebP conversion
        if (function_exists('imagewebp')) {
            $webpPath = $targetPath . '.webp';
            if (imagewebp($image, $webpPath, $quality)) {
                $results['webp'] = $webpPath;
            }
        }
        
        // Create optimized JPEG fallback
        $jpegPath = $targetPath . '.jpg';
        if ($mimeType === 'image/jpeg') {
            // Re-encode JPEG with quality
            imagejpeg($image, $jpegPath, $quality);
            $results['fallback'] = $jpegPath;
        } else {
            // Convert other formats to JPEG
            imagejpeg($image, $jpegPath, $quality);
            $results['fallback'] = $jpegPath;
        }
        
        imagedestroy($image);
        
        return $results;
    }
    
    /**
     * Create responsive image sizes
     * @param string $sourcePath Source image
     * @param string $basePath Base path for output
     * @param array $sizes Array of ['name' => 'size', 'width' => 800, 'height' => 600]
     * @return array Generated image paths
     */
    public static function createResponsiveImages($sourcePath, $basePath, $sizes = null) {
        if (!$sizes) {
            $sizes = [
                'thumbnail' => ['width' => 300, 'height' => 200],
                'medium' => ['width' => 800, 'height' => 600],
                'large' => ['width' => 1200, 'height' => 900]
            ];
        }
        
        $imageInfo = getimagesize($sourcePath);
        if (!$imageInfo) {
            return false;
        }
        
        $sourceWidth = $imageInfo[0];
        $sourceHeight = $imageInfo[1];
        $mimeType = $imageInfo['mime'];
        
        // Load source image
        $sourceImage = null;
        switch ($mimeType) {
            case 'image/jpeg':
                $sourceImage = imagecreatefromjpeg($sourcePath);
                break;
            case 'image/png':
                $sourceImage = imagecreatefrompng($sourcePath);
                imagealphablending($sourceImage, false);
                imagesavealpha($sourceImage, true);
                break;
            default:
                return false;
        }
        
        if (!$sourceImage) {
            return false;
        }
        
        $results = [];
        
        foreach ($sizes as $name => $dimensions) {
            $targetWidth = $dimensions['width'];
            $targetHeight = $dimensions['height'];
            
            // Calculate aspect ratio
            $sourceRatio = $sourceWidth / $sourceHeight;
            $targetRatio = $targetWidth / $targetHeight;
            
            if ($sourceRatio > $targetRatio) {
                // Source is wider - fit to width
                $newWidth = $targetWidth;
                $newHeight = intval($targetWidth / $sourceRatio);
            } else {
                // Source is taller - fit to height
                $newHeight = $targetHeight;
                $newWidth = intval($targetHeight * $sourceRatio);
            }
            
            // Create resized image
            $resized = imagecreatetruecolor($newWidth, $newHeight);
            
            // Preserve transparency for PNG
            if ($mimeType === 'image/png') {
                imagealphablending($resized, false);
                imagesavealpha($resized, true);
                $transparent = imagecolorallocatealpha($resized, 255, 255, 255, 127);
                imagefill($resized, 0, 0, $transparent);
            }
            
            // Resize with high quality
            imagecopyresampled(
                $resized, $sourceImage,
                0, 0, 0, 0,
                $newWidth, $newHeight,
                $sourceWidth, $sourceHeight
            );
            
            // Save WebP
            $webpPath = str_replace('.jpg', "_{$name}.webp", $basePath);
            if (function_exists('imagewebp')) {
                imagewebp($resized, $webpPath, 85);
                $results[$name]['webp'] = $webpPath;
            }
            
            // Save JPEG fallback
            $jpegPath = str_replace('.jpg', "_{$name}.jpg", $basePath);
            imagejpeg($resized, $jpegPath, 85);
            $results[$name]['fallback'] = $jpegPath;
            
            imagedestroy($resized);
        }
        
        imagedestroy($sourceImage);
        
        return $results;
    }
    
    /**
     * Compress image without resizing
     */
    public static function compress($sourcePath, $targetPath, $quality = 85) {
        $imageInfo = getimagesize($sourcePath);
        if (!$imageInfo) {
            return false;
        }
        
        $mimeType = $imageInfo['mime'];
        $image = null;
        
        switch ($mimeType) {
            case 'image/jpeg':
                $image = imagecreatefromjpeg($sourcePath);
                imagejpeg($image, $targetPath, $quality);
                break;
            case 'image/png':
                $image = imagecreatefrompng($sourcePath);
                // PNG compression (0-9, higher = more compression)
                imagepng($image, $targetPath, 9);
                break;
            default:
                return false;
        }
        
        if ($image) {
            imagedestroy($image);
            return true;
        }
        
        return false;
    }
}

