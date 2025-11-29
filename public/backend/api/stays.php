<?php
/**
 * Lebanon Locals - Stays API Endpoint
 * GET /api/stays.php
 * 
 * @version 1.0.0
 */

require_once __DIR__ . '/../config/cors.php';
setCorsHeaders();

header("Content-Type: application/json; charset=UTF-8");

include_once __DIR__ . '/../config/database.php';

$database = new Database();
$db = $database->getConnection();

if ($db === null) {
    http_response_code(500);
    echo json_encode(["message" => "Database connection failed"]);
    exit();
}

try {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $location = isset($_GET['location']) ? trim($_GET['location']) : null;
    $guests = isset($_GET['guests']) ? intval($_GET['guests']) : null;
    $minNights = isset($_GET['min_nights']) ? intval($_GET['min_nights']) : null;
    $subtype = isset($_GET['subtype']) ? trim($_GET['subtype']) : null;
    $subtypeLower = $subtype !== null && $subtype !== '' ? mb_strtolower($subtype, 'UTF-8') : null;
    $startDateRaw = isset($_GET['start_date']) ? trim($_GET['start_date']) : null;
    $endDateRaw = isset($_GET['end_date']) ? trim($_GET['end_date']) : null;

    $priceMin = isset($_GET['price_min']) && $_GET['price_min'] !== '' ? floatval($_GET['price_min']) : null;
    $priceMax = isset($_GET['price_max']) && $_GET['price_max'] !== '' ? floatval($_GET['price_max']) : null;
    $bedroomsMin = isset($_GET['bedrooms_min']) && $_GET['bedrooms_min'] !== '' ? intval($_GET['bedrooms_min']) : null;
    $bedsMin = isset($_GET['beds_min']) && $_GET['beds_min'] !== '' ? intval($_GET['beds_min']) : null;
    $doubleBedsMin = isset($_GET['double_beds_min']) && $_GET['double_beds_min'] !== '' ? intval($_GET['double_beds_min']) : null;
    $singleBedsMin = isset($_GET['single_beds_min']) && $_GET['single_beds_min'] !== '' ? intval($_GET['single_beds_min']) : null;
    $includeCouchBeds = isset($_GET['include_couch_beds']) ? filter_var($_GET['include_couch_beds'], FILTER_VALIDATE_BOOLEAN) : false;
    $bathroomsMin = isset($_GET['bathrooms_min']) && $_GET['bathrooms_min'] !== '' ? floatval($_GET['bathrooms_min']) : null;

    $allowedPropertyTypes = ['house','apartment','villa','cabin','hotel','hostel','guesthouse','other'];
    $propertyTypesRaw = isset($_GET['property_type']) ? $_GET['property_type'] : null;
    $propertyTypes = [];
    if ($propertyTypesRaw !== null && $propertyTypesRaw !== '') {
        $requestedPropertyTypes = array_filter(array_map('trim', explode(',', strtolower($propertyTypesRaw))));
        foreach ($requestedPropertyTypes as $type) {
            if (in_array($type, $allowedPropertyTypes, true) && !in_array($type, $propertyTypes, true)) {
                $propertyTypes[] = $type;
            }
        }
    }

    $allowedPolicies = ['flexible', 'moderate', 'strict'];
    $cancellationRaw = isset($_GET['cancellation']) ? $_GET['cancellation'] : null;
    $cancellationFilters = [];
    if ($cancellationRaw !== null && $cancellationRaw !== '') {
        $policyParts = array_filter(array_map('trim', explode(',', $cancellationRaw)));
        foreach ($policyParts as $policy) {
            $key = mb_strtolower($policy, 'UTF-8');
            if (in_array($key, $allowedPolicies, true) && !in_array($key, $cancellationFilters, true)) {
                $cancellationFilters[] = $key;
            }
        }
    }

    $houseRuleMap = [
        'smoking_allowed' => '$."smoking_allowed"',
        'parties_allowed' => '$."parties_allowed"',
        'filming_allowed' => '$."filming_allowed"',
        'pets_allowed' => '$."pets_allowed"',
        'quiet_hours' => '$."quiet_hours_enforced"'
    ];
    $houseRulesRaw = isset($_GET['house_rules']) ? $_GET['house_rules'] : null;
    $houseRuleFilters = [];
    if ($houseRulesRaw !== null && $houseRulesRaw !== '') {
        $ruleParts = array_filter(array_map('trim', explode(',', $houseRulesRaw)));
        foreach ($ruleParts as $ruleKey) {
            $normalized = mb_strtolower($ruleKey, 'UTF-8');
            if (isset($houseRuleMap[$normalized]) && !in_array($normalized, $houseRuleFilters, true)) {
                $houseRuleFilters[] = $normalized;
            }
        }
    }

    $amenitiesRaw = isset($_GET['amenities']) ? $_GET['amenities'] : null;
    $amenityIds = [];
    if ($amenitiesRaw !== null && $amenitiesRaw !== '') {
        $amenityParts = array_filter(array_map('trim', explode(',', $amenitiesRaw)));
        foreach ($amenityParts as $part) {
            if (is_numeric($part)) {
                $amenityIds[] = (int)$part;
            }
        }
        $amenityIds = array_values(array_unique(array_filter($amenityIds, fn($value) => $value > 0)));
    }

    $startDate = $startDateRaw ? date('Y-m-d', strtotime($startDateRaw)) : null;
    $endDate = $endDateRaw ? date('Y-m-d', strtotime($endDateRaw)) : null;
    if ($startDate && !$endDate) {
        $endDate = $startDate;
    }
    if ($endDate && !$startDate) {
        $startDate = $endDate;
    }

    $searchNights = null;
    if ($startDate && $endDate) {
        $startDateObj = new DateTime($startDate);
        $endDateObj = new DateTime($endDate);
        if ($endDateObj < $startDateObj) {
            [$startDateObj, $endDateObj] = [$endDateObj, $startDateObj];
            [$startDate, $endDate] = [$endDate, $startDate];
        }
        $interval = $startDateObj->diff($endDateObj);
        $searchNights = max(1, (int)$interval->days);
    }

    $conditions = ['s.is_active = 1'];

    if ($location !== null && $location !== '') {
        $conditions[] = '(s.location LIKE :location)';
    }

    if (!empty($guests)) {
        $conditions[] = 's.max_guests >= :guests';
    }

    if (!empty($minNights)) {
        $conditions[] = 's.min_nights <= :min_nights';
    }

    if ($priceMin !== null) {
        $conditions[] = 's.price_per_night >= :price_min';
    }

    if ($priceMax !== null) {
        $conditions[] = 's.price_per_night <= :price_max';
    }

    if ($bedroomsMin !== null) {
        $conditions[] = 's.number_of_bedrooms >= :bedrooms_min';
    }

    if ($bedsMin !== null) {
        $conditions[] = 's.number_of_beds >= :beds_min';
    }

    if ($doubleBedsMin !== null) {
        $conditions[] = 's.number_double_beds >= :double_beds_min';
    }

    if ($singleBedsMin !== null) {
        if ($includeCouchBeds) {
            $conditions[] = '(s.number_of_beds - s.number_double_beds) >= :single_beds_min';
        } else {
            $conditions[] = 's.number_single_beds >= :single_beds_min';
        }
    }

    if ($bathroomsMin !== null) {
        $conditions[] = 's.number_of_bathrooms >= :bathrooms_min';
    }

    if (!empty($propertyTypes)) {
        $propertyPlaceholders = [];
        foreach ($propertyTypes as $index => $_) {
            $propertyPlaceholders[] = ':property_type_' . $index;
        }
        $conditions[] = 's.property_type IN (' . implode(',', $propertyPlaceholders) . ')';
    }

    if ($subtypeLower !== null) {
        $conditions[] = "EXISTS (SELECT 1 FROM stay_subtypes ss JOIN subtypes st ON ss.subtype_id = st.id WHERE ss.stay_id = s.id AND st.category = 'stay' AND LOWER(st.name) = :subtype_lower)";
    }

    if (!empty($cancellationFilters)) {
        $policyPlaceholders = [];
        foreach ($cancellationFilters as $index => $_) {
            $policyPlaceholders[] = ':policy_' . $index;
        }
        $conditions[] = 's.cancellation_policy IN (' . implode(',', $policyPlaceholders) . ')';
    }

    if (!empty($houseRuleFilters)) {
        foreach ($houseRuleFilters as $ruleKey) {
            $jsonPath = $houseRuleMap[$ruleKey];
            $conditions[] = "s.house_rules IS NOT NULL AND JSON_EXTRACT(s.house_rules, '$jsonPath') = true";
        }
    }

    if (!empty($amenityIds)) {
        $amenityPlaceholders = [];
        foreach ($amenityIds as $index => $_) {
            $amenityPlaceholders[] = ':amenity_' . $index;
        }
        $conditions[] = 's.id IN (
            SELECT sa.stay_id
            FROM stay_amenities sa
            WHERE sa.amenity_id IN (' . implode(',', $amenityPlaceholders) . ')
            GROUP BY sa.stay_id
            HAVING COUNT(DISTINCT sa.amenity_id) = :amenity_count
        )';
    }

    if ($startDate && $endDate) {
        $conditions[] = "NOT EXISTS (
            SELECT 1 FROM stay_dates sd
            WHERE sd.stay_id = s.id
              AND sd.start_date <= :end_date
              AND sd.end_date >= :start_date
        )";
    }

    if ($searchNights !== null) {
        $conditions[] = '(s.min_nights <= :search_nights_min)';
        $conditions[] = '(s.max_nights IS NULL OR s.max_nights = 0 OR s.max_nights >= :search_nights_max)';
    }

    $whereClause = implode(' AND ', $conditions);

    $query = "SELECT 
                s.id,
                s.title,
                s.description,
                s.price_per_night,
                s.cleaning_fee,
                s.service_fee_percentage,
                s.main_image,
                s.location,
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS total_reviews,
                s.max_guests,
                s.number_of_bedrooms,
                s.number_of_beds,
                s.number_double_beds,
                s.number_single_beds,
                COALESCE(s.number_bunk_beds, 0) AS number_sofa_beds,
                s.number_of_bathrooms,
                s.property_type,
                s.min_nights,
                s.max_nights,
                s.cancellation_policy,
                s.house_rules,
                s.max_guests AS available_capacity,
                u.first_name AS host_first_name,
                u.last_name AS host_last_name
              FROM stays s
              LEFT JOIN users u ON s.host_id = u.id
              LEFT JOIN (
                    SELECT reviewee_id,
                           AVG(stars) AS avg_rating,
                           COUNT(*) AS review_count
                    FROM reviews
                    WHERE reviewee_type = 'stay'
                    GROUP BY reviewee_id
              ) r ON r.reviewee_id = s.id
              WHERE $whereClause
              ORDER BY RAND()
              LIMIT :limit OFFSET :offset";

    $stmt = $db->prepare($query);

    if ($location !== null && $location !== '') {
        $likeLocation = "%$location%";
        $stmt->bindValue(':location', $likeLocation, PDO::PARAM_STR);
    }

    if (!empty($guests)) {
        $stmt->bindValue(':guests', $guests, PDO::PARAM_INT);
    }

    if (!empty($minNights)) {
        $stmt->bindValue(':min_nights', $minNights, PDO::PARAM_INT);
    }

    if ($priceMin !== null) {
        $stmt->bindValue(':price_min', $priceMin);
    }

    if ($priceMax !== null) {
        $stmt->bindValue(':price_max', $priceMax);
    }

    if ($bedroomsMin !== null) {
        $stmt->bindValue(':bedrooms_min', $bedroomsMin, PDO::PARAM_INT);
    }

    if ($bedsMin !== null) {
        $stmt->bindValue(':beds_min', $bedsMin, PDO::PARAM_INT);
    }

    if ($doubleBedsMin !== null) {
        $stmt->bindValue(':double_beds_min', $doubleBedsMin, PDO::PARAM_INT);
    }

    if ($singleBedsMin !== null) {
        $stmt->bindValue(':single_beds_min', $singleBedsMin, PDO::PARAM_INT);
    }

    if ($bathroomsMin !== null) {
        $stmt->bindValue(':bathrooms_min', $bathroomsMin);
    }

    if (!empty($propertyTypes)) {
        foreach ($propertyTypes as $index => $value) {
            $stmt->bindValue(':property_type_' . $index, $value, PDO::PARAM_STR);
        }
    }

    if ($subtypeLower !== null) {
        $stmt->bindValue(':subtype_lower', $subtypeLower, PDO::PARAM_STR);
    }

    if (!empty($cancellationFilters)) {
        foreach ($cancellationFilters as $index => $value) {
            $stmt->bindValue(':policy_' . $index, $value, PDO::PARAM_STR);
        }
    }

    if (!empty($amenityIds)) {
        foreach ($amenityIds as $index => $value) {
            $stmt->bindValue(':amenity_' . $index, $value, PDO::PARAM_INT);
        }
        $stmt->bindValue(':amenity_count', count($amenityIds), PDO::PARAM_INT);
    }

    if ($startDate && $endDate) {
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
    }

    if ($searchNights !== null) {
        $stmt->bindValue(':search_nights_min', $searchNights, PDO::PARAM_INT);
        $stmt->bindValue(':search_nights_max', $searchNights, PDO::PARAM_INT);
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();

    $stays = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($stays)) {
        $stayIds = array_column($stays, 'id');
        $placeholders = implode(',', array_fill(0, count($stayIds), '?'));

        $subtypeQuery = "SELECT ss.stay_id, s.name
                          FROM stay_subtypes ss
                          JOIN subtypes s ON ss.subtype_id = s.id
                          WHERE ss.stay_id IN ($placeholders)";

        $subtypeStmt = $db->prepare($subtypeQuery);
        foreach ($stayIds as $index => $id) {
            $subtypeStmt->bindValue($index + 1, $id, PDO::PARAM_INT);
        }

        $subtypeStmt->execute();

        $subtypesMap = [];
        while ($row = $subtypeStmt->fetch(PDO::FETCH_ASSOC)) {
            $stayId = $row['stay_id'];
            $subtypesMap[$stayId][] = $row['name'];
        }

        foreach ($stays as &$stay) {
            $stayId = $stay['id'];
            $stay['subtypes'] = $subtypesMap[$stayId] ?? [];
        }
        unset($stay);
    }

    $response = [
        'success' => true,
        'count' => count($stays),
        'data' => $stays
    ];

    http_response_code(200);
    echo json_encode($response, JSON_PRETTY_PRINT);

} catch(PDOException $e) {
    http_response_code(500);
    error_log('[STAYS API] Database error: ' . $e->getMessage());
    error_log('[STAYS API] Query: ' . $query);
    echo json_encode([
        'success' => false,
        'message' => 'Query failed: ' . $e->getMessage(),
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
} catch(Exception $e) {
    http_response_code(500);
    error_log('[STAYS API] General error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}

