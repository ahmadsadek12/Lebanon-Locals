// Check if user is a host (with retry for auth loading)
        let accessGranted = false;
        
        function checkHostAccess(isFinalCheck = false) {
            // If access already granted, don't check again
            if (accessGranted) return;
            
            
            if (window.Auth && window.Auth.isAuthenticated()) {
                const currentUser = window.Auth.getCurrentUser();
                
                if (currentUser && (currentUser.user_type === 'host' || currentUser.user_type === 'admin')) {
                    accessGranted = true;
                    return; // All good, user is a host or admin
                } else if (currentUser) {
                    alert('You must be a host to create postings. Please become a host first.');
                    window.location.href = 'become-host.html';
                } else {
                    // currentUser is null, auth still loading
                    console.log('[POSTING] ⏳ Auth still loading, retrying...');
                }
            } else {
                // Not authenticated - but only redirect on final check
                if (isFinalCheck) {
                    alert('Please sign in as a host to create postings');
                    window.location.href = 'index.html';
                } else {
                    console.log('[POSTING] ⏳ Auth not ready yet, will retry...');
                }
            }
        }

        // Wait for Auth to be available, then check access
        function waitForAuthAndCheck() {
            if (typeof window.Auth !== 'undefined' && window.Auth.isAuthenticated) {
                // Auth is loaded, check access
                checkHostAccess(false);
                setTimeout(() => checkHostAccess(false), 500);
                setTimeout(() => checkHostAccess(true), 2000); // Final check after 2 seconds
            } else {
                // Auth not loaded yet, retry
                console.log('[POSTING] ⏳ Waiting for Auth module to load...');
                setTimeout(waitForAuthAndCheck, 100);
            }
        }
        
        // Start checking once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', waitForAuthAndCheck);
        } else {
            waitForAuthAndCheck();
        }
        
        // Also check on auth state change
        document.addEventListener('authStateChanged', () => checkHostAccess(false));

        // Handle listing type selection
        const typeOptions = document.querySelectorAll('.type-option');
        const experienceForm = document.querySelector('.experience-form');
        const eventForm = document.querySelector('.event-form');
        const stayForm = document.querySelector('.stay-form');

        // Function to disable required fields in a form
        function disableFormValidation(formElement) {
            const requiredInputs = formElement.querySelectorAll('[required]');
            requiredInputs.forEach(input => {
                input.removeAttribute('required');
                input.dataset.wasRequired = 'true';
            });
        }

        // Function to enable required fields in a form
        function enableFormValidation(formElement) {
            const inputs = formElement.querySelectorAll('[data-was-required="true"]');
            inputs.forEach(input => {
                input.setAttribute('required', 'required');
            });
        }

        // Initially disable validation for hidden forms
        disableFormValidation(eventForm);
        disableFormValidation(stayForm);

        // Experience Opening Time - Combine hour, minute, AM/PM into 24-hour format
        const expOpenHour = document.getElementById('exp_open_hour');
        const expOpenMinute = document.getElementById('exp_open_minute');
        const expOpenAmpm = document.getElementById('exp_open_ampm');
        const expHourStart = document.getElementById('exp_hour_start');

        function updateExpOpeningTime() {
            const hour = expOpenHour.value;
            const minute = expOpenMinute.value;
            const ampm = expOpenAmpm.value;

            if (hour && minute && ampm) {
                let hour24 = parseInt(hour);
                if (ampm === 'PM' && hour24 !== 12) {
                    hour24 += 12;
                } else if (ampm === 'AM' && hour24 === 12) {
                    hour24 = 0;
                }
                expHourStart.value = `${String(hour24).padStart(2, '0')}:${minute}`;
            }
        }

        expOpenHour.addEventListener('change', updateExpOpeningTime);
        expOpenMinute.addEventListener('change', updateExpOpeningTime);
        expOpenAmpm.addEventListener('change', updateExpOpeningTime);

        // Experience Closing Time - Combine hour, minute, AM/PM into 24-hour format
        const expCloseHour = document.getElementById('exp_close_hour');
        const expCloseMinute = document.getElementById('exp_close_minute');
        const expCloseAmpm = document.getElementById('exp_close_ampm');
        const expHourEnd = document.getElementById('exp_hour_end');

        function updateExpClosingTime() {
            const hour = expCloseHour.value;
            const minute = expCloseMinute.value;
            const ampm = expCloseAmpm.value;

            if (hour && minute && ampm) {
                let hour24 = parseInt(hour);
                if (ampm === 'PM' && hour24 !== 12) {
                    hour24 += 12;
                } else if (ampm === 'AM' && hour24 === 12) {
                    hour24 = 0;
                }
                expHourEnd.value = `${String(hour24).padStart(2, '0')}:${minute}`;
            }
        }

        expCloseHour.addEventListener('change', updateExpClosingTime);
        expCloseMinute.addEventListener('change', updateExpClosingTime);
        expCloseAmpm.addEventListener('change', updateExpClosingTime);

        // Event Opening Time - Combine hour, minute, AM/PM into 24-hour format
        const evtOpenHour = document.getElementById('evt_open_hour');
        const evtOpenMinute = document.getElementById('evt_open_minute');
        const evtOpenAmpm = document.getElementById('evt_open_ampm');
        const evtHourStart = document.getElementById('evt_hour_start');

        function updateEvtOpeningTime() {
            const hour = evtOpenHour.value;
            const minute = evtOpenMinute.value;
            const ampm = evtOpenAmpm.value;

            if (hour && minute && ampm) {
                let hour24 = parseInt(hour);
                if (ampm === 'PM' && hour24 !== 12) {
                    hour24 += 12;
                } else if (ampm === 'AM' && hour24 === 12) {
                    hour24 = 0;
                }
                evtHourStart.value = `${String(hour24).padStart(2, '0')}:${minute}`;
            }
        }

        evtOpenHour.addEventListener('change', updateEvtOpeningTime);
        evtOpenMinute.addEventListener('change', updateEvtOpeningTime);
        evtOpenAmpm.addEventListener('change', updateEvtOpeningTime);

        // Event Closing Time - Combine hour, minute, AM/PM into 24-hour format
        const evtCloseHour = document.getElementById('evt_close_hour');
        const evtCloseMinute = document.getElementById('evt_close_minute');
        const evtCloseAmpm = document.getElementById('evt_close_ampm');
        const evtHourEnd = document.getElementById('evt_hour_end');

        function updateEvtClosingTime() {
            const hour = evtCloseHour.value;
            const minute = evtCloseMinute.value;
            const ampm = evtCloseAmpm.value;

            if (hour && minute && ampm) {
                let hour24 = parseInt(hour);
                if (ampm === 'PM' && hour24 !== 12) {
                    hour24 += 12;
                } else if (ampm === 'AM' && hour24 === 12) {
                    hour24 = 0;
                }
                evtHourEnd.value = `${String(hour24).padStart(2, '0')}:${minute}`;
            }
        }

        evtCloseHour.addEventListener('change', updateEvtClosingTime);
        evtCloseMinute.addEventListener('change', updateEvtClosingTime);
        evtCloseAmpm.addEventListener('change', updateEvtClosingTime);

        typeOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove active class from all
                typeOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked
                this.classList.add('active');
                // Check the radio inside
                this.querySelector('input[type="radio"]').checked = true;

                // Show appropriate form and manage validation
                const type = this.dataset.type;
                experienceForm.classList.remove('active');
                eventForm.classList.remove('active');
                stayForm.classList.remove('active');

                // Disable validation for all forms
                disableFormValidation(experienceForm);
                disableFormValidation(eventForm);
                disableFormValidation(stayForm);

                // Enable validation and show only the selected form
                if (type === 'experience') {
                    experienceForm.classList.add('active');
                    enableFormValidation(experienceForm);
                } else if (type === 'event') {
                    eventForm.classList.add('active');
                    enableFormValidation(eventForm);
                } else if (type === 'stay') {
                    stayForm.classList.add('active');
                    enableFormValidation(stayForm);
                }
            });
        });

        // Character counters - Experience
        const titleInput = document.getElementById('exp_title');
        const titleCounter = document.getElementById('title-counter');
        const descInput = document.getElementById('exp_description');
        const descCounter = document.getElementById('description-counter');

        titleInput.addEventListener('input', function() {
            titleCounter.textContent = `${this.value.length} / 100 characters`;
        });

        descInput.addEventListener('input', function() {
            const length = this.value.length;
            descCounter.textContent = `${length} characters ${length < 50 ? '(minimum 50)' : ''}`;
            if (length < 50) {
                descCounter.style.color = '#dc2626';
            } else {
                descCounter.style.color = '#717171';
            }
        });

        // Character counters - Event
        const evtTitleInput = document.getElementById('evt_title');
        const evtTitleCounter = document.getElementById('evt_title_counter');
        const evtDescInput = document.getElementById('evt_description');
        const evtDescCounter = document.getElementById('evt_description_counter');

        evtTitleInput.addEventListener('input', function() {
            evtTitleCounter.textContent = `${this.value.length} / 100 characters`;
        });

        evtDescInput.addEventListener('input', function() {
            const length = this.value.length;
            evtDescCounter.textContent = `${length} characters ${length < 50 ? '(minimum 50)' : ''}`;
            if (length < 50) {
                evtDescCounter.style.color = '#dc2626';
            } else {
                evtDescCounter.style.color = '#717171';
            }
        });

        // Character counters - Stay
        const stayTitleInput = document.getElementById('stay_title');
        const stayTitleCounter = document.getElementById('stay_title_counter');
        const stayDescInput = document.getElementById('stay_description');
        const stayDescCounter = document.getElementById('stay_description_counter');

        stayTitleInput.addEventListener('input', function() {
            stayTitleCounter.textContent = `${this.value.length} / 20 characters`;
        });

        stayDescInput.addEventListener('input', function() {
            const length = this.value.length;
            stayDescCounter.textContent = `${length} characters ${length < 50 ? '(minimum 50)' : ''}`;
            if (length < 50) {
                stayDescCounter.style.color = '#dc2626';
            } else {
                stayDescCounter.style.color = '#717171';
            }
        });

        // Pricing type toggle - Experience
        const perPersonRadio = document.getElementById('exp_per_person');
        const perGroupRadio = document.getElementById('exp_per_group');
        const groupSizeField = document.getElementById('group-size-field');

        function updatePricingFields() {
            if (perGroupRadio.checked) {
                groupSizeField.classList.add('show');
                document.getElementById('exp_max_guests_per_price').required = true;
            } else {
                groupSizeField.classList.remove('show');
                document.getElementById('exp_max_guests_per_price').required = false;
            }
        }

        perPersonRadio.addEventListener('change', updatePricingFields);
        perGroupRadio.addEventListener('change', updatePricingFields);

        // Pricing type toggle - Event
        const evtPerPersonRadio = document.getElementById('evt_per_person');
        const evtPerGroupRadio = document.getElementById('evt_per_group');
        const evtGroupSizeField = document.getElementById('evt_group_size_field');

        function updateEvtPricingFields() {
            if (evtPerGroupRadio.checked) {
                evtGroupSizeField.classList.add('show');
                document.getElementById('evt_max_guests_per_price').required = true;
            } else {
                evtGroupSizeField.classList.remove('show');
                document.getElementById('evt_max_guests_per_price').required = false;
            }
        }

        evtPerPersonRadio.addEventListener('change', updateEvtPricingFields);
        evtPerGroupRadio.addEventListener('change', updateEvtPricingFields);

        // Main image preview - Experience
        const imageInput = document.getElementById('exp_main_image');
        const imagePreview = document.getElementById('exp_image_preview');
        const previewImg = document.getElementById('exp_preview_img');

        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        // Main image preview - Event
        const evtImageInput = document.getElementById('evt_main_image');
        const evtImagePreview = document.getElementById('evt_image_preview');
        const evtPreviewImg = document.getElementById('evt_preview_img');

        evtImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    evtPreviewImg.src = e.target.result;
                    evtImagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        // Store image metadata (category/room) with file indices
        const imageMetadata = {
            exp: [],
            evt: [],
            stay: []
        };

        // Additional images preview - Experience
        const additionalImagesInput = document.getElementById('exp_additional_images');
        const additionalPreviewContainer = document.getElementById('exp_additional_preview');

        additionalImagesInput.addEventListener('change', function(e) {
            let files = Array.from(e.target.files);
            const maxImages = 20;
            
            // Limit to 20 images
            if (files.length > maxImages) {
                alert(`You can only upload up to ${maxImages} additional images. Only the first ${maxImages} will be selected.`);
                files = files.slice(0, maxImages);
                
                // Create new FileList with limited files
                const dt = new DataTransfer();
                files.forEach(file => dt.items.add(file));
                this.files = dt.files;
            }
            
            // Update image count after limiting
            const countElement = document.getElementById('exp_image_count');
            if (countElement) {
                const count = files.length;
                countElement.textContent = `${count} image${count !== 1 ? 's' : ''} selected (max ${maxImages})`;
                countElement.style.color = count > maxImages ? '#dc2626' : '#717171';
            }
            
            additionalPreviewContainer.innerHTML = '';
            imageMetadata.exp = [];
            
            files.forEach((file, index) => {
                // Initialize metadata for this file index
                imageMetadata.exp[index] = { category: 'General' };
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgWrapper = document.createElement('div');
                    imgWrapper.style.position = 'relative';
                    imgWrapper.dataset.fileIndex = index;
                    imgWrapper.style.marginBottom = '16px';
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '100%';
                    img.style.height = '150px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    img.style.border = '2px solid #EBEBEB';
                    img.style.marginBottom = '8px';
                    
                    // Category input for experiences/events
                    const categoryLabel = document.createElement('label');
                    categoryLabel.textContent = 'Category:';
                    categoryLabel.style.display = 'block';
                    categoryLabel.style.fontSize = '12px';
                    categoryLabel.style.fontWeight = '600';
                    categoryLabel.style.marginBottom = '4px';
                    categoryLabel.style.color = '#222';
                    
                    const categoryInput = document.createElement('input');
                    categoryInput.type = 'text';
                    categoryInput.placeholder = 'e.g., Activity, Location, Group';
                    categoryInput.className = 'image-category-input';
                    categoryInput.value = 'General';
                    categoryInput.style.width = '100%';
                    categoryInput.style.padding = '8px';
                    categoryInput.style.border = '1px solid #DDDDDD';
                    categoryInput.style.borderRadius = '4px';
                    categoryInput.style.fontSize = '14px';
                    categoryInput.dataset.fileIndex = index;
                    
                    categoryInput.addEventListener('change', function() {
                        if (imageMetadata.exp[index]) {
                            imageMetadata.exp[index].category = this.value || 'General';
                        }
                    });
                    
                    imgWrapper.appendChild(img);
                    imgWrapper.appendChild(categoryLabel);
                    imgWrapper.appendChild(categoryInput);
                    additionalPreviewContainer.appendChild(imgWrapper);
                };
                reader.readAsDataURL(file);
            });
        });

        // Additional images preview - Event
        const evtAdditionalImagesInput = document.getElementById('evt_additional_images');
        const evtAdditionalPreviewContainer = document.getElementById('evt_additional_preview');

        evtAdditionalImagesInput.addEventListener('change', function(e) {
            let files = Array.from(e.target.files);
            const maxImages = 20;
            
            // Limit to 20 images
            if (files.length > maxImages) {
                alert(`You can only upload up to ${maxImages} additional images. Only the first ${maxImages} will be selected.`);
                files = files.slice(0, maxImages);
                
                // Create new FileList with limited files
                const dt = new DataTransfer();
                files.forEach(file => dt.items.add(file));
                this.files = dt.files;
            }
            
            // Update image count after limiting
            const countElement = document.getElementById('evt_image_count');
            if (countElement) {
                const count = files.length;
                countElement.textContent = `${count} image${count !== 1 ? 's' : ''} selected (max ${maxImages})`;
                countElement.style.color = count > maxImages ? '#dc2626' : '#717171';
            }
            
            evtAdditionalPreviewContainer.innerHTML = '';
            imageMetadata.evt = [];
            
            files.forEach((file, index) => {
                // Initialize metadata for this file index
                imageMetadata.evt[index] = { category: 'General' };
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgWrapper = document.createElement('div');
                    imgWrapper.style.position = 'relative';
                    imgWrapper.dataset.fileIndex = index;
                    imgWrapper.style.marginBottom = '16px';
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '100%';
                    img.style.height = '150px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    img.style.border = '2px solid #EBEBEB';
                    img.style.marginBottom = '8px';
                    
                    // Category input for events
                    const categoryLabel = document.createElement('label');
                    categoryLabel.textContent = 'Category:';
                    categoryLabel.style.display = 'block';
                    categoryLabel.style.fontSize = '12px';
                    categoryLabel.style.fontWeight = '600';
                    categoryLabel.style.marginBottom = '4px';
                    categoryLabel.style.color = '#222';
                    
                    const categoryInput = document.createElement('input');
                    categoryInput.type = 'text';
                    categoryInput.placeholder = 'e.g., Activity, Location, Group';
                    categoryInput.className = 'image-category-input';
                    categoryInput.value = 'General';
                    categoryInput.style.width = '100%';
                    categoryInput.style.padding = '8px';
                    categoryInput.style.border = '1px solid #DDDDDD';
                    categoryInput.style.borderRadius = '4px';
                    categoryInput.style.fontSize = '14px';
                    categoryInput.dataset.fileIndex = index;
                    
                    categoryInput.addEventListener('change', function() {
                        if (imageMetadata.evt[index]) {
                            imageMetadata.evt[index].category = this.value || 'General';
                        }
                    });
                    
                    imgWrapper.appendChild(img);
                    imgWrapper.appendChild(categoryLabel);
                    imgWrapper.appendChild(categoryInput);
                    evtAdditionalPreviewContainer.appendChild(imgWrapper);
                };
                reader.readAsDataURL(file);
            });
        });

        // Main image preview - Stay
        const stayImageInput = document.getElementById('stay_main_image');
        const stayImagePreview = document.getElementById('stay_image_preview');
        const stayPreviewImg = document.getElementById('stay_preview_img');

        stayImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    stayPreviewImg.src = e.target.result;
                    stayImagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        // Function to generate room options based on bedrooms and bathrooms
        function generateStayRoomOptions() {
            const bedrooms = parseInt(document.getElementById('stay_number_of_bedrooms').value) || 0;
            const bathrooms = Math.ceil(parseFloat(document.getElementById('stay_number_of_bathrooms').value) || 0); // Round up for partial bathrooms
            
            const options = [];
            
            // Add bedrooms (required)
            for (let i = 1; i <= bedrooms; i++) {
                const roomName = bedrooms === 1 ? 'Bedroom' : `Bedroom ${i}`;
                options.push({ value: roomName, text: roomName, required: true });
            }
            
            // Add bathrooms (required)
            for (let i = 1; i <= bathrooms; i++) {
                const roomName = bathrooms === 1 ? 'Bathroom' : `Bathroom ${i}`;
                options.push({ value: roomName, text: roomName, required: true });
            }
            
            // Add optional rooms
            options.push({ value: 'Living Room', text: 'Living Room', required: false });
            options.push({ value: 'Kitchen', text: 'Kitchen', required: false });
            options.push({ value: 'Dining Room', text: 'Dining Room', required: false });
            options.push({ value: 'Balcony', text: 'Balcony', required: false });
            options.push({ value: 'Other', text: 'Other', required: false });
            
            return options;
        }
        
        // Function to update required rooms status
        function updateRequiredRoomsStatus() {
            const bedrooms = parseInt(document.getElementById('stay_number_of_bedrooms').value) || 0;
            const bathrooms = Math.ceil(parseFloat(document.getElementById('stay_number_of_bathrooms').value) || 0);
            
            if (bedrooms === 0 && bathrooms === 0) {
                document.getElementById('required-rooms-list').textContent = 'Enter number of bedrooms and bathrooms above';
                return;
            }
            
            const requiredRooms = [];
            if (bedrooms > 0) {
                for (let i = 1; i <= bedrooms; i++) {
                    requiredRooms.push(bedrooms === 1 ? 'Bedroom' : `Bedroom ${i}`);
                }
            }
            if (bathrooms > 0) {
                for (let i = 1; i <= bathrooms; i++) {
                    requiredRooms.push(bathrooms === 1 ? 'Bathroom' : `Bathroom ${i}`);
                }
            }
            
            document.getElementById('required-rooms-list').textContent = requiredRooms.join(', ') || 'None';
        }
        
        // Function to check which required rooms have images
        function checkRequiredRoomsCoverage() {
            const bedrooms = parseInt(document.getElementById('stay_number_of_bedrooms').value) || 0;
            const bathrooms = Math.ceil(parseFloat(document.getElementById('stay_number_of_bathrooms').value) || 0);
            
            const requiredRooms = [];
            if (bedrooms > 0) {
                for (let i = 1; i <= bedrooms; i++) {
                    requiredRooms.push(bedrooms === 1 ? 'Bedroom' : `Bedroom ${i}`);
                }
            }
            if (bathrooms > 0) {
                for (let i = 1; i <= bathrooms; i++) {
                    requiredRooms.push(bathrooms === 1 ? 'Bathroom' : `Bathroom ${i}`);
                }
            }
            
            // Get all room values from uploaded images
            const coveredRooms = new Set();
            imageMetadata.stay.forEach(meta => {
                if (meta && meta.room && meta.room !== 'Other') {
                    coveredRooms.add(meta.room);
                }
            });
            
            const missingRooms = requiredRooms.filter(room => !coveredRooms.has(room));
            return { requiredRooms, coveredRooms: Array.from(coveredRooms), missingRooms };
        }
        
        // Additional images preview - Stay
        const stayAdditionalImagesInput = document.getElementById('stay_additional_images');
        const stayAdditionalPreviewContainer = document.getElementById('stay_additional_preview');
        const stayBedroomsInput = document.getElementById('stay_number_of_bedrooms');
        const stayBathroomsInput = document.getElementById('stay_number_of_bathrooms');
        const stayPropertyTypeSelect = document.getElementById('stay_property_type');
        const stayPropertyTypeHelp = document.getElementById('stay-property-type-help');
        const stayAmenitiesContainer = document.getElementById('stay-amenities-container');
        const selectedStayAmenities = new Set();
        let stayAmenitiesData = [];

        const CACHE_KEYS = {
            amenities: 'll_cache_amenities_v1',
            propertyTypes: 'll_cache_property_types_v1'
        };
        const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

        function getCachedData(key) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (!parsed || !parsed.timestamp || !parsed.data) return null;
                if (Date.now() - parsed.timestamp > CACHE_TTL) {
                    localStorage.removeItem(key);
                    return null;
                }
                return parsed.data;
            } catch (error) {
                console.warn('[POSTING] Failed to read cache', error);
                return null;
            }
        }

        function setCachedData(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify({
                    timestamp: Date.now(),
                    data
                }));
            } catch (error) {
                console.warn('[POSTING] Failed to write cache', error);
            }
        }
        
        // Update room options when bedrooms/bathrooms change
        stayBedroomsInput.addEventListener('change', function() {
            updateRequiredRoomsStatus();
            // Refresh preview if images are already selected
            if (stayAdditionalImagesInput.files.length > 0) {
                stayAdditionalImagesInput.dispatchEvent(new Event('change'));
            }
        });
        
        stayBathroomsInput.addEventListener('change', function() {
            updateRequiredRoomsStatus();
            // Refresh preview if images are already selected
            if (stayAdditionalImagesInput.files.length > 0) {
                stayAdditionalImagesInput.dispatchEvent(new Event('change'));
            }
        });
        
        // Initialize required rooms status
        updateRequiredRoomsStatus();
        
        function createStayImagePreview(files, startIndex = 0) {
            const roomOptions = generateStayRoomOptions();
            const existingIndices = Array.from(stayAdditionalPreviewContainer.children).map(el => parseInt(el.dataset.fileIndex)).filter(i => !isNaN(i));
            let currentIndex = startIndex;
            
            if (existingIndices.length > 0) {
                currentIndex = Math.max(...existingIndices) + 1;
            }
            
            files.forEach((file, fileIndex) => {
                const actualIndex = currentIndex + fileIndex;
                
                // Initialize metadata for this file index
                if (!imageMetadata.stay[actualIndex]) {
                    imageMetadata.stay[actualIndex] = { room: roomOptions.length > 0 ? roomOptions[0].value : 'General', customRoom: '' };
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgWrapper = document.createElement('div');
                    imgWrapper.style.position = 'relative';
                    imgWrapper.dataset.fileIndex = actualIndex;
                    imgWrapper.style.marginBottom = '16px';
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '100%';
                    img.style.height = '150px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    img.style.border = '2px solid #EBEBEB';
                    img.style.marginBottom = '8px';
                    
                    // Room label
                    const roomLabel = document.createElement('label');
                    roomLabel.textContent = 'Room:';
                    roomLabel.style.display = 'block';
                    roomLabel.style.fontSize = '12px';
                    roomLabel.style.fontWeight = '600';
                    roomLabel.style.marginBottom = '4px';
                    roomLabel.style.color = '#222';
                    
                    // Room select dropdown
                    const roomSelect = document.createElement('select');
                    roomSelect.className = 'image-room-select';
                    roomSelect.style.width = '100%';
                    roomSelect.style.padding = '8px';
                    roomSelect.style.border = '1px solid #DDDDDD';
                    roomSelect.style.borderRadius = '4px';
                    roomSelect.style.fontSize = '14px';
                    roomSelect.style.marginBottom = '8px';
                    roomSelect.dataset.fileIndex = actualIndex;
                    
                    // Populate options
                    roomOptions.forEach(option => {
                        const opt = document.createElement('option');
                        opt.value = option.value;
                        opt.textContent = option.text;
                        roomSelect.appendChild(opt);
                    });
                    
                    // Set current value if exists
                    if (imageMetadata.stay[actualIndex] && imageMetadata.stay[actualIndex].room) {
                        roomSelect.value = imageMetadata.stay[actualIndex].room;
                    }
                    
                    // Custom room input (hidden by default, shown when "Other" is selected)
                    const customRoomWrapper = document.createElement('div');
                    customRoomWrapper.style.display = 'none';
                    customRoomWrapper.style.marginTop = '8px';
                    
                    const customRoomLabel = document.createElement('label');
                    customRoomLabel.textContent = 'Custom Room Name:';
                    customRoomLabel.style.display = 'block';
                    customRoomLabel.style.fontSize = '12px';
                    customRoomLabel.style.fontWeight = '600';
                    customRoomLabel.style.marginBottom = '4px';
                    customRoomLabel.style.color = '#222';
                    
                    const customRoomInput = document.createElement('input');
                    customRoomInput.type = 'text';
                    customRoomInput.placeholder = 'Enter room name';
                    customRoomInput.className = 'image-custom-room-input';
                    customRoomInput.style.width = '100%';
                    customRoomInput.style.padding = '8px';
                    customRoomInput.style.border = '1px solid #DDDDDD';
                    customRoomInput.style.borderRadius = '4px';
                    customRoomInput.style.fontSize = '14px';
                    customRoomInput.dataset.fileIndex = actualIndex;
                    
                    if (imageMetadata.stay[actualIndex] && imageMetadata.stay[actualIndex].customRoom) {
                        customRoomInput.value = imageMetadata.stay[actualIndex].customRoom;
                    }
                    
                    customRoomWrapper.appendChild(customRoomLabel);
                    customRoomWrapper.appendChild(customRoomInput);
                    
                    // Handle room select change
                    roomSelect.addEventListener('change', function() {
                        const selectedRoom = this.value;
                        if (!imageMetadata.stay[actualIndex]) {
                            imageMetadata.stay[actualIndex] = { room: selectedRoom, customRoom: '' };
                        } else {
                            imageMetadata.stay[actualIndex].room = selectedRoom;
                        }
                        
                        // Show/hide custom room input
                        if (selectedRoom === 'Other') {
                            customRoomWrapper.style.display = 'block';
                        } else {
                            customRoomWrapper.style.display = 'none';
                            imageMetadata.stay[actualIndex].customRoom = '';
                            customRoomInput.value = '';
                        }
                        
                        // Update required rooms status
                        updateRequiredRoomsCoverageDisplay();
                    });
                    
                    // Handle custom room input change
                    customRoomInput.addEventListener('input', function() {
                        if (!imageMetadata.stay[actualIndex]) {
                            imageMetadata.stay[actualIndex] = { room: 'Other', customRoom: '' };
                        }
                        imageMetadata.stay[actualIndex].customRoom = this.value;
                        // Update required rooms coverage display
                        updateRequiredRoomsCoverageDisplay();
                    });
                    
                    // Show custom room input if "Other" is already selected
                    if (roomSelect.value === 'Other') {
                        customRoomWrapper.style.display = 'block';
                    }
                    
                    // Update on initial load
                    updateRequiredRoomsCoverageDisplay();
                    
                    imgWrapper.appendChild(img);
                    imgWrapper.appendChild(roomLabel);
                    imgWrapper.appendChild(roomSelect);
                    imgWrapper.appendChild(customRoomWrapper);
                    stayAdditionalPreviewContainer.appendChild(imgWrapper);
                    
                    // Update required rooms coverage display
                    updateRequiredRoomsCoverageDisplay();
                };
                reader.readAsDataURL(file);
            });
        }
        
        function updateRequiredRoomsCoverageDisplay() {
            const coverage = checkRequiredRoomsCoverage();
            const statusElement = document.getElementById('required-rooms-status');
            
            if (coverage.requiredRooms.length === 0) {
                statusElement.innerHTML = '<strong>Required rooms:</strong> <span id="required-rooms-list">Enter number of bedrooms and bathrooms above</span>';
                updateRequiredRoomsStatus();
                return;
            }
            
            const missingCount = coverage.missingRooms.length;
            if (missingCount === 0) {
                statusElement.innerHTML = `
                    <strong style="color: #0f7b0f;">✓ All required rooms have images</strong>
                    <span style="margin-left: 8px; color: #717171;">(${coverage.requiredRooms.join(', ')})</span>
                `;
            } else {
                statusElement.innerHTML = `
                    <strong style="color: #dc2626;">Missing images for:</strong> 
                    <span style="color: #dc2626; font-weight: 600;">${coverage.missingRooms.join(', ')}</span>
                    <span style="margin-left: 8px; color: #717171;">(${missingCount} of ${coverage.requiredRooms.length} rooms)</span>
                `;
            }
        }

        async function loadStayPropertyTypes() {
            if (!stayPropertyTypeSelect) return;
            stayPropertyTypeSelect.innerHTML = '<option value="">Loading property types...</option>';
            if (stayPropertyTypeHelp) stayPropertyTypeHelp.textContent = '';

            const cached = getCachedData(CACHE_KEYS.propertyTypes);
            if (cached && Array.isArray(cached) && cached.length) {
                applyPropertyTypeOptions(cached, true);
            }

            try {
                const response = await fetch('backend/api/property-types.php');
                const data = await response.json();

                if (response.ok && data.success && Array.isArray(data.data) && data.data.length) {
                    setCachedData(CACHE_KEYS.propertyTypes, data.data);
                    applyPropertyTypeOptions(data.data);
                } else if (!cached) {
                    setFallbackPropertyTypes();
                }
            } catch (error) {
                console.error('[POSTING] Failed to load property types:', error);
                if (!cached) {
                    setFallbackPropertyTypes();
                } else if (stayPropertyTypeHelp) {
                    stayPropertyTypeHelp.textContent = 'Using cached property types.';
                    stayPropertyTypeHelp.style.color = '#b45309';
                }
            }
        }

        function applyPropertyTypeOptions(list, fromCache = false) {
            if (!stayPropertyTypeSelect || !Array.isArray(list)) return;
            const optionsHtml = list.map(item => {
                const value = (item.value || item.name || '').trim();
                if (!value) return '';
                return `<option value="${value}">${formatPropertyTypeLabel(value)}</option>`;
            }).join('');
            stayPropertyTypeSelect.innerHTML = `<option value="">Select property type</option>${optionsHtml}`;
            if (stayPropertyTypeHelp) {
                stayPropertyTypeHelp.textContent = fromCache ? 'Using cached property types.' : 'Loaded from database.';
                stayPropertyTypeHelp.style.color = fromCache ? '#b45309' : '#10873D';
            }
        }

        function setFallbackPropertyTypes() {
            if (!stayPropertyTypeSelect) return;
            const fallbackTypes = [
                'apartment', 'house', 'villa', 'chalet', 'studio',
                'cottage', 'cabin', 'bungalow', 'hotel_room', 'guest_house'
            ];
            stayPropertyTypeSelect.innerHTML = '<option value="">Select property type</option>' +
                fallbackTypes.map(type => `<option value="${type}">${formatPropertyTypeLabel(type)}</option>`).join('');
            if (stayPropertyTypeHelp) {
                stayPropertyTypeHelp.textContent = 'Using fallback property types.';
                stayPropertyTypeHelp.style.color = '#b45309';
            }
        }

        function formatPropertyTypeLabel(value) {
            return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }

        async function loadStayAmenitiesOptions() {
            if (!stayAmenitiesContainer) return;

            stayAmenitiesContainer.innerHTML = '<div class="stay-amenities-loading">Loading amenities...</div>';

            const cached = getCachedData(CACHE_KEYS.amenities);
            if (cached && Array.isArray(cached) && cached.length) {
                stayAmenitiesData = cached;
                renderStayAmenitiesOptions(stayAmenitiesData);
            }

            try {
                const response = await fetch('backend/api/amenities.php');
                const data = await response.json();

                if (response.ok && data.success && Array.isArray(data.data)) {
                    stayAmenitiesData = data.data;
                    renderStayAmenitiesOptions(stayAmenitiesData);
                    setCachedData(CACHE_KEYS.amenities, data.data);
                } else if (!cached) {
                    stayAmenitiesContainer.innerHTML = '<div class="stay-amenities-empty">Unable to load amenities. Please try again later.</div>';
                }
            } catch (error) {
                console.error('[POSTING] Failed to load amenities:', error);
                if (!cached) {
                    stayAmenitiesContainer.innerHTML = '<div class="stay-amenities-empty">Unable to load amenities. Please try again later.</div>';
                }
            }
        }

        function renderStayAmenitiesOptions(amenities) {
            if (!stayAmenitiesContainer) return;

            if (!amenities || amenities.length === 0) {
                stayAmenitiesContainer.innerHTML = '<div class="stay-amenities-empty">No amenities available yet.</div>';
                return;
            }

            const grouped = amenities.reduce((acc, amenity) => {
                const categoryKey = (amenity.category || 'General').toLowerCase();
                if (!acc[categoryKey]) acc[categoryKey] = [];
                acc[categoryKey].push(amenity);
                return acc;
            }, {});

            stayAmenitiesContainer.innerHTML = Object.entries(grouped).map(([category, items]) => {
                const formattedCategory = category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
                const chips = items.map(amenity => {
                    const amenityId = parseInt(amenity.id, 10);
                    const isChecked = selectedStayAmenities.has(amenityId);
                    return `
                        <label class="amenity-chip ${isChecked ? 'selected' : ''}">
                            <input type="checkbox" data-amenity-id="${amenityId}" value="${amenityId}" ${isChecked ? 'checked' : ''}>
                            <span>${amenity.name}</span>
                        </label>
                    `;
                }).join('');

                return `
                    <div class="amenities-category-block">
                        <div class="amenities-category-title">${formattedCategory}</div>
                        <div class="amenities-chips">
                            ${chips}
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (stayAmenitiesContainer) {
            stayAmenitiesContainer.addEventListener('change', (event) => {
                const checkbox = event.target;
                if (checkbox.matches('input[data-amenity-id]')) {
                    const amenityId = parseInt(checkbox.value, 10);
                    if (!amenityId) return;

                    if (checkbox.checked) {
                        selectedStayAmenities.add(amenityId);
                        checkbox.closest('.amenity-chip')?.classList.add('selected');
                    } else {
                        selectedStayAmenities.delete(amenityId);
                        checkbox.closest('.amenity-chip')?.classList.remove('selected');
                    }
                }
            });
        }

        loadStayPropertyTypes();
        loadStayAmenitiesOptions();
        
        stayAdditionalImagesInput.addEventListener('change', function(e) {
            let files = Array.from(e.target.files);
            const maxImages = 20;
            
            // Limit to 20 images
            if (files.length > maxImages) {
                alert(`You can only upload up to ${maxImages} additional images. Only the first ${maxImages} will be selected.`);
                files = files.slice(0, maxImages);
                
                // Create new FileList with limited files
                const dt = new DataTransfer();
                files.forEach(file => dt.items.add(file));
                this.files = dt.files;
            }
            
            // Update image count after limiting
            const countElement = document.getElementById('stay_image_count');
            if (countElement) {
                const count = files.length;
                countElement.textContent = `${count} image${count !== 1 ? 's' : ''} selected (max ${maxImages})`;
                countElement.style.color = count > maxImages ? '#dc2626' : '#717171';
            }
            
            // Clear preview and metadata if starting fresh, otherwise append
            const existingPreviews = stayAdditionalPreviewContainer.querySelectorAll('[data-file-index]');
            if (existingPreviews.length === 0) {
                stayAdditionalPreviewContainer.innerHTML = '';
                imageMetadata.stay = [];
                createStayImagePreview(files, 0);
            } else {
                createStayImagePreview(files);
            }
        });

        // Form submission
        const form = document.getElementById('posting-form');
        const alertDiv = document.getElementById('alert');
        const submitBtn = document.getElementById('submit-btn');

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Determine which form is active
            const listingType = document.querySelector('input[name="listing_type"]:checked').value;

            // Validate based on type
            if (listingType === 'experience') {
                const description = descInput.value;
                if (description.length < 50) {
                    showAlert('Description must be at least 50 characters', 'error');
                    return;
                }

                const price = parseFloat(document.getElementById('exp_price').value);
                if (price < 0.50) {
                    showAlert('Price must be at least $0.50', 'error');
                    return;
                }

                // Validate time fields are filled
                if (!expHourStart.value) {
                    showAlert('Please select opening time', 'error');
                    return;
                }

                if (!expHourEnd.value) {
                    showAlert('Please select closing time', 'error');
                    return;
                }
            } else if (listingType === 'event') {
                const description = evtDescInput.value;
                if (description.length < 50) {
                    showAlert('Description must be at least 50 characters', 'error');
                    return;
                }

                const price = parseFloat(document.getElementById('evt_price').value);
                if (price < 0.50) {
                    showAlert('Price must be at least $0.50', 'error');
                    return;
                }

                // Validate dates
                const dateStart = document.getElementById('evt_date_start').value;
                const dateEnd = document.getElementById('evt_date_end').value;
                if (dateStart && dateEnd && new Date(dateStart) >= new Date(dateEnd)) {
                    showAlert('Event end date must be after start date', 'error');
                    return;
                }

                // Validate time fields are filled
                if (!evtHourStart.value) {
                    showAlert('Please select opening time', 'error');
                    return;
                }

                if (!evtHourEnd.value) {
                    showAlert('Please select closing time', 'error');
                    return;
                }
            } else if (listingType === 'stay') {
                const description = stayDescInput.value;
                if (description.length < 50) {
                    showAlert('Description must be at least 50 characters', 'error');
                    return;
                }

                const price = parseFloat(document.getElementById('stay_price_per_night').value);
                if (price < 0.50) {
                    showAlert('Price must be at least $0.50', 'error');
                    return;
                }

                const title = stayTitleInput.value;
                if (title.length > 20) {
                    showAlert('Title must be 20 characters or less', 'error');
                    return;
                }

                // Validate that at least one bed type is provided
                const doubleBeds = parseInt(document.getElementById('stay_number_double_beds').value) || 0;
                const singleBeds = parseInt(document.getElementById('stay_number_single_beds').value) || 0;
                const sofaBeds = parseInt(document.getElementById('stay_number_sofa_beds').value) || 0;
                const totalBeds = doubleBeds + singleBeds + sofaBeds;

                if (totalBeds < 1) {
                    showAlert('At least one bed is required (double, single, or sofa)', 'error');
                    return;
                }
                
                // Validate required rooms have images
                const coverage = checkRequiredRoomsCoverage();
                if (coverage.missingRooms.length > 0) {
                    showAlert(`You must upload at least one image for each required room. Missing: ${coverage.missingRooms.join(', ')}`, 'error');
                    // Scroll to images section
                    document.getElementById('required-rooms-status').scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                
                // Validate that if "Other" room is selected, custom room name is provided
                if (imageMetadata.stay && imageMetadata.stay.length > 0) {
                    for (let i = 0; i < imageMetadata.stay.length; i++) {
                        const meta = imageMetadata.stay[i];
                        if (meta && meta.room === 'Other' && (!meta.customRoom || meta.customRoom.trim() === '')) {
                            showAlert('Please provide a custom room name for images marked as "Other"', 'error');
                            // Scroll to images section
                            document.getElementById('required-rooms-status').scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }
                    }
                }
            }
            
            // Validate additional images count (limit to 20)
            const additionalImagesInput = listingType === 'experience' ? document.getElementById('exp_additional_images') :
                                         listingType === 'event' ? document.getElementById('evt_additional_images') :
                                         document.getElementById('stay_additional_images');
            
            if (additionalImagesInput && additionalImagesInput.files.length > 20) {
                showAlert('You can only upload up to 20 additional images', 'error');
                return;
            }

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            try {
                const formData = new FormData(form);
                
                // Add user_id
                const currentUser = window.Auth.getCurrentUser();
                formData.append('user_id', currentUser.id);
                
                // Add image metadata based on listing type
                if (listingType === 'experience' && imageMetadata.exp.length > 0) {
                    formData.append('image_metadata', JSON.stringify(imageMetadata.exp));
                } else if (listingType === 'event' && imageMetadata.evt.length > 0) {
                    formData.append('image_metadata', JSON.stringify(imageMetadata.evt));
                } else if (listingType === 'stay' && imageMetadata.stay.length > 0) {
                    // For stays, if room is "Other", use customRoom value; otherwise use room
                    const processedStayMetadata = imageMetadata.stay.map(meta => {
                        if (meta && meta.room === 'Other' && meta.customRoom) {
                            return { room: meta.customRoom.trim() || 'Other' };
                        }
                        return { room: meta && meta.room ? meta.room : 'General' };
                    });
                    formData.append('image_metadata', JSON.stringify(processedStayMetadata));
                }

                if (listingType === 'stay' && selectedStayAmenities.size > 0) {
                    formData.append('stay_amenities', JSON.stringify(Array.from(selectedStayAmenities)));
                }

                const response = await fetch('backend/api/create-posting.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    showAlert(`${listingType.charAt(0).toUpperCase() + listingType.slice(1)} created successfully! Redirecting...`, 'success');
                    setTimeout(() => {
                        window.location.href = 'my-host.html';
                    }, 2000);
                } else {
                    showAlert(data.message || 'Failed to create posting', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Posting';
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('An error occurred. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Posting';
            }
        });

        function showAlert(message, type) {
            alertDiv.textContent = message;
            alertDiv.className = `alert ${type}`;
            alertDiv.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }