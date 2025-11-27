/**
 * Lebanon Locals - Form Validation Utilities
 * Provides inline error handling and validation feedback
 */

(function() {
    'use strict';

    /**
     * Show inline error for a form field
     * @param {HTMLElement|string} field - Input element or field ID
     * @param {string} message - Error message to display
     */
    function showFieldError(field, message) {
        const input = typeof field === 'string' ? document.getElementById(field) : field;
        if (!input) return;

        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        // Remove success state
        formGroup.classList.remove('has-success');
        
        // Add error state
        formGroup.classList.add('has-error');

        // Find or create error element
        let errorElement = formGroup.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.setAttribute('role', 'alert');
            errorElement.setAttribute('aria-live', 'polite');
            input.parentNode.appendChild(errorElement);
        }

        // Set error message
        errorElement.textContent = message;
        errorElement.classList.add('show');

        // Focus on field if not already focused
        if (document.activeElement !== input) {
            input.focus();
        }

        // Scroll to error if needed
        const rect = formGroup.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            formGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Clear error for a form field
     * @param {HTMLElement|string} field - Input element or field ID
     */
    function clearFieldError(field) {
        const input = typeof field === 'string' ? document.getElementById(field) : field;
        if (!input) return;

        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        formGroup.classList.remove('has-error');
        
        const errorElement = formGroup.querySelector('.field-error');
        if (errorElement) {
            errorElement.classList.remove('show');
            errorElement.textContent = '';
        }
    }

    /**
     * Show success state for a form field
     * @param {HTMLElement|string} field - Input element or field ID
     * @param {string} message - Optional success message
     */
    function showFieldSuccess(field, message) {
        const input = typeof field === 'string' ? document.getElementById(field) : field;
        if (!input) return;

        const formGroup = input.closest('.form-group');
        if (!formGroup) return;

        formGroup.classList.remove('has-error');
        formGroup.classList.add('has-success');

        if (message) {
            let successElement = formGroup.querySelector('.field-success');
            if (!successElement) {
                successElement = document.createElement('div');
                successElement.className = 'field-success';
                input.parentNode.appendChild(successElement);
            }
            successElement.textContent = message;
            successElement.classList.add('show');
        }
    }

    /**
     * Clear all errors from a form
     * @param {HTMLElement|string} form - Form element or form ID
     */
    function clearAllErrors(form) {
        const formElement = typeof form === 'string' ? document.getElementById(form) : form;
        if (!formElement) return;

        const errorGroups = formElement.querySelectorAll('.form-group.has-error');
        errorGroups.forEach(group => {
            group.classList.remove('has-error');
            const errorElement = group.querySelector('.field-error');
            if (errorElement) {
                errorElement.classList.remove('show');
                errorElement.textContent = '';
            }
        });

        const successGroups = formElement.querySelectorAll('.form-group.has-success');
        successGroups.forEach(group => {
            group.classList.remove('has-success');
            const successElement = group.querySelector('.field-success');
            if (successElement) {
                successElement.classList.remove('show');
            }
        });
    }

    /**
     * Show error summary box
     * @param {HTMLElement|string} form - Form element or form ID
     * @param {Array<string>} errors - Array of error messages
     */
    function showErrorSummary(form, errors) {
        const formElement = typeof form === 'string' ? document.getElementById(form) : form;
        if (!formElement || !errors || errors.length === 0) return;

        let summaryBox = formElement.querySelector('.error-summary');
        if (!summaryBox) {
            summaryBox = document.createElement('div');
            summaryBox.className = 'error-summary';
            summaryBox.setAttribute('role', 'alert');
            summaryBox.setAttribute('aria-live', 'polite');
            
            const title = document.createElement('div');
            title.className = 'error-summary-title';
            title.textContent = 'Please fix the following errors:';
            summaryBox.appendChild(title);
            
            const list = document.createElement('ul');
            list.className = 'error-summary-list';
            summaryBox.appendChild(list);
            
            formElement.insertBefore(summaryBox, formElement.firstChild);
        }

        const list = summaryBox.querySelector('.error-summary-list');
        list.innerHTML = errors.map(error => `<li>${error}</li>`).join('');
        
        summaryBox.classList.add('show');
        
        // Scroll to summary
        summaryBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Hide error summary box
     * @param {HTMLElement|string} form - Form element or form ID
     */
    function hideErrorSummary(form) {
        const formElement = typeof form === 'string' ? document.getElementById(form) : form;
        if (!formElement) return;

        const summaryBox = formElement.querySelector('.error-summary');
        if (summaryBox) {
            summaryBox.classList.remove('show');
        }
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Validate phone number (flexible format)
     * @param {string} phone - Phone to validate
     * @returns {boolean}
     */
    function isValidPhone(phone) {
        const re = /^[\d\s\+\-\(\)]+$/;
        return re.test(phone) && phone.replace(/\D/g, '').length >= 8;
    }

    /**
     * Real-time validation for common field types
     */
    function setupRealTimeValidation() {
        document.addEventListener('blur', function(e) {
            const input = e.target;
            if (!input.matches('input, textarea, select')) return;
            if (input.dataset.validate === 'false') return;

            // Clear previous errors
            clearFieldError(input);

            // Validate based on type
            if (input.type === 'email' && input.value && !isValidEmail(input.value)) {
                showFieldError(input, 'Please enter a valid email address');
            } else if (input.type === 'tel' && input.value && !isValidPhone(input.value)) {
                showFieldError(input, 'Please enter a valid phone number');
            } else if (input.hasAttribute('required') && !input.value.trim()) {
                showFieldError(input, 'This field is required');
            } else if (input.hasAttribute('minlength') && input.value.length < parseInt(input.getAttribute('minlength'))) {
                showFieldError(input, `Minimum ${input.getAttribute('minlength')} characters required`);
            } else if (input.hasAttribute('maxlength') && input.value.length > parseInt(input.getAttribute('maxlength'))) {
                showFieldError(input, `Maximum ${input.getAttribute('maxlength')} characters allowed`);
            } else if (input.type === 'number') {
                const min = input.getAttribute('min');
                const max = input.getAttribute('max');
                const value = parseFloat(input.value);
                
                if (min && value < parseFloat(min)) {
                    showFieldError(input, `Value must be at least ${min}`);
                } else if (max && value > parseFloat(max)) {
                    showFieldError(input, `Value must be at most ${max}`);
                }
            }
        }, true);

        // Clear errors on input
        document.addEventListener('input', function(e) {
            const input = e.target;
            if (input.matches('input, textarea, select') && input.closest('.form-group.has-error')) {
                clearFieldError(input);
            }
        }, true);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupRealTimeValidation);
    } else {
        setupRealTimeValidation();
    }

    // Export functions
    window.FormValidation = {
        showError: showFieldError,
        clearError: clearFieldError,
        showSuccess: showFieldSuccess,
        clearAll: clearAllErrors,
        showSummary: showErrorSummary,
        hideSummary: hideErrorSummary,
        isValidEmail: isValidEmail,
        isValidPhone: isValidPhone
    };

})();

