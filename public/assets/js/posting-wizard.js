/**
 * Posting Wizard Controller
 * Manages multi-step form navigation and draft saving
 */

(function() {
    'use strict';

    class PostingWizard {
        constructor() {
            this.currentStep = 0; // Start at type selection
            this.totalSteps = 6;
            this.listingType = null; // No default, force user to select

            this.init();
        }

        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupWizard());
            } else {
                this.setupWizard();
            }
        }

        setupWizard() {
            // Setup progress bar
            this.setupProgressBar();

            // Setup navigation
            this.setupNavigation();

            // Setup type selection button
            this.setupTypeSelection();

            // Show step 0 (listing type selection) initially
            const step0 = document.querySelector('.wizard-step[data-step="0"]');
            if (step0) {
                step0.style.display = 'block';
                step0.classList.add('active');
            }

            // Hide wizard navigation until listing type is selected
            const wizardNav = document.querySelector('.wizard-navigation');
            if (wizardNav) {
                wizardNav.style.display = 'none';
            }

            // Update field validation for initial state
            this.updateFieldValidation();
        }

        setupTypeSelection() {
            // Add "Continue" button after type selection
            const step0 = document.querySelector('.wizard-step[data-step="0"]');
            if (!step0) return;

            // Check if button already exists
            let continueBtn = step0.querySelector('.type-continue-btn');
            if (!continueBtn) {
                continueBtn = document.createElement('button');
                continueBtn.type = 'button';
                continueBtn.className = 'wizard-nav-btn wizard-btn-next type-continue-btn';
                continueBtn.innerHTML = 'Continue <i class="fa fa-arrow-right"></i>';
                continueBtn.style.marginTop = '24px';
                continueBtn.style.display = 'none';
                step0.querySelector('.form-section').appendChild(continueBtn);
            }

            const self = this;

            // Listen for type option clicks
            const typeOptions = document.querySelectorAll('.type-option');
            typeOptions.forEach(option => {
                option.addEventListener('click', function(e) {
                    // Remove active class from all
                    typeOptions.forEach(opt => opt.classList.remove('active'));
                    // Add active to clicked
                    this.classList.add('active');

                    // Check the radio
                    const radio = this.querySelector('input[type="radio"]');
                    if (radio) {
                        radio.checked = true;
                        self.listingType = radio.value;
                        console.log('[WIZARD] Type selected:', self.listingType);

                        // Show continue button
                        continueBtn.style.display = 'flex';

                        // Update step visibility for the selected type
                        self.updateStepVisibility();
                    }
                });
            });

            // Continue button handler
            continueBtn.addEventListener('click', () => {
                if (self.listingType) {
                    self.showStep(1);
                }
            });
        }

        setupProgressBar() {
            const progressBar = document.querySelector('.wizard-progress-bar');
            if (!progressBar) return;

            // Update progress bar width
            this.updateProgressBar();
            
            // Make steps clickable (for review)
            document.querySelectorAll('.progress-step').forEach((step, index) => {
                step.addEventListener('click', () => {
                    const stepNum = index + 1;
                    // Only allow clicking on completed steps or current step
                    if (stepNum <= this.currentStep || stepNum === this.currentStep) {
                        this.showStep(stepNum);
                    }
                });
            });
        }

        updateProgressBar() {
            const progressBar = document.querySelector('.wizard-progress-bar');
            if (!progressBar) return;
            
            const percentage = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
            progressBar.style.width = `${percentage}%`;
        }

        setupNavigation() {
            const prevBtn = document.querySelector('.wizard-btn-prev');
            const nextBtn = document.querySelector('.wizard-btn-next');
            const submitBtn = document.querySelector('.wizard-btn-submit');

            if (prevBtn) {
                prevBtn.addEventListener('click', () => this.prevStep());
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.nextStep());
            }

            if (submitBtn) {
                submitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Validate final step first
                    if (this.validateStep(this.currentStep)) {
                        // Disable validation on hidden fields before submission
                        this.disableValidationOnHiddenFields();
                        // Trigger form submission - the existing handler in posting.js will take over
                        const form = document.getElementById('posting-form');
                        if (form) {
                            // Use requestSubmit to trigger validation and submit handlers
                            // If submission fails, re-enable validation
                            try {
                                form.requestSubmit();
                            } catch (error) {
                                // If validation fails, re-enable validation on hidden fields
                                this.enableValidationOnHiddenFields();
                                throw error;
                            }
                        }
                    } else {
                        this.showStepError();
                    }
                });
            }
        }

        showStep(stepNumber) {
            // Validate step number
            if (stepNumber < 1 || stepNumber > this.totalSteps) {
                return;
            }

            // Hide step 0 (listing type selection) when moving to step 1
            if (stepNumber === 1) {
                const step0 = document.querySelector('.wizard-step[data-step="0"]');
                if (step0) {
                    step0.style.display = 'none';
                }
                // Show wizard navigation when listing type is selected
                const wizardNav = document.querySelector('.wizard-navigation');
                if (wizardNav) {
                    wizardNav.style.display = 'flex';
                }
            }

            // Hide all steps for current listing type
            document.querySelectorAll(`.wizard-step[data-listing-type="${this.listingType}"]`).forEach(step => {
                step.classList.remove('active');
                step.style.display = 'none';
            });

            // Show current step for current listing type
            const currentStepEl = document.querySelector(`.wizard-step[data-step="${stepNumber}"][data-listing-type="${this.listingType}"]`);
            if (currentStepEl) {
                currentStepEl.classList.add('active');
                currentStepEl.style.display = 'block';
            }

            // Update progress indicators
            document.querySelectorAll('.progress-step').forEach((step, index) => {
                const stepNum = index + 1;
                step.classList.remove('active', 'completed');
                
                if (stepNum === stepNumber) {
                    step.classList.add('active');
                } else if (stepNum < stepNumber) {
                    step.classList.add('completed');
                }
            });

            this.currentStep = stepNumber;
            this.updateProgressBar();
            this.updateNavigation();
            
            // Update validation on fields based on visibility
            this.updateFieldValidation();
            
            // If step 6 (review), generate review summary
            if (stepNumber === 6) {
                this.generateReviewSummary();
            }
            
            // Scroll to top of form
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        updateStepVisibility() {
            // Show/hide steps based on listing type
            console.log('[WIZARD] Updating step visibility for listing type:', this.listingType);
            const steps = document.querySelectorAll('.wizard-step');
            steps.forEach(step => {
                const stepType = step.dataset.listingType;
                const stepNumber = parseInt(step.dataset.step);
                
                // Step 0 (listing type selection) should be hidden if we're past step 1
                if (stepNumber === 0 && this.currentStep > 0) {
                    step.style.display = 'none';
                    step.classList.remove('active');
                    return;
                }
                
                if (stepType && stepType !== this.listingType && stepType !== 'all') {
                    // Hide steps that don't match current listing type
                    step.style.display = 'none';
                    step.classList.remove('active');
                } else if (stepType === this.listingType || stepType === 'all') {
                    // Show steps that match current listing type or are for all types
                    // But don't show them yet - showStep() will handle that
                    if (stepNumber === 0 && this.currentStep === 0) {
                        step.style.display = 'block';
                    } else if (stepNumber > 0) {
                        // Keep hidden until showStep() is called
                        step.style.display = '';
                    }
                }
            });
            
            // Update field validation after visibility changes
            this.updateFieldValidation();
        }

        updateNavigation() {
            const prevBtn = document.querySelector('.wizard-btn-prev');
            const nextBtn = document.querySelector('.wizard-btn-next');
            const submitBtn = document.querySelector('.wizard-btn-submit');

            // Previous button
            if (prevBtn) {
                prevBtn.disabled = this.currentStep === 1;
                prevBtn.style.display = this.currentStep > 1 ? 'flex' : 'none';
            }

            // Submit button - show only on step 6 (review step)
            if (submitBtn) {
                submitBtn.style.display = this.currentStep === this.totalSteps ? 'flex' : 'none';
                if (this.currentStep === this.totalSteps) {
                    submitBtn.classList.add('show');
                } else {
                    submitBtn.classList.remove('show');
                }
            }

            // Next button - hide whenever submit button is showing
            if (nextBtn) {
                const isSubmitVisible = submitBtn && submitBtn.style.display === 'flex';
                nextBtn.style.display = isSubmitVisible ? 'none' : 'flex';
            }
        }

        generateReviewSummary() {
            const form = document.getElementById('posting-form');
            if (!form || !this.listingType) return;

            let summaryHTML = '<div class="review-summary-content">';
            
            if (this.listingType === 'experience') {
                const summaryEl = document.getElementById('exp-review-summary');
                if (!summaryEl) return;

                const title = document.getElementById('exp_title')?.value || 'Not provided';
                const description = document.getElementById('exp_description')?.value || 'Not provided';
                const price = document.getElementById('exp_price')?.value || 'Not provided';
                const maxGuests = document.getElementById('exp_max_guests')?.value || 'Not provided';
                const hourStart = document.getElementById('exp_hour_start')?.value || 'Not provided';
                const hourEnd = document.getElementById('exp_hour_end')?.value || 'Not provided';
                const country = document.getElementById('exp_country')?.value || 'Not provided';
                const city = document.getElementById('exp_city')?.value || 'Not provided';
                const street = document.getElementById('exp_street')?.value || 'Not provided';
                const building = document.getElementById('exp_building')?.value || 'Not provided';

                summaryHTML += `
                    <h3>Basic Information</h3>
                    <p><strong>Title:</strong> ${title}</p>
                    <p><strong>Description:</strong> ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}</p>
                    
                    <h3>Operating Hours</h3>
                    <p><strong>Opening Time:</strong> ${hourStart}</p>
                    <p><strong>Closing Time:</strong> ${hourEnd}</p>
                    
                    <h3>Guests & Pricing</h3>
                    <p><strong>Price:</strong> $${price}</p>
                    <p><strong>Max Guests:</strong> ${maxGuests}</p>
                    
                    <h3>Location</h3>
                    <p><strong>Address:</strong> ${street}, ${building}, ${city}, ${country}</p>
                `;
                
                summaryEl.innerHTML = summaryHTML + '</div>';
            } else if (this.listingType === 'event') {
                const summaryEl = document.getElementById('evt-review-summary');
                if (!summaryEl) return;

                const title = document.getElementById('evt_title')?.value || 'Not provided';
                const description = document.getElementById('evt_description')?.value || 'Not provided';
                const price = document.getElementById('evt_price')?.value || 'Not provided';
                const maxGuests = document.getElementById('evt_max_guests')?.value || 'Not provided';
                const dateStart = document.getElementById('evt_date_start')?.value || 'Not provided';
                const dateEnd = document.getElementById('evt_date_end')?.value || 'Not provided';
                const hourStart = document.getElementById('evt_hour_start')?.value || 'Not provided';
                const hourEnd = document.getElementById('evt_hour_end')?.value || 'Not provided';
                const country = document.getElementById('evt_country')?.value || 'Not provided';
                const city = document.getElementById('evt_city')?.value || 'Not provided';
                const street = document.getElementById('evt_street')?.value || 'Not provided';
                const building = document.getElementById('evt_building')?.value || 'Not provided';

                summaryHTML += `
                    <h3>Basic Information</h3>
                    <p><strong>Title:</strong> ${title}</p>
                    <p><strong>Description:</strong> ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}</p>
                    
                    <h3>Event Dates</h3>
                    <p><strong>Start Date:</strong> ${dateStart}</p>
                    <p><strong>End Date:</strong> ${dateEnd}</p>
                    
                    <h3>Availability Hours</h3>
                    <p><strong>Opening Time:</strong> ${hourStart}</p>
                    <p><strong>Closing Time:</strong> ${hourEnd}</p>
                    
                    <h3>Guests & Pricing</h3>
                    <p><strong>Price:</strong> $${price}</p>
                    <p><strong>Max Guests:</strong> ${maxGuests}</p>
                    
                    <h3>Location</h3>
                    <p><strong>Address:</strong> ${street}, ${building}, ${city}, ${country}</p>
                `;
                
                summaryEl.innerHTML = summaryHTML + '</div>';
            } else if (this.listingType === 'stay') {
                const summaryEl = document.getElementById('stay-review-summary');
                if (!summaryEl) return;

                const title = document.getElementById('stay_title')?.value || 'Not provided';
                const description = document.getElementById('stay_description')?.value || 'Not provided';
                const pricePerNight = document.getElementById('stay_price_per_night')?.value || 'Not provided';
                const maxGuests = document.getElementById('stay_max_guests')?.value || 'Not provided';
                const bedrooms = document.getElementById('stay_number_of_bedrooms')?.value || 'Not provided';
                const bathrooms = document.getElementById('stay_number_of_bathrooms')?.value || 'Not provided';
                const checkIn = document.getElementById('stay_check_in_time')?.value || 'Not provided';
                const checkOut = document.getElementById('stay_check_out_time')?.value || 'Not provided';
                const country = document.getElementById('stay_country')?.value || 'Not provided';
                const city = document.getElementById('stay_city')?.value || 'Not provided';
                const street = document.getElementById('stay_street')?.value || 'Not provided';
                const building = document.getElementById('stay_building')?.value || 'Not provided';

                summaryHTML += `
                    <h3>Basic Information</h3>
                    <p><strong>Title:</strong> ${title}</p>
                    <p><strong>Description:</strong> ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}</p>
                    
                    <h3>Capacity & Rooms</h3>
                    <p><strong>Max Guests:</strong> ${maxGuests}</p>
                    <p><strong>Bedrooms:</strong> ${bedrooms}</p>
                    <p><strong>Bathrooms:</strong> ${bathrooms}</p>
                    
                    <h3>Pricing</h3>
                    <p><strong>Price per Night:</strong> $${pricePerNight}</p>
                    
                    <h3>Check-in/Check-out</h3>
                    <p><strong>Check-in Time:</strong> ${checkIn}</p>
                    <p><strong>Check-out Time:</strong> ${checkOut}</p>
                    
                    <h3>Location</h3>
                    <p><strong>Address:</strong> ${street}, ${building}, ${city}, ${country}</p>
                `;
                
                summaryEl.innerHTML = summaryHTML + '</div>';
            }
        }

        validateStep(stepNumber) {
            const stepEl = document.querySelector(`.wizard-step[data-step="${stepNumber}"][data-listing-type="${this.listingType}"]`);
            if (!stepEl) return true;

            // Get all required fields in this step
            const requiredFields = stepEl.querySelectorAll('[required]');
            let isValid = true;
            const firstInvalid = [];

            requiredFields.forEach(field => {
                // Skip hidden fields (from other listing types)
                if (field.offsetParent === null) return;
                
                // Skip fields that are in inactive forms
                const isInActiveForm = field.closest('.experience-form.active, .event-form.active, .stay-form.active');
                if (!isInActiveForm && field.closest('.experience-form, .event-form, .stay-form')) {
                    return; // Field is in an inactive form type
                }

                let fieldValid = true;
                
                if (field.type === 'file') {
                    if (!field.files || field.files.length === 0) {
                        fieldValid = false;
                    }
                } else if (field.type === 'checkbox' || field.type === 'radio') {
                    // For checkboxes/radios, check if at least one in the group is checked
                    const name = field.name;
                    const group = document.querySelectorAll(`[name="${name}"]`);
                    const hasChecked = Array.from(group).some(f => f.checked);
                    if (!hasChecked) {
                        fieldValid = false;
                    }
                } else {
                    if (!field.value || field.value.trim() === '') {
                        fieldValid = false;
                    }
                }

                if (!fieldValid) {
                    isValid = false;
                    if (firstInvalid.length === 0) {
                        firstInvalid.push(field);
                    }
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });

            // Custom validation for specific steps
            if (stepNumber === 1) {
                // Validate description length
                const descInput = this.listingType === 'experience' ? 
                    document.getElementById('exp_description') :
                    this.listingType === 'event' ?
                    document.getElementById('evt_description') :
                    document.getElementById('stay_description');
                
                if (descInput && descInput.value.length < 50) {
                    isValid = false;
                    if (firstInvalid.length === 0) {
                        firstInvalid.push(descInput);
                    }
                    descInput.classList.add('error');
                }
            }

            // Custom validation for step 4 (images) - ensure main image is uploaded
            if (stepNumber === 4) {
                const mainImageInput = this.listingType === 'experience' ? 
                    document.getElementById('exp_main_image') :
                    this.listingType === 'event' ?
                    document.getElementById('evt_main_image') :
                    document.getElementById('stay_main_image');
                
                if (mainImageInput) {
                    // Ensure it has required attribute
                    if (!mainImageInput.hasAttribute('required')) {
                        mainImageInput.setAttribute('required', 'required');
                    }
                    
                    // Validate that a file is selected
                    if (!mainImageInput.files || mainImageInput.files.length === 0) {
                        isValid = false;
                        if (firstInvalid.length === 0) {
                            firstInvalid.push(mainImageInput);
                        }
                        mainImageInput.classList.add('error');
                    } else {
                        mainImageInput.classList.remove('error');
                    }
                }
            }

            // Scroll to first invalid field
            if (!isValid && firstInvalid.length > 0) {
                firstInvalid[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalid[0].focus();
            }

            return isValid;
        }

        nextStep() {
            if (this.validateStep(this.currentStep)) {
                if (this.currentStep < this.totalSteps) {
                    this.showStep(this.currentStep + 1);
                }
            } else {
                this.showStepError();
            }
        }

        prevStep() {
            if (this.currentStep > 1) {
                this.showStep(this.currentStep - 1);
            }
        }


        showStepError() {
            const alertDiv = document.getElementById('alert');
            if (alertDiv) {
                alertDiv.textContent = 'Please fill in all required fields before continuing.';
                alertDiv.className = 'alert error';
                alertDiv.style.display = 'block';
                setTimeout(() => {
                    alertDiv.style.display = 'none';
                }, 5000);
            }
        }

        /**
         * Update validation on fields based on their visibility
         * Only fields in visible steps for the current listing type should be required
         */
        updateFieldValidation() {
            const form = document.getElementById('posting-form');
            if (!form) return;

            // First, restore all fields that were previously disabled
            const previouslyDisabled = form.querySelectorAll('[data-was-required="true"]');
            previouslyDisabled.forEach(field => {
                field.setAttribute('required', 'required');
                delete field.dataset.wasRequired;
            });

            // Now disable validation on hidden fields
            const allRequiredFields = form.querySelectorAll('[required]');
            
            allRequiredFields.forEach(field => {
                // Check if field is in a wizard step
                const step = field.closest('.wizard-step');
                if (step) {
                    const stepType = step.dataset.listingType;
                    const stepNumber = parseInt(step.dataset.step);
                    
                    // Field is hidden if:
                    // 1. Step is hidden (display: none)
                    // 2. Step is not active
                    // 3. Step belongs to a different listing type (and not 'all')
                    // 4. Step is step 0 (listing type selection) and we're past step 1
                    const isHidden = step.style.display === 'none' || 
                                   (!step.classList.contains('active') && step.style.display !== 'block') ||
                                   (stepType && stepType !== this.listingType && stepType !== 'all') ||
                                   (stepNumber === 0 && this.currentStep > 0);
                    
                    if (isHidden) {
                        // Remove required attribute and store it
                        field.removeAttribute('required');
                        field.dataset.wasRequired = 'true';
                    }
                } else {
                    // Field not in a wizard step - check if it's visible
                    const isVisible = field.offsetParent !== null;
                    if (!isVisible) {
                        field.removeAttribute('required');
                        field.dataset.wasRequired = 'true';
                    }
                }
            });
        }

        /**
         * Disable validation on hidden fields to prevent browser validation errors
         * This is called before form submission to ensure only visible fields are validated
         */
        disableValidationOnHiddenFields() {
            // This method now just calls updateFieldValidation for consistency
            this.updateFieldValidation();
        }

        /**
         * Re-enable validation on fields that were temporarily disabled
         */
        enableValidationOnHiddenFields() {
            const form = document.getElementById('posting-form');
            if (!form) return;

            const disabledFields = form.querySelectorAll('[data-was-required="true"]');
            disabledFields.forEach(field => {
                field.setAttribute('required', 'required');
                delete field.dataset.wasRequired;
            });
        }
    }

    // Initialize wizard when window is fully loaded
    function initWizard() {
        if (typeof PostingWizard === 'undefined') {
            console.warn('[WIZARD] PostingWizard class not found, retrying...');
            setTimeout(initWizard, 100);
            return;
        }

        // Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    window.postingWizard = new PostingWizard();
                    console.log('[WIZARD] Initialized with listing type:', window.postingWizard.listingType);
                }, 200);
            });
        } else if (document.readyState === 'interactive') {
            // DOM is loading, wait for it to complete
            window.addEventListener('load', () => {
                setTimeout(() => {
                    window.postingWizard = new PostingWizard();
                    console.log('[WIZARD] Initialized with listing type:', window.postingWizard.listingType);
                }, 100);
            });
        } else {
            // DOM is complete, initialize immediately
            setTimeout(() => {
                window.postingWizard = new PostingWizard();
                console.log('[WIZARD] Initialized with listing type:', window.postingWizard.listingType);
            }, 200);
        }
    }

    // Start initialization
    initWizard();

})();

