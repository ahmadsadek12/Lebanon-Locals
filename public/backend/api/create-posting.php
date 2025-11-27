<?php
/**
 * Create Posting API
 * Handles creation of experiences, events, and stays
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Include database connection
    include_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../utils/S3Uploader.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Get POST data
    $userId = isset($_POST['user_id']) ? intval($_POST['user_id']) : null;
    $listingType = isset($_POST['listing_type']) ? trim($_POST['listing_type']) : null;
    
    if (!$userId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'User authentication required']);
        exit();
    }
    
    if (!$listingType || !in_array($listingType, ['experience', 'event', 'stay'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid listing type']);
        exit();
    }
    
    // Verify user is a host
    $userQuery = "SELECT user_type FROM users WHERE id = :user_id";
    $userStmt = $db->prepare($userQuery);
    $userStmt->bindParam(':user_id', $userId);
    $userStmt->execute();
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || ($user['user_type'] !== 'host' && $user['user_type'] !== 'admin')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only hosts can create postings']);
        exit();
    }
    
    // Determine main image field name based on listing type
    $mainImageFieldName = $listingType === 'experience' ? 'exp_main_image' : 
                          ($listingType === 'event' ? 'evt_main_image' : 'stay_main_image');
    
    // Handle main image upload
    $mainImage = null;
    if (isset($_FILES[$mainImageFieldName]) && $_FILES[$mainImageFieldName]['error'] === UPLOAD_ERR_OK) {
        $fileExtension = strtolower(pathinfo($_FILES[$mainImageFieldName]['name'], PATHINFO_EXTENSION));
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        
        if (!in_array($fileExtension, $allowedExtensions)) {
            throw new Exception('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.');
        }
        
        $bucketFolder = $listingType === 'stay' ? 'stays' : 'hostings';
        $key = S3Uploader::buildKey(
            sprintf('%s/user-%s', $bucketFolder, $userId),
            'main',
            $fileExtension
        );
        $contentType = $_FILES[$mainImageFieldName]['type'] ?? mime_content_type($_FILES[$mainImageFieldName]['tmp_name']) ?: 'application/octet-stream';
        $mainImage = S3Uploader::uploadFile($_FILES[$mainImageFieldName]['tmp_name'], $key, $contentType);
    } else {
        throw new Exception('Main image is required');
    }
    
    // Handle additional images (optional)
    $additionalImages = [];
    $additionalImageFieldName = $listingType === 'experience' ? 'exp_additional_images' : 
                                ($listingType === 'event' ? 'evt_additional_images' : 'stay_additional_images');
    
    if (isset($_FILES[$additionalImageFieldName]) && is_array($_FILES[$additionalImageFieldName]['name'])) {
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        $bucketFolder = $listingType === 'stay' ? 'stays' : 'hostings';
        
        $fileCount = count($_FILES[$additionalImageFieldName]['name']);
        for ($i = 0; $i < $fileCount; $i++) {
            if ($_FILES[$additionalImageFieldName]['error'][$i] === UPLOAD_ERR_OK) {
                $fileExtension = strtolower(pathinfo($_FILES[$additionalImageFieldName]['name'][$i], PATHINFO_EXTENSION));
                
                if (in_array($fileExtension, $allowedExtensions)) {
                    $key = S3Uploader::buildKey(
                        sprintf('%s/user-%s', $bucketFolder, $userId),
                        'extra-' . $i,
                        $fileExtension
                    );
                    $contentType = $_FILES[$additionalImageFieldName]['type'][$i] ?? mime_content_type($_FILES[$additionalImageFieldName]['tmp_name'][$i]) ?: 'application/octet-stream';
                    $additionalImages[] = S3Uploader::uploadFile($_FILES[$additionalImageFieldName]['tmp_name'][$i], $key, $contentType);
                }
            }
        }
    }
    
    // Process based on listing type
    if ($listingType === 'experience') {
        // Get experience data
        $title = isset($_POST['exp_title']) ? trim($_POST['exp_title']) : null;
        $description = isset($_POST['exp_description']) ? trim($_POST['exp_description']) : null;
        $lengthHours = isset($_POST['exp_length_hours']) ? floatval($_POST['exp_length_hours']) : null;
        $location = isset($_POST['exp_location']) ? trim($_POST['exp_location']) : null;
        
        // Address fields (optional)
        $country = isset($_POST['exp_country']) ? trim($_POST['exp_country']) : null;
        $city = isset($_POST['exp_city']) ? trim($_POST['exp_city']) : null;
        $street = isset($_POST['exp_street']) ? trim($_POST['exp_street']) : null;
        $building = isset($_POST['exp_building']) ? trim($_POST['exp_building']) : null;
        $floor = isset($_POST['exp_floor']) ? trim($_POST['exp_floor']) : null;
        
        $hourStart = isset($_POST['exp_hour_start']) ? $_POST['exp_hour_start'] : null;
        $hourEnd = isset($_POST['exp_hour_end']) ? $_POST['exp_hour_end'] : null;
        $pricePerPerson = isset($_POST['exp_price_per_person']) ? intval($_POST['exp_price_per_person']) : 1;
        $price = isset($_POST['exp_price']) ? floatval($_POST['exp_price']) : null;
        $maxGuests = isset($_POST['exp_max_guests']) ? intval($_POST['exp_max_guests']) : null;
        $maxGuestsPerPrice = isset($_POST['exp_max_guests_per_price']) ? intval($_POST['exp_max_guests_per_price']) : null;
        $minAge = isset($_POST['exp_min_age']) && $_POST['exp_min_age'] !== '' ? intval($_POST['exp_min_age']) : null;
        $maxAge = isset($_POST['exp_max_age']) && $_POST['exp_max_age'] !== '' ? intval($_POST['exp_max_age']) : null;
        $difficulty = isset($_POST['exp_difficulty']) && $_POST['exp_difficulty'] !== '' ? $_POST['exp_difficulty'] : null;
        $cancellationPolicy = isset($_POST['exp_cancellation_policy']) ? $_POST['exp_cancellation_policy'] : null;
        $whatToBring = isset($_POST['exp_what_to_bring']) ? trim($_POST['exp_what_to_bring']) : null;
        $whatsIncluded = isset($_POST['exp_whats_included']) ? trim($_POST['exp_whats_included']) : null;
        $additionalInfo = isset($_POST['exp_additional_info']) ? trim($_POST['exp_additional_info']) : null;
        
        // Validate required fields
        if (!$title || strlen($title) > 100) {
            throw new Exception('Title is required and must be 100 characters or less');
        }
        
        if (!$description || strlen($description) < 50) {
            throw new Exception('Description must be at least 50 characters');
        }
        
        if (!$lengthHours || $lengthHours < 1) {
            throw new Exception('Length in hours is required and must be at least 1');
        }
        
        if (!$location) {
            throw new Exception('Location is required');
        }
        
        if (!$hourStart || !$hourEnd) {
            throw new Exception('Start and end times are required');
        }
        
        if (!$price || $price < 0.50) {
            throw new Exception('Price must be at least $0.50');
        }
        
        if (!$maxGuests || $maxGuests < 1) {
            throw new Exception('Max guests is required and must be at least 1');
        }
        
        if ($pricePerPerson === 0 && (!$maxGuestsPerPrice || $maxGuestsPerPrice < 1)) {
            throw new Exception('Group size is required for per-group pricing');
        }
        
        if (!$cancellationPolicy) {
            throw new Exception('Cancellation policy is required');
        }
        
        // Create address if any address fields are provided (optional for experiences)
        $addressId = null;
        if ($country || $city || $street || $building) {
            $addressQuery = "INSERT INTO addresses (
                country, city, street, building, floor, created_at, updated_at
            ) VALUES (
                :country, :city, :street, :building, :floor, NOW(), NOW()
            )";
            
            $addressStmt = $db->prepare($addressQuery);
            $addressStmt->bindParam(':country', $country);
            $addressStmt->bindParam(':city', $city);
            $addressStmt->bindParam(':street', $street);
            $addressStmt->bindParam(':building', $building);
            $addressStmt->bindParam(':floor', $floor);
            
            if ($addressStmt->execute()) {
                $addressId = $db->lastInsertId();
            }
        }
        
        // Insert into hostings table (using only confirmed columns)
        $query = "INSERT INTO hostings (
            host_id, hosting_type, title, description, location, address_id,
            price, price_per_person, length_hours, main_image,
            hour_start, hour_end, max_guests, min_guests, difficulty,
            max_guests_per_price, min_age, max_age,
            cancellation_policy,
            is_active, created_at, updated_at
        ) VALUES (
            :host_id, 'experience', :title, :description, :location, :address_id,
            :price, :price_per_person, :length_hours, :main_image,
            :hour_start, :hour_end, :max_guests, 1, :difficulty,
            :max_guests_per_price, :min_age, :max_age,
            :cancellation_policy,
            1, NOW(), NOW()
        )";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':host_id', $userId);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':location', $location);
        $stmt->bindParam(':address_id', $addressId);
        $stmt->bindParam(':price', $price);
        $stmt->bindParam(':price_per_person', $pricePerPerson);
        $stmt->bindParam(':length_hours', $lengthHours);
        $stmt->bindParam(':main_image', $mainImage);
        $stmt->bindParam(':hour_start', $hourStart);
        $stmt->bindParam(':hour_end', $hourEnd);
        $stmt->bindParam(':max_guests', $maxGuests);
        $stmt->bindParam(':difficulty', $difficulty);
        $stmt->bindParam(':max_guests_per_price', $maxGuestsPerPrice);
        $stmt->bindParam(':min_age', $minAge);
        $stmt->bindParam(':max_age', $maxAge);
        $stmt->bindParam(':cancellation_policy', $cancellationPolicy);
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to create experience: ' . implode(', ', $stmt->errorInfo()));
        }
        
        $hostingId = $db->lastInsertId();
        
        // Insert into hosting_images table (main image)
        $imageQuery = "INSERT INTO hosting_images (hosting_id, category, image, is_primary, created_at)
                       VALUES (:hosting_id, 'General', :image, 1, NOW())";
        $imageStmt = $db->prepare($imageQuery);
        $imageStmt->bindParam(':hosting_id', $hostingId);
        $imageStmt->bindParam(':image', $mainImage);
        $imageStmt->execute();
        
        // Insert additional images
        if (!empty($additionalImages)) {
            $additionalImageQuery = "INSERT INTO hosting_images (hosting_id, category, image, is_primary, display_order, created_at)
                                    VALUES (:hosting_id, :category, :image, 0, :display_order, NOW())";
            $additionalImageStmt = $db->prepare($additionalImageQuery);
            
            // Parse image metadata if provided
            $imageMetadata = [];
            if (isset($_POST['image_metadata'])) {
                $metadataJson = $_POST['image_metadata'];
                $decoded = json_decode($metadataJson, true);
                $imageMetadata = is_array($decoded) ? $decoded : [];
            }
            
            foreach ($additionalImages as $index => $imagePath) {
                $displayOrder = $index + 2; // Start from 2 since main image is 1
                $category = 'General'; // Default
                
                // Get category from metadata if available (metadata is an array with numeric indices)
                if (isset($imageMetadata[$index]) && is_array($imageMetadata[$index]) && isset($imageMetadata[$index]['category'])) {
                    $category = trim($imageMetadata[$index]['category']) ?: 'General';
                }
                
                $additionalImageStmt->bindParam(':hosting_id', $hostingId);
                $additionalImageStmt->bindParam(':category', $category);
                $additionalImageStmt->bindParam(':image', $imagePath);
                $additionalImageStmt->bindParam(':display_order', $displayOrder);
                $additionalImageStmt->execute();
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Experience created successfully',
            'hosting_id' => $hostingId,
            'additional_images_count' => count($additionalImages)
        ]);
        
    } else if ($listingType === 'event') {
        // Get event data
        $title = isset($_POST['evt_title']) ? trim($_POST['evt_title']) : null;
        $description = isset($_POST['evt_description']) ? trim($_POST['evt_description']) : null;
        $dateStart = isset($_POST['evt_date_start']) ? $_POST['evt_date_start'] : null;
        $dateEnd = isset($_POST['evt_date_end']) ? $_POST['evt_date_end'] : null;
        $location = isset($_POST['evt_location']) ? trim($_POST['evt_location']) : null;
        
        // Address fields (optional)
        $country = isset($_POST['evt_country']) ? trim($_POST['evt_country']) : null;
        $city = isset($_POST['evt_city']) ? trim($_POST['evt_city']) : null;
        $street = isset($_POST['evt_street']) ? trim($_POST['evt_street']) : null;
        $building = isset($_POST['evt_building']) ? trim($_POST['evt_building']) : null;
        $floor = isset($_POST['evt_floor']) ? trim($_POST['evt_floor']) : null;
        
        $hourStart = isset($_POST['evt_hour_start']) ? $_POST['evt_hour_start'] : null;
        $hourEnd = isset($_POST['evt_hour_end']) ? $_POST['evt_hour_end'] : null;
        $pricePerPerson = isset($_POST['evt_price_per_person']) ? intval($_POST['evt_price_per_person']) : 1;
        $price = isset($_POST['evt_price']) ? floatval($_POST['evt_price']) : null;
        $maxGuests = isset($_POST['evt_max_guests']) ? intval($_POST['evt_max_guests']) : null;
        $maxGuestsPerPrice = isset($_POST['evt_max_guests_per_price']) ? intval($_POST['evt_max_guests_per_price']) : null;
        $minAge = isset($_POST['evt_min_age']) && $_POST['evt_min_age'] !== '' ? intval($_POST['evt_min_age']) : null;
        $maxAge = isset($_POST['evt_max_age']) && $_POST['evt_max_age'] !== '' ? intval($_POST['evt_max_age']) : null;
        $difficulty = isset($_POST['evt_difficulty']) && $_POST['evt_difficulty'] !== '' ? $_POST['evt_difficulty'] : null;
        $cancellationPolicy = isset($_POST['evt_cancellation_policy']) ? $_POST['evt_cancellation_policy'] : null;
        $whatToBring = isset($_POST['evt_what_to_bring']) ? trim($_POST['evt_what_to_bring']) : null;
        $whatsIncluded = isset($_POST['evt_whats_included']) ? trim($_POST['evt_whats_included']) : null;
        $additionalInfo = isset($_POST['evt_additional_info']) ? trim($_POST['evt_additional_info']) : null;
        
        // Validate required fields
        if (!$title || strlen($title) > 100) {
            throw new Exception('Title is required and must be 100 characters or less');
        }
        
        if (!$description || strlen($description) < 50) {
            throw new Exception('Description must be at least 50 characters');
        }
        
        if (!$dateStart || !$dateEnd) {
            throw new Exception('Event start and end dates are required');
        }
        
        if (strtotime($dateStart) >= strtotime($dateEnd)) {
            throw new Exception('Event end date must be after start date');
        }
        
        if (!$location) {
            throw new Exception('Location is required');
        }
        
        if (!$hourStart || !$hourEnd) {
            throw new Exception('Start and end times are required');
        }
        
        if (!$price || $price < 0.50) {
            throw new Exception('Price must be at least $0.50');
        }
        
        if (!$maxGuests || $maxGuests < 1) {
            throw new Exception('Max guests is required and must be at least 1');
        }
        
        if ($pricePerPerson === 0 && (!$maxGuestsPerPrice || $maxGuestsPerPrice < 1)) {
            throw new Exception('Group size is required for per-group pricing');
        }
        
        if (!$cancellationPolicy) {
            throw new Exception('Cancellation policy is required');
        }
        
        // Create address if any address fields are provided (optional for events)
        $addressId = null;
        if ($country || $city || $street || $building) {
            $addressQuery = "INSERT INTO addresses (
                country, city, street, building, floor, created_at, updated_at
            ) VALUES (
                :country, :city, :street, :building, :floor, NOW(), NOW()
            )";
            
            $addressStmt = $db->prepare($addressQuery);
            $addressStmt->bindParam(':country', $country);
            $addressStmt->bindParam(':city', $city);
            $addressStmt->bindParam(':street', $street);
            $addressStmt->bindParam(':building', $building);
            $addressStmt->bindParam(':floor', $floor);
            
            if ($addressStmt->execute()) {
                $addressId = $db->lastInsertId();
            }
        }
        
        // Insert into hostings table
        $query = "INSERT INTO hostings (
            host_id, hosting_type, title, description, location, address_id,
            price, price_per_person, main_image,
            date_start, date_end, hour_start, hour_end,
            max_guests, min_guests, difficulty,
            max_guests_per_price, min_age, max_age,
            cancellation_policy,
            is_active, created_at, updated_at
        ) VALUES (
            :host_id, 'event', :title, :description, :location, :address_id,
            :price, :price_per_person, :main_image,
            :date_start, :date_end, :hour_start, :hour_end,
            :max_guests, 1, :difficulty,
            :max_guests_per_price, :min_age, :max_age,
            :cancellation_policy,
            1, NOW(), NOW()
        )";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':host_id', $userId);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':location', $location);
        $stmt->bindParam(':address_id', $addressId);
        $stmt->bindParam(':price', $price);
        $stmt->bindParam(':price_per_person', $pricePerPerson);
        $stmt->bindParam(':main_image', $mainImage);
        $stmt->bindParam(':date_start', $dateStart);
        $stmt->bindParam(':date_end', $dateEnd);
        $stmt->bindParam(':hour_start', $hourStart);
        $stmt->bindParam(':hour_end', $hourEnd);
        $stmt->bindParam(':max_guests', $maxGuests);
        $stmt->bindParam(':difficulty', $difficulty);
        $stmt->bindParam(':max_guests_per_price', $maxGuestsPerPrice);
        $stmt->bindParam(':min_age', $minAge);
        $stmt->bindParam(':max_age', $maxAge);
        $stmt->bindParam(':cancellation_policy', $cancellationPolicy);
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to create event: ' . implode(', ', $stmt->errorInfo()));
        }
        
        $hostingId = $db->lastInsertId();
        
        // Insert into hosting_images table (main image)
        $imageQuery = "INSERT INTO hosting_images (hosting_id, category, image, is_primary, created_at)
                       VALUES (:hosting_id, 'General', :image, 1, NOW())";
        $imageStmt = $db->prepare($imageQuery);
        $imageStmt->bindParam(':hosting_id', $hostingId);
        $imageStmt->bindParam(':image', $mainImage);
        $imageStmt->execute();
        
        // Insert additional images
        if (!empty($additionalImages)) {
            $additionalImageQuery = "INSERT INTO hosting_images (hosting_id, category, image, is_primary, display_order, created_at)
                                    VALUES (:hosting_id, :category, :image, 0, :display_order, NOW())";
            $additionalImageStmt = $db->prepare($additionalImageQuery);
            
            // Parse image metadata if provided
            $imageMetadata = [];
            if (isset($_POST['image_metadata'])) {
                $metadataJson = $_POST['image_metadata'];
                $decoded = json_decode($metadataJson, true);
                $imageMetadata = is_array($decoded) ? $decoded : [];
            }
            
            foreach ($additionalImages as $index => $imagePath) {
                $displayOrder = $index + 2;
                $category = 'General'; // Default
                
                // Get category from metadata if available (metadata is an array with numeric indices)
                if (isset($imageMetadata[$index]) && is_array($imageMetadata[$index]) && isset($imageMetadata[$index]['category'])) {
                    $category = trim($imageMetadata[$index]['category']) ?: 'General';
                }
                
                $additionalImageStmt->bindParam(':hosting_id', $hostingId);
                $additionalImageStmt->bindParam(':category', $category);
                $additionalImageStmt->bindParam(':image', $imagePath);
                $additionalImageStmt->bindParam(':display_order', $displayOrder);
                $additionalImageStmt->execute();
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Event created successfully',
            'hosting_id' => $hostingId,
            'additional_images_count' => count($additionalImages)
        ]);
        
    } else if ($listingType === 'stay') {
        // Get stay data
        $title = isset($_POST['stay_title']) ? trim($_POST['stay_title']) : null;
        $description = isset($_POST['stay_description']) ? trim($_POST['stay_description']) : null;
        
        // Address fields
        $country = isset($_POST['stay_country']) ? trim($_POST['stay_country']) : null;
        $city = isset($_POST['stay_city']) ? trim($_POST['stay_city']) : null;
        $street = isset($_POST['stay_street']) ? trim($_POST['stay_street']) : null;
        $building = isset($_POST['stay_building']) ? trim($_POST['stay_building']) : null;
        $floor = isset($_POST['stay_floor']) ? trim($_POST['stay_floor']) : null;
        
        $pricePerNight = isset($_POST['stay_price_per_night']) ? floatval($_POST['stay_price_per_night']) : null;
        $cashEnabled = isset($_POST['stay_cash_enabled']) ? intval($_POST['stay_cash_enabled']) : 0;
        $maxGuests = isset($_POST['stay_max_guests']) ? intval($_POST['stay_max_guests']) : null;
        $numberOfBedrooms = isset($_POST['stay_number_of_bedrooms']) ? intval($_POST['stay_number_of_bedrooms']) : null;
        $numberOfDoubleBeds = isset($_POST['stay_number_double_beds']) ? intval($_POST['stay_number_double_beds']) : 0;
        $numberOfSingleBeds = isset($_POST['stay_number_single_beds']) ? intval($_POST['stay_number_single_beds']) : 0;
        $numberOfSofaBeds = isset($_POST['stay_number_sofa_beds']) ? intval($_POST['stay_number_sofa_beds']) : 0;
        
        // Calculate total beds automatically
        $numberOfBeds = $numberOfDoubleBeds + $numberOfSingleBeds + $numberOfSofaBeds;
        
        $numberOfBathrooms = isset($_POST['stay_number_of_bathrooms']) ? floatval($_POST['stay_number_of_bathrooms']) : null;
        $propertyType = isset($_POST['stay_property_type']) ? $_POST['stay_property_type'] : null;
        $cancellationPolicy = isset($_POST['stay_cancellation_policy']) ? $_POST['stay_cancellation_policy'] : null;
        
        // Build house_rules JSON object
        $houseRulesArray = [
            'smoking_allowed' => isset($_POST['smoking_allowed']) && $_POST['smoking_allowed'] == '1',
            'pets_allowed' => isset($_POST['pets_allowed']) && $_POST['pets_allowed'] == '1',
            'parties_allowed' => isset($_POST['parties_allowed']) && $_POST['parties_allowed'] == '1',
            'filming_allowed' => isset($_POST['filming_allowed']) && $_POST['filming_allowed'] == '1',
            'quiet_hours_enforced' => isset($_POST['quiet_hours_enforced']) && $_POST['quiet_hours_enforced'] == '1'
        ];
        $houseRules = json_encode($houseRulesArray);

        $stayAmenities = [];
        if (isset($_POST['stay_amenities'])) {
            $decodedAmenities = json_decode($_POST['stay_amenities'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedAmenities)) {
                $stayAmenities = array_values(array_unique(array_filter(array_map('intval', $decodedAmenities), function($id) {
                    return $id > 0;
                })));
            }
        }
        
        $instantBook = isset($_POST['stay_instant_book']) ? intval($_POST['stay_instant_book']) : 0;
        $checkInTime = isset($_POST['stay_check_in_time']) ? $_POST['stay_check_in_time'] : null;
        $checkOutTime = isset($_POST['stay_check_out_time']) ? $_POST['stay_check_out_time'] : null;
        
        // Validate required fields
        if (!$title || strlen($title) > 20) {
            throw new Exception('Title is required and must be 20 characters or less');
        }
        
        if (!$description || strlen($description) < 50) {
            throw new Exception('Description must be at least 50 characters');
        }
        
        // Validate address fields
        if (!$country) {
            throw new Exception('Country is required');
        }
        
        if (!$city) {
            throw new Exception('City is required');
        }
        
        if (!$street) {
            throw new Exception('Street is required');
        }
        
        if (!$building) {
            throw new Exception('Building is required');
        }
        
        if (!$pricePerNight || $pricePerNight < 0.50) {
            throw new Exception('Price per night must be at least $0.50');
        }
        
        if (!$maxGuests || $maxGuests < 1) {
            throw new Exception('Max guests is required and must be at least 1');
        }
        
        if ($numberOfBedrooms === null) {
            throw new Exception('Number of bedrooms is required');
        }
        
        // Validate that at least one bed type is provided
        if ($numberOfBeds < 1) {
            throw new Exception('At least one bed is required (double, single, or sofa)');
        }
        
        if ($numberOfBathrooms === null || $numberOfBathrooms < 0.5) {
            throw new Exception('Number of bathrooms is required');
        }
        
        if (!$propertyType) {
            throw new Exception('Property type is required');
        }
        
        if (!$cancellationPolicy) {
            throw new Exception('Cancellation policy is required');
        }
        
        if (!$checkInTime || !$checkOutTime) {
            throw new Exception('Check-in and check-out times are required');
        }
        
        // Validate check-in time (cannot be after 3 PM / 15:00)
        if ($checkInTime > '15:00:00') {
            throw new Exception('Check-in time cannot be after 3:00 PM');
        }
        
        // Validate check-out time (cannot be before 11 AM / 11:00)
        if ($checkOutTime < '11:00:00') {
            throw new Exception('Check-out time cannot be before 11:00 AM');
        }
        
        // First, create the address in the addresses table
        $addressQuery = "INSERT INTO addresses (
            country, city, street, building, floor, created_at, updated_at
        ) VALUES (
            :country, :city, :street, :building, :floor, NOW(), NOW()
        )";
        
        $addressStmt = $db->prepare($addressQuery);
        $addressStmt->bindParam(':country', $country);
        $addressStmt->bindParam(':city', $city);
        $addressStmt->bindParam(':street', $street);
        $addressStmt->bindParam(':building', $building);
        $addressStmt->bindParam(':floor', $floor);
        
        if (!$addressStmt->execute()) {
            throw new Exception('Failed to create address: ' . implode(', ', $addressStmt->errorInfo()));
        }
        
        $addressId = $db->lastInsertId();
        
        // Insert into stays table with address_id
        $query = "INSERT INTO stays (
            host_id, title, description, location, address_id,
            price_per_night, cash_enabled, main_image,
            max_guests, number_of_bedrooms, number_of_beds,
            number_double_beds, number_single_beds, number_bunk_beds,
            number_of_bathrooms, property_type, cancellation_policy,
            house_rules, instant_book, check_in_time, check_out_time,
            is_active, created_at, updated_at
        ) VALUES (
            :host_id, :title, :description, :location, :address_id,
            :price_per_night, :cash_enabled, :main_image,
            :max_guests, :number_of_bedrooms, :number_of_beds,
            :number_double_beds, :number_single_beds, :number_bunk_beds,
            :number_of_bathrooms, :property_type, :cancellation_policy,
            :house_rules, :instant_book, :check_in_time, :check_out_time,
            1, NOW(), NOW()
        )";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':host_id', $userId);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':location', $city); // Use city as location for backward compatibility
        $stmt->bindParam(':address_id', $addressId);
        $stmt->bindParam(':price_per_night', $pricePerNight);
        $stmt->bindParam(':cash_enabled', $cashEnabled);
        $stmt->bindParam(':main_image', $mainImage);
        $stmt->bindParam(':max_guests', $maxGuests);
        $stmt->bindParam(':number_of_bedrooms', $numberOfBedrooms);
        $stmt->bindParam(':number_of_beds', $numberOfBeds);
        $stmt->bindParam(':number_double_beds', $numberOfDoubleBeds);
        $stmt->bindParam(':number_single_beds', $numberOfSingleBeds);
        $stmt->bindParam(':number_bunk_beds', $numberOfSofaBeds);
        $stmt->bindParam(':number_of_bathrooms', $numberOfBathrooms);
        $stmt->bindParam(':property_type', $propertyType);
        $stmt->bindParam(':cancellation_policy', $cancellationPolicy);
        $stmt->bindParam(':house_rules', $houseRules);
        $stmt->bindParam(':instant_book', $instantBook);
        $stmt->bindParam(':check_in_time', $checkInTime);
        $stmt->bindParam(':check_out_time', $checkOutTime);
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to create stay: ' . implode(', ', $stmt->errorInfo()));
        }
        
        $stayId = $db->lastInsertId();
        
        // Insert into stay_images table (main image)
        $imageQuery = "INSERT INTO stay_images (stay_id, room, image, is_primary, created_at)
                       VALUES (:stay_id, 'General', :image, 1, NOW())";
        $imageStmt = $db->prepare($imageQuery);
        $imageStmt->bindParam(':stay_id', $stayId);
        $imageStmt->bindParam(':image', $mainImage);
        $imageStmt->execute();
        
        // Insert additional images
        if (!empty($additionalImages)) {
            $additionalImageQuery = "INSERT INTO stay_images (stay_id, room, image, is_primary, display_order, created_at)
                                    VALUES (:stay_id, :room, :image, 0, :display_order, NOW())";
            $additionalImageStmt = $db->prepare($additionalImageQuery);
            
            // Parse image metadata if provided
            $imageMetadata = [];
            if (isset($_POST['image_metadata'])) {
                $metadataJson = $_POST['image_metadata'];
                $decoded = json_decode($metadataJson, true);
                $imageMetadata = is_array($decoded) ? $decoded : [];
            }
            
            foreach ($additionalImages as $index => $imagePath) {
                $displayOrder = $index + 2;
                $room = 'General'; // Default
                
                // Get room from metadata if available (metadata is an array with numeric indices)
                if (isset($imageMetadata[$index]) && is_array($imageMetadata[$index]) && isset($imageMetadata[$index]['room'])) {
                    $room = trim($imageMetadata[$index]['room']) ?: 'General';
                }
                
                $additionalImageStmt->bindParam(':stay_id', $stayId);
                $additionalImageStmt->bindParam(':room', $room);
                $additionalImageStmt->bindParam(':image', $imagePath);
                $additionalImageStmt->bindParam(':display_order', $displayOrder);
                $additionalImageStmt->execute();
            }
        }

        if (!empty($stayAmenities)) {
            try {
                $amenityStmt = $db->prepare("INSERT INTO stay_amenities (stay_id, amenity_id) VALUES (:stay_id, :amenity_id)");
                foreach ($stayAmenities as $amenityId) {
                    $amenityStmt->execute([
                        ':stay_id' => $stayId,
                        ':amenity_id' => $amenityId
                    ]);
                }
            } catch (Exception $amenityException) {
                error_log('Stay amenities insert failed: ' . $amenityException->getMessage());
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Stay created successfully',
            'stay_id' => $stayId,
            'address_id' => $addressId,
            'additional_images_count' => count($additionalImages)
        ]);
    }
    
} catch (Exception $e) {
    error_log("Create Posting Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>

