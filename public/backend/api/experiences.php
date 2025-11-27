<?php
/**
 * Lebanon Locals - Experiences API Endpoint
 * GET /api/experiences.php
 * 
 * @version 1.0.0
 */

// Enable error reporting
ini_set('display_errors', 0); // Don't display errors in JSON response
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Include database connection
$dbFile = __DIR__ . '/../config/database.php';

if (!file_exists($dbFile)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database config file not found',
        'path' => $dbFile
    ]);
    exit();
}

include_once $dbFile;

// Instantiate database
$database = new Database();
$db = $database->getConnection();

// Check connection
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
    $startDateRaw = isset($_GET['start_date']) ? trim($_GET['start_date']) : null;
    $endDateRaw = isset($_GET['end_date']) ? trim($_GET['end_date']) : null;
    $subtype = isset($_GET['subtype']) ? trim($_GET['subtype']) : null;
    $subtypeLower = $subtype !== null && $subtype !== '' ? mb_strtolower($subtype, 'UTF-8') : null;

    $priceMin = isset($_GET['price_min']) && $_GET['price_min'] !== '' ? floatval($_GET['price_min']) : null;
    $priceMax = isset($_GET['price_max']) && $_GET['price_max'] !== '' ? floatval($_GET['price_max']) : null;

    $lengthMin = isset($_GET['length_hours_min']) && $_GET['length_hours_min'] !== '' ? floatval($_GET['length_hours_min']) : null;
    $lengthMax = isset($_GET['length_hours_max']) && $_GET['length_hours_max'] !== '' ? floatval($_GET['length_hours_max']) : null;

    $hourStartRaw = isset($_GET['hour_start']) ? trim($_GET['hour_start']) : null;
    $hourEndRaw = isset($_GET['hour_end']) ? trim($_GET['hour_end']) : null;

    $hourStart = null;
    if ($hourStartRaw !== null && $hourStartRaw !== '') {
        $hourStartTimestamp = strtotime($hourStartRaw);
        if ($hourStartTimestamp !== false) {
            $hourStart = date('H:i:s', $hourStartTimestamp);
        }
    }

    $hourEnd = null;
    if ($hourEndRaw !== null && $hourEndRaw !== '') {
        $hourEndTimestamp = strtotime($hourEndRaw);
        if ($hourEndTimestamp !== false) {
            $hourEnd = date('H:i:s', $hourEndTimestamp);
        }
    }

    $difficultyRaw = isset($_GET['difficulty']) ? $_GET['difficulty'] : null;
    $minAgeFilter = isset($_GET['min_age']) && $_GET['min_age'] !== '' ? intval($_GET['min_age']) : null;
    $maxAgeFilter = isset($_GET['max_age']) && $_GET['max_age'] !== '' ? intval($_GET['max_age']) : null;

    $cancellationRaw = isset($_GET['cancellation']) ? $_GET['cancellation'] : null;

    $allowedDifficulties = ['easy', 'moderate', 'challenging', 'expert'];
    $difficultyMap = [
        'professional' => 'expert',
        'expert' => 'expert',
        'extreme' => 'challenging',
        'hard' => 'challenging',
        'challenging' => 'challenging',
        'medium' => 'moderate',
        'moderate' => 'moderate',
        'easy' => 'easy',
        'beginner' => 'easy',
        'beginners' => 'easy'
    ];
    $difficultyFilters = [];
    if ($difficultyRaw !== null && $difficultyRaw !== '') {
        $difficultyParts = array_filter(array_map('trim', explode(',', $difficultyRaw)));
        foreach ($difficultyParts as $part) {
            $key = mb_strtolower($part, 'UTF-8');
            $canonical = $difficultyMap[$key] ?? $key;
            if (in_array($canonical, $allowedDifficulties, true) && !in_array($canonical, $difficultyFilters, true)) {
                $difficultyFilters[] = $canonical;
            }
        }
    }

    $allowedPolicies = ['flexible', 'moderate', 'strict'];
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

    $startDate = $startDateRaw ? date('Y-m-d', strtotime($startDateRaw)) : null;
    $endDate = $endDateRaw ? date('Y-m-d', strtotime($endDateRaw)) : null;

    $conditions = [
        "h.hosting_type = 'experience'",
        'h.is_active = 1'
    ];

    if ($location !== null && $location !== '') {
        $conditions[] = '(h.location LIKE :location)';
    }

    if (!empty($guests)) {
        $conditions[] = '(h.max_guests - COALESCE(h.total_bookings, 0)) >= :guests';
    }

    if ($startDate) {
        $conditions[] = '(h.date_start IS NULL OR h.date_start >= :start_date)';
    }

    if ($endDate) {
        $conditions[] = '(h.date_end IS NULL OR h.date_end <= :end_date)';
    }

    if ($subtypeLower !== null) {
        $conditions[] = "EXISTS (SELECT 1 FROM hosting_subtypes hs JOIN subtypes s ON hs.subtype_id = s.id WHERE hs.hosting_id = h.id AND s.category = 'experience' AND LOWER(s.name) = :subtype_lower)";
    }

    if ($priceMin !== null) {
        $conditions[] = 'h.price >= :price_min';
    }

    if ($priceMax !== null) {
        $conditions[] = 'h.price <= :price_max';
    }

    if ($lengthMin !== null) {
        $conditions[] = 'h.length_hours IS NOT NULL AND h.length_hours >= :length_hours_min';
    }

    if ($lengthMax !== null) {
        $conditions[] = 'h.length_hours IS NOT NULL AND h.length_hours <= :length_hours_max';
    }

    if ($hourStart !== null) {
        $conditions[] = 'h.hour_start IS NOT NULL AND h.hour_start >= :hour_start_filter';
    }

    if ($hourEnd !== null) {
        $conditions[] = 'h.hour_end IS NOT NULL AND h.hour_end <= :hour_end_filter';
    }

    if (!empty($difficultyFilters)) {
        $difficultyPlaceholders = [];
        foreach ($difficultyFilters as $index => $_) {
            $difficultyPlaceholders[] = ':difficulty_' . $index;
        }
        $conditions[] = 'h.difficulty IN (' . implode(',', $difficultyPlaceholders) . ')';
    }

    if ($minAgeFilter !== null) {
        $conditions[] = '(h.min_age IS NULL OR h.min_age <= :min_age_filter)';
    }

    if ($maxAgeFilter !== null) {
        $conditions[] = '(h.max_age IS NULL OR h.max_age >= :max_age_filter)';
    }

    if (!empty($cancellationFilters)) {
        $policyPlaceholders = [];
        foreach ($cancellationFilters as $index => $_) {
            $policyPlaceholders[] = ':policy_' . $index;
        }
        $conditions[] = 'h.cancellation_policy IN (' . implode(',', $policyPlaceholders) . ')';
    }

    $whereClause = implode(' AND ', $conditions);

    $query = "SELECT 
                h.id,
                h.title,
                h.description,
                h.price,
                h.price_per_person,
                h.length_hours,
                h.length_days,
                h.main_image,
                h.location,
                COALESCE(r.avg_rating, 0) AS average_rating,
                COALESCE(r.review_count, 0) AS total_reviews,
                h.max_guests,
                h.min_guests,
                h.difficulty,
                h.max_guests_per_price,
                h.service_fee_percentage,
                (h.max_guests - COALESCE(h.total_bookings, 0)) AS available_capacity,
                u.first_name AS host_first_name,
                u.last_name AS host_last_name,
                u.profile_picture AS host_picture
              FROM hostings h
              LEFT JOIN users u ON h.host_id = u.id
              LEFT JOIN (
                    SELECT reviewee_id,
                           AVG(stars) AS avg_rating,
                           COUNT(*) AS review_count
                    FROM reviews
                    WHERE reviewee_type = 'hosting'
                    GROUP BY reviewee_id
              ) r ON r.reviewee_id = h.id
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

    if ($startDate) {
        $stmt->bindValue(':start_date', $startDate . ' 00:00:00');
    }

    if ($endDate) {
        $stmt->bindValue(':end_date', $endDate . ' 23:59:59');
    }

    if ($subtypeLower !== null) {
        $stmt->bindValue(':subtype_lower', $subtypeLower, PDO::PARAM_STR);
    }

    if ($priceMin !== null) {
        $stmt->bindValue(':price_min', $priceMin);
    }

    if ($priceMax !== null) {
        $stmt->bindValue(':price_max', $priceMax);
    }

    if ($lengthMin !== null) {
        $stmt->bindValue(':length_hours_min', $lengthMin);
    }

    if ($lengthMax !== null) {
        $stmt->bindValue(':length_hours_max', $lengthMax);
    }

    if ($hourStart !== null) {
        $stmt->bindValue(':hour_start_filter', $hourStart);
    }

    if ($hourEnd !== null) {
        $stmt->bindValue(':hour_end_filter', $hourEnd);
    }

    if (!empty($difficultyFilters)) {
        foreach ($difficultyFilters as $index => $value) {
            $stmt->bindValue(':difficulty_' . $index, $value, PDO::PARAM_STR);
        }
    }

    if ($minAgeFilter !== null) {
        $stmt->bindValue(':min_age_filter', $minAgeFilter, PDO::PARAM_INT);
    }

    if ($maxAgeFilter !== null) {
        $stmt->bindValue(':max_age_filter', $maxAgeFilter, PDO::PARAM_INT);
    }

    if (!empty($cancellationFilters)) {
        foreach ($cancellationFilters as $index => $value) {
            $stmt->bindValue(':policy_' . $index, $value, PDO::PARAM_STR);
        }
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $experiences = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Fetch subtypes for the retrieved experiences
    if (!empty($experiences)) {
        $experienceIds = array_column($experiences, 'id');
        $placeholders = implode(',', array_fill(0, count($experienceIds), '?'));

        $subtypeQuery = "SELECT hs.hosting_id, s.name
                          FROM hosting_subtypes hs
                          JOIN subtypes s ON hs.subtype_id = s.id
                          WHERE hs.hosting_id IN ($placeholders)";

        $subtypeStmt = $db->prepare($subtypeQuery);
        foreach ($experienceIds as $index => $id) {
            $subtypeStmt->bindValue($index + 1, $id, PDO::PARAM_INT);
        }

        $subtypeStmt->execute();

        $subtypesMap = [];
        while ($row = $subtypeStmt->fetch(PDO::FETCH_ASSOC)) {
            $hostingId = $row['hosting_id'];
            $subtypesMap[$hostingId][] = $row['name'];
        }

        foreach ($experiences as &$experience) {
            $experienceId = $experience['id'];
            $experience['subtypes'] = $subtypesMap[$experienceId] ?? [];
        }
        unset($experience);
    }

    $response = [
        'success' => true,
        'count' => count($experiences),
        'data' => $experiences
    ];
    
    http_response_code(200);
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Query failed: ' . $e->getMessage()
    ]);
}

