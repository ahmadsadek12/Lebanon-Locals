# Posting.html - Wizard Approach

## Current Problem
- 2200+ line form is overwhelming
- All fields visible at once
- No progress tracking
- No draft saving
- Poor mobile experience

## Wizard Solution

### Step-by-Step Breakdown

#### **Step 1: Listing Type & Basic Info** (2-3 minutes)
- Select type: Experience / Event / Stay
- Title (required)
- Description (required, min 50 chars)
- Location (required)

**Progress: 1/6**

#### **Step 2: Details** (3-5 minutes)
**For Experiences:**
- Operating hours (start/end time)
- Length in hours
- Difficulty level
- Age requirements

**For Events:**
- Start date/time
- End date/time
- Recurring options

**For Stays:**
- Property type
- Number of bedrooms
- Number of bathrooms
- Number of beds
- Maximum guests

**Progress: 2/6**

#### **Step 3: Pricing & Capacity** (2-3 minutes)
- Price per person/group
- Maximum guests
- Cancellation policy
- Special pricing rules

**Progress: 3/6**

#### **Step 4: Images** (3-5 minutes)
- Main image upload
- Additional images (up to 20)
- Image categorization:
  - For stays: Room type (Bedroom 1, Bathroom 1, etc.)
  - For hostings: Category (General, Activity, Location, etc.)

**Progress: 4/6**

#### **Step 5: Additional Options** (2-3 minutes)
- Subtypes selection
- Amenities (for stays)
- Special features
- Rules/policies

**Progress: 5/6**

#### **Step 6: Review & Submit** (1-2 minutes)
- Summary of all entered data
- Edit any section
- Preview listing
- Submit for approval

**Progress: 6/6**

## Implementation

### HTML Structure
```html
<div class="posting-wizard">
    <!-- Progress Bar -->
    <div class="wizard-progress">
        <div class="progress-step" data-step="1">Basic Info</div>
        <div class="progress-step" data-step="2">Details</div>
        <div class="progress-step" data-step="3">Pricing</div>
        <div class="progress-step" data-step="4">Images</div>
        <div class="progress-step" data-step="5">Options</div>
        <div class="progress-step" data-step="6">Review</div>
    </div>
    
    <!-- Wizard Steps -->
    <form id="posting-form">
        <div class="wizard-step active" data-step="1">
            <!-- Step 1 content -->
        </div>
        <div class="wizard-step" data-step="2">
            <!-- Step 2 content -->
        </div>
        <!-- ... more steps ... -->
    </form>
    
    <!-- Navigation -->
    <div class="wizard-nav">
        <button type="button" class="btn-prev" disabled>Previous</button>
        <button type="button" class="btn-save-draft">Save Draft</button>
        <button type="button" class="btn-next">Next</button>
        <button type="submit" class="btn-submit" style="display: none;">Submit</button>
    </div>
</div>
```

### JavaScript Logic
```javascript
class PostingWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        this.formData = {};
        this.init();
    }
    
    init() {
        this.loadDraft();
        this.setupNavigation();
        this.setupValidation();
    }
    
    nextStep() {
        if (this.validateStep(this.currentStep)) {
            this.saveStepData();
            this.currentStep++;
            this.updateUI();
        }
    }
    
    prevStep() {
        this.currentStep--;
        this.updateUI();
    }
    
    saveDraft() {
        localStorage.setItem('posting_draft', JSON.stringify(this.formData));
        // Also save to server
    }
    
    loadDraft() {
        const draft = localStorage.getItem('posting_draft');
        if (draft) {
            this.formData = JSON.parse(draft);
            this.populateForm();
        }
    }
}
```

## Benefits

1. **Less Overwhelming** - One step at a time
2. **Better Mobile UX** - Smaller forms per step
3. **Progress Tracking** - User knows where they are
4. **Draft Saving** - Can save and continue later
5. **Better Validation** - Validate per step
6. **Lower Abandonment** - Less likely to give up

## Estimated Time Savings
- Current: 15-20 minutes (overwhelming)
- Wizard: 12-15 minutes (guided, less overwhelming)

