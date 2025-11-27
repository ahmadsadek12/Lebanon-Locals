<?php
/**
 * Update Posting API
 * Handles updates to experiences, events, and stays
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
    $listingId = isset($_POST['listing_id']) ? intval($_POST['listing_id']) : null;
    
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
    
    if (!$listingId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Listing ID required']);
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
        echo json_encode(['success' => false, 'message' => 'Only hosts and admins can update postings']);
        exit();
    }
    
    // Verify ownership
    if ($listingType === 'stay') {
        $ownerQuery = "SELECT host_id FROM stays WHERE id = :id";
    } else {
        $ownerQuery = "SELECT host_id FROM hostings WHERE id = :id AND hosting_type = :type";
    }
    
    $ownerStmt = $db->prepare($ownerQuery);
    $ownerStmt->bindParam(':id', $listingId);
    if ($listingType !== 'stay') {
        $ownerStmt->bindParam(':type', $listingType);
    }
    $ownerStmt->execute();
    $listing = $ownerStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$listing) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Listing not found']);
        exit();
    }
    
    // Admins can edit any listing, hosts can only edit their own
    if ($user['user_type'] !== 'admin' && $listing['host_id'] != $userId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You do not own this listing']);
        exit();
    }
    
    // Handle main image upload (optional for updates)
    $mainImage = null;
    $mainImageFieldName = $listingType === 'experience' ? 'exp_main_image' : 
                          ($listingType === 'event' ? 'evt_main_image' : 'stay_main_image');
    
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
    }
    
    // Process based on listing type
    if ($listingType === 'experience') {
        // Get experience data
        $title = isset($_POST['exp_title']) ? trim($_POST['exp_title']) : null;
        $description = isset($_POST['exp_description']) ? trim($_POST['exp_description']) : null;
        $lengthHours = isset($_POST['exp_length_hours']) ? floatval($_POST['exp_length_hours']) : null;
        $location = isset($_POST['exp_location']) ? trim($_POST['exp_location']) : null;
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
        
        // Update hostings table
        $updateFields = [
            'title = :title',
            'description = :description',
            'location = :location',
            'price = :price',
            'price_per_person = :price_per_person',
            'length_hours = :length_hours',
            'hour_start = :hour_start',
            'hour_end = :hour_end',
            'max_guests = :max_guests',
            'difficulty = :difficulty',
            'max_guests_per_price = :max_guests_per_price',
            'min_age = :min_age',
            'max_age = :max_age',
            'cancellation_policy = :cancellation_policy',
            'updated_at = NOW()'
        ];
        
        if ($mainImage) {
            $updateFields[] = 'main_image = :main_image';
        }
        
        $query = "UPDATE hostings SET " . implode(', ', $updateFields) . " WHERE id = :id AND host_id = :host_id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $listingId);
        $stmt->bindParam(':host_id', $userId);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':location', $location);
        $stmt->bindParam(':price', $price);
        $stmt->bindParam(':price_per_person', $pricePerPerson);
        $stmt->bindParam(':length_hours', $lengthHours);
        $stmt->bindParam(':hour_start', $hourStart);
        $stmt->bindParam(':hour_end', $hourEnd);
        $stmt->bindParam(':max_guests', $maxGuests);
        $stmt->bindParam(':difficulty', $difficulty);
        $stmt->bindParam(':max_guests_per_price', $maxGuestsPerPrice);
        $stmt->bindParam(':min_age', $minAge);
        $stmt->bindParam(':max_age', $maxAge);
        $stmt->bindParam(':cancellation_policy', $cancellationPolicy);
        
        if ($mainImage) {
            $stmt->bindParam(':main_image', $mainImage);
        }
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to update experience: ' . implode(', ', $stmt->errorInfo()));
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Experience updated successfully',
            'hosting_id' => $listingId
        ]);
        
    } else if ($listingType === 'event') {
        // Similar structure for events
        $title = isset($_POST['evt_title']) ? trim($_POST['evt_title']) : null;
        $description = isset($_POST['evt_description']) ? trim($_POST['evt_description']) : null;
        $location = isset($_POST['evt_location']) ? trim($_POST['evt_location']) : null;
        $dateStart = isset($_POST['evt_date_start']) ? $_POST['evt_date_start'] : null;
        $dateEnd = isset($_POST['evt_date_end']) ? $_POST['evt_date_end'] : null;
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
        
        // Update hostings table
        $updateFields = [
            'title = :title',
            'description = :description',
            'location = :location',
            'price = :price',
            'price_per_person = :price_per_person',
            'date_start = :date_start',
            'date_end = :date_end',
            'hour_start = :hour_start',
            'hour_end = :hour_end',
            'max_guests = :max_guests',
            'difficulty = :difficulty',
            'max_guests_per_price = :max_guests_per_price',
            'min_age = :min_age',
            'max_age = :max_age',
            'cancellation_policy = :cancellation_policy',
            'updated_at = NOW()'
        ];
        
        if ($mainImage) {
            $updateFields[] = 'main_image = :main_image';
        }
        
        $query = "UPDATE hostings SET " . implode(', ', $updateFields) . " WHERE id = :id AND host_id = :host_id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $listingId);
        $stmt->bindParam(':host_id', $userId);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':location', $location);
        $stmt->bindParam(':price', $price);
        $stmt->bindParam(':price_per_person', $pricePerPerson);
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
        
        if ($mainImage) {
            $stmt->bindParam(':main_image', $mainImage);
        }
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to update event: ' . implode(', ', $stmt->errorInfo()));
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Event updated successfully',
            'hosting_id' => $listingId
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
        $numberOfBeds = $numberOfDoubleBeds + $numberOfSingleBeds + $numberOfSofaBeds;
        $numberOfBathrooms = isset($_POST['stay_number_of_bathrooms']) ? floatval($_POST['stay_number_of_bathrooms']) : null;
        $propertyType = isset($_POST['stay_property_type']) ? $_POST['stay_property_type'] : null;
        $cancellationPolicy = isset($_POST['stay_cancellation_policy']) ? $_POST['stay_cancellation_policy'] : null;
        
        // Build house_rules JSON
        $houseRulesArray = [
            'smoking_allowed' => isset($_POST['smoking_allowed']) && $_POST['smoking_allowed'] == '1',
            'pets_allowed' => isset($_POST['pets_allowed']) && $_POST['pets_allowed'] == '1',
            'parties_allowed' => isset($_POST['parties_allowed']) && $_POST['parties_allowed'] == '1',
            'filming_allowed' => isset($_POST['filming_allowed']) && $_POST['filming_allowed'] == '1',
            'quiet_hours_enforced' => isset($_POST['quiet_hours_enforced']) && $_POST['quiet_hours_enforced'] == '1'
        ];
        $houseRules = json_encode($houseRulesArray);
        
        $instantBook = isset($_POST['stay_instant_book']) ? intval($_POST['stay_instant_book']) : 0;
        $checkInTime = isset($_POST['stay_check_in_time']) ? $_POST['stay_check_in_time'] : null;
        $checkOutTime = isset($_POST['stay_check_out_time']) ? $_POST['stay_check_out_time'] : null;

        $stayAmenities = null;
        if (isset($_POST['stay_amenities'])) {
            $decodedAmenities = json_decode($_POST['stay_amenities'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedAmenities)) {
                $stayAmenities = array_values(array_unique(array_filter(array_map('intval', $decodedAmenities), function($id) {
                    return $id > 0;
                })));
            } else {
                $stayAmenities = [];
            }
        }
        
        // Get existing address_id
        $existingQuery = "SELECT address_id FROM stays WHERE id = :id";
        $existingStmt = $db->prepare($existingQuery);
        $existingStmt->bindParam(':id', $listingId);
        $existingStmt->execute();
        $existingStay = $existingStmt->fetch(PDO::FETCH_ASSOC);
        $addressId = $existingStay['address_id'];
        
        // Update address if exists, create if not
        if ($addressId) {
            $addressQuery = "UPDATE addresses SET
                country = :country, city = :city, street = :street,
                building = :building, floor = :floor, updated_at = NOW()
                WHERE id = :address_id";
            
            $addressStmt = $db->prepare($addressQuery);
            $addressStmt->bindParam(':address_id', $addressId);
        } else {
            $addressQuery = "INSERT INTO addresses (country, city, street, building, floor, created_at, updated_at)
                VALUES (:country, :city, :street, :building, :floor, NOW(), NOW())";
            
            $addressStmt = $db->prepare($addressQuery);
        }
        
        $addressStmt->bindParam(':country', $country);
        $addressStmt->bindParam(':city', $city);
        $addressStmt->bindParam(':street', $street);
        $addressStmt->bindParam(':building', $building);
        $addressStmt->bindParam(':floor', $floor);
        $addressStmt->execute();
        
        if (!$addressId) {
            $addressId = $db->lastInsertId();
        }
        
        // Update stays table
        $updateFields = [
            'title = :title',
            'description = :description',
            'location = :location',
            'address_id = :address_id',
            'price_per_night = :price_per_night',
            'cash_enabled = :cash_enabled',
            'max_guests = :max_guests',
            'number_of_bedrooms = :number_of_bedrooms',
            'number_of_beds = :number_of_beds',
            'number_double_beds = :number_double_beds',
            'number_single_beds = :number_single_beds',
            'number_bunk_beds = :number_bunk_beds',
            'number_of_bathrooms = :number_of_bathrooms',
            'property_type = :property_type',
            'cancellation_policy = :cancellation_policy',
            'house_rules = :house_rules',
            'instant_book = :instant_book',
            'check_in_time = :check_in_time',
            'check_out_time = :check_out_time',
            'updated_at = NOW()'
        ];
        
        if ($mainImage) {
            $updateFields[] = 'main_image = :main_image';
        }
        
        $query = "UPDATE stays SET " . implode(', ', $updateFields) . " WHERE id = :id AND host_id = :host_id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $listingId);
        $stmt->bindParam(':host_id', $userId);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':location', $city);
        $stmt->bindParam(':address_id', $addressId);
        $stmt->bindParam(':price_per_night', $pricePerNight);
        $stmt->bindParam(':cash_enabled', $cashEnabled);
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
        
        if ($mainImage) {
            $stmt->bindParam(':main_image', $mainImage);
        }
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to update stay: ' . implode(', ', $stmt->errorInfo()));
        }

        if ($stayAmenities !== null) {
            try {
                $deleteAmenitiesStmt = $db->prepare("DELETE FROM stay_amenities WHERE stay_id = :stay_id");
                $deleteAmenitiesStmt->execute([':stay_id' => $listingId]);

                if (!empty($stayAmenities)) {
                    $insertAmenityStmt = $db->prepare("INSERT INTO stay_amenities (stay_id, amenity_id) VALUES (:stay_id, :amenity_id)");
                    foreach ($stayAmenities as $amenityId) {
                        $insertAmenityStmt->execute([
                            ':stay_id' => $listingId,
                            ':amenity_id' => $amenityId
                        ]);
                    }
                }
            } catch (Exception $amenityException) {
                error_log('Update stay amenities failed: ' . $amenityException->getMessage());
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Stay updated successfully',
            'stay_id' => $listingId,
            'address_id' => $addressId
        ]);
    }
    
} catch (Exception $e) {
    error_log("Update Posting Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>

