# Posting.html Wizard - Field Analysis

## Question: Does the wizard approach remove any data fields?

**Answer: NO** - The wizard approach does NOT remove any fields. It only reorganizes them into logical steps.

---

## Current Form Structure (All Fields)

### EXPERIENCES

#### Basic Information
- ✅ `exp_title` - Title (required, max 100 chars)
- ✅ `exp_description` - Description (required, min 50 chars)
- ✅ `exp_length_hours` - Length in hours (required)
- ✅ `exp_country` - Country (optional)
- ✅ `exp_city` - City (optional)
- ✅ `exp_street` - Street (optional)
- ✅ `exp_building` - Building (optional)
- ✅ `exp_floor` - Floor (optional)
- ✅ `exp_location` - Location Display (required)

#### Operating Hours
- ✅ `exp_hour_start` - Opening time (required)
- ✅ `exp_hour_end` - Closing time (required)

#### Guests & Pricing
- ✅ `exp_price_per_person` - Pricing type (per person/group) (required)
- ✅ `exp_price` - Price in USD (required, min $0.50)
- ✅ `exp_max_guests` - Max guests (required)
- ✅ `exp_max_guests_per_price` - Group size (conditional, required if per-group)
- ✅ `exp_min_age` - Min age (optional)
- ✅ `exp_max_age` - Max age (optional)

#### Details
- ✅ `exp_difficulty` - Difficulty level (easy/moderate/challenging) (optional)
- ✅ `exp_cancellation_policy` - Cancellation policy (required)
- ✅ `exp_what_to_bring` - What to bring (optional)
- ✅ `exp_whats_included` - What's included (optional)
- ✅ `exp_additional_info` - Additional information (optional)

#### Images
- ✅ `exp_main_image` - Main image (required)
- ✅ `exp_additional_images[]` - Additional images (up to 20, optional)
- ✅ Image metadata (category/room for categorization)

#### Subtypes
- ✅ Experience subtypes (selected via checkboxes)

---

### EVENTS

#### Basic Information
- ✅ `evt_title` - Title (required, max 100 chars)
- ✅ `evt_description` - Description (required, min 50 chars)
- ✅ `evt_date_start` - Event start date & time (required)
- ✅ `evt_date_end` - Event end date & time (required)
- ✅ `evt_country` - Country (optional)
- ✅ `evt_city` - City (optional)
- ✅ `evt_street` - Street (optional)
- ✅ `evt_building` - Building (optional)
- ✅ `evt_floor` - Floor (optional)
- ✅ `evt_location` - Location Display (required)

#### Availability Hours
- ✅ `evt_hour_start` - Opening time (required)
- ✅ `evt_hour_end` - Closing time (required)

#### Guests & Pricing
- ✅ `evt_price_per_person` - Pricing type (per person/group) (required)
- ✅ `evt_price` - Price in USD (required, min $0.50)
- ✅ `evt_max_guests` - Max guests (required)
- ✅ `evt_max_guests_per_price` - Group size (conditional, required if per-group)
- ✅ `evt_min_age` - Min age (optional)
- ✅ `evt_max_age` - Max age (optional)

#### Details
- ✅ `evt_difficulty` - Difficulty level (optional)
- ✅ `evt_cancellation_policy` - Cancellation policy (required)
- ✅ `evt_what_to_bring` - What to bring (optional)
- ✅ `evt_whats_included` - What's included (optional)
- ✅ `evt_additional_info` - Additional information (optional)

#### Images
- ✅ `evt_main_image` - Main image (required)
- ✅ `evt_additional_images[]` - Additional images (up to 20, optional)
- ✅ Image metadata (category for categorization)

#### Subtypes
- ✅ Event subtypes (selected via checkboxes)

---

### STAYS

#### Basic Information
- ✅ `stay_title` - Title (required, max 20 chars)
- ✅ `stay_description` - Description (required, min 50 chars)
- ✅ `stay_country` - Country (required)
- ✅ `stay_city` - City (required)
- ✅ `stay_street` - Street (required)
- ✅ `stay_building` - Building (required)
- ✅ `stay_floor` - Floor (optional)
- ✅ `stay_property_type` - Property type (required, from database)

#### Property Details
- ✅ `stay_bedrooms` - Number of bedrooms (required)
- ✅ `stay_bathrooms` - Number of bathrooms (required)
- ✅ `stay_beds` - Number of beds (required)
- ✅ `stay_sofa_beds` - Number of sofa beds (required)
- ✅ `stay_max_guests` - Maximum guests (required)

#### Pricing & Policies
- ✅ `stay_price` - Price per night (required, min $0.50)
- ✅ `stay_cleaning_fee` - Cleaning fee (optional)
- ✅ `stay_cancellation_policy` - Cancellation policy (required)
- ✅ `stay_check_in_time` - Check-in time (required)
- ✅ `stay_check_out_time` - Check-out time (required)

#### Images
- ✅ `stay_main_image` - Main image (required)
- ✅ `stay_additional_images[]` - Additional images (up to 20, optional)
- ✅ Image metadata (room type: Bedroom 1, Bathroom 1, Living Room, Kitchen, etc.)

#### Amenities
- ✅ `stay_amenities` - Selected amenities (array of amenity IDs)

#### Subtypes
- ✅ Stay subtypes (selected via checkboxes)

---

## Wizard Approach - Field Mapping

### Step 1: Listing Type & Basic Info
**Experiences:**
- ✅ `exp_title`
- ✅ `exp_description`
- ✅ `exp_length_hours`
- ✅ `exp_location`
- ✅ `exp_country`, `exp_city`, `exp_street`, `exp_building`, `exp_floor` (optional)

**Events:**
- ✅ `evt_title`
- ✅ `evt_description`
- ✅ `evt_date_start`, `evt_date_end`
- ✅ `evt_location`
- ✅ `evt_country`, `evt_city`, `evt_street`, `evt_building`, `evt_floor` (optional)

**Stays:**
- ✅ `stay_title`
- ✅ `stay_description`
- ✅ `stay_country`, `stay_city`, `stay_street`, `stay_building`, `stay_floor`
- ✅ `stay_property_type`

**Result: ✅ ALL BASIC FIELDS PRESERVED**

---

### Step 2: Details
**Experiences:**
- ✅ `exp_hour_start`, `exp_hour_end` (Operating hours)
- ✅ `exp_difficulty` (optional)
- ✅ `exp_min_age`, `exp_max_age` (optional)

**Events:**
- ✅ `evt_hour_start`, `evt_hour_end` (Availability hours)
- ✅ `evt_difficulty` (optional)
- ✅ `evt_min_age`, `evt_max_age` (optional)

**Stays:**
- ✅ `stay_bedrooms`, `stay_bathrooms`, `stay_beds`, `stay_sofa_beds`
- ✅ `stay_max_guests`
- ✅ `stay_check_in_time`, `stay_check_out_time`

**Result: ✅ ALL DETAIL FIELDS PRESERVED**

---

### Step 3: Pricing & Capacity
**Experiences:**
- ✅ `exp_price_per_person`
- ✅ `exp_price`
- ✅ `exp_max_guests`
- ✅ `exp_max_guests_per_price` (conditional)
- ✅ `exp_cancellation_policy`

**Events:**
- ✅ `evt_price_per_person`
- ✅ `evt_price`
- ✅ `evt_max_guests`
- ✅ `evt_max_guests_per_price` (conditional)
- ✅ `evt_cancellation_policy`

**Stays:**
- ✅ `stay_price`
- ✅ `stay_cleaning_fee` (optional)
- ✅ `stay_cancellation_policy`

**Result: ✅ ALL PRICING FIELDS PRESERVED**

---

### Step 4: Images
**All Types:**
- ✅ Main image upload
- ✅ Additional images (up to 20)
- ✅ Image categorization (room/category metadata)

**Result: ✅ ALL IMAGE FIELDS PRESERVED**

---

### Step 5: Additional Options
**Experiences:**
- ✅ `exp_what_to_bring` (optional)
- ✅ `exp_whats_included` (optional)
- ✅ `exp_additional_info` (optional)
- ✅ Experience subtypes

**Events:**
- ✅ `evt_what_to_bring` (optional)
- ✅ `evt_whats_included` (optional)
- ✅ `evt_additional_info` (optional)
- ✅ Event subtypes

**Stays:**
- ✅ `stay_amenities` (selected amenities)
- ✅ Stay subtypes

**Result: ✅ ALL ADDITIONAL OPTIONS PRESERVED**

---

### Step 6: Review & Submit
- ✅ Summary of all entered data
- ✅ Edit any section
- ✅ Submit

**Result: ✅ REVIEW AND SUBMIT PRESERVED**

---

## Conclusion

### ✅ NO FIELDS ARE REMOVED

The wizard approach:
1. **Preserves ALL fields** from the current form
2. **Reorganizes them** into logical, manageable steps
3. **Maintains all validation** rules
4. **Keeps all conditional logic** (e.g., group size for per-group pricing)
5. **Preserves all optional fields** (they remain optional in the wizard)

### Benefits Without Data Loss

- ✅ Better UX (less overwhelming)
- ✅ Progress tracking
- ✅ Draft saving capability
- ✅ Better mobile experience
- ✅ **ZERO data loss** - all fields preserved

### Implementation Note

When implementing the wizard, ensure:
1. All form field names remain identical (`exp_title`, `evt_title`, `stay_title`, etc.)
2. All validation rules are preserved
3. All conditional logic is maintained
4. Form submission collects all fields exactly as before
5. Backend API (`create-posting.php`) requires NO changes

---

## Verification Checklist

Before implementing wizard, verify:
- [ ] All field names match exactly
- [ ] All required fields are marked as required
- [ ] All optional fields remain optional
- [ ] All validation rules are preserved
- [ ] All conditional fields (group size, etc.) work correctly
- [ ] Image upload and metadata work correctly
- [ ] Subtype selection works correctly
- [ ] Amenity selection works correctly (for stays)
- [ ] Form submission sends all data to backend
- [ ] Backend API accepts all fields without modification

