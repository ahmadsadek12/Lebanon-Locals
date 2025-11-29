/**
 * Admin Users Management
 */

// Require admin authentication
if (!window.AdminAuth.requireAdmin()) {
    // Will redirect if not admin
}

// Display admin info
const adminUser = window.AdminAuth.getAdminUser();
if (adminUser) {
    const initials = (adminUser.first_name.charAt(0) + adminUser.last_name.charAt(0)).toUpperCase();
    document.getElementById('admin-avatar').textContent = initials;
    document.getElementById('admin-name').textContent = `${adminUser.first_name} ${adminUser.last_name}`;
}

let allUsers = [];

// Load all users
async function loadUsers() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/users.php');

        if (data.success && data.data) {
            allUsers = data.data;
            displayUsers(allUsers);
        } else {
            showError('Failed to load users');
        }
    } catch (error) {
        console.error('[ADMIN] Error loading users:', error);
        showError('Error loading users');
    }
}

// Display users in table
function displayUsers(users) {
    const container = document.getElementById('users-table');
    
    if (!users || users.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-users"></i><p>No users found</p></div>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Verified</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>#${user.id}</td>
                        <td>${user.first_name} ${user.last_name}</td>
                        <td>${user.email}</td>
                        <td><span class="badge badge-${user.user_type === 'admin' ? 'danger' : user.user_type === 'host' ? 'warning' : 'info'}">${user.user_type}</span></td>
                        <td>${user.is_verified == 1 ? '<span class="badge badge-success"><i class="fa fa-check"></i> Verified</span>' : '<span class="badge badge-secondary">Not Verified</span>'}</td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>
                            <button class="btn btn-view" onclick="viewUserDetails(${user.id})">
                                <i class="fa fa-eye"></i> View
                            </button>
                            <button class="btn btn-delete" onclick="deleteUser(${user.id}, '${user.first_name} ${user.last_name}')">
                                <i class="fa fa-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Search users
document.getElementById('search-users').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const filtered = allUsers.filter(user => 
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.user_type.toLowerCase().includes(query)
    );
    displayUsers(filtered);
});

// Edit user
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('modal-title').textContent = 'Edit User';
    document.getElementById('user-id').value = user.id;
    document.getElementById('first-name').value = user.first_name;
    document.getElementById('last-name').value = user.last_name;
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-type').value = user.user_type;
    document.getElementById('user-verified').value = user.is_verified;

    document.getElementById('edit-user-modal').classList.add('active');
}

// Add new user
function openAddUserModal() {
    document.getElementById('modal-title').textContent = 'Add New User';
    document.getElementById('edit-user-form').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('edit-user-modal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('edit-user-modal').classList.remove('active');
}

// Handle form submission
document.getElementById('edit-user-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const userId = document.getElementById('user-id').value;
    const formData = {
        id: userId || null,
        first_name: document.getElementById('first-name').value,
        last_name: document.getElementById('last-name').value,
        email: document.getElementById('user-email').value,
        user_type: document.getElementById('user-type').value,
        is_verified: document.getElementById('user-verified').value
    };

    try {
        const endpoint = userId 
            ? '../public/backend/api/admin/update-user.php'
            : '../public/backend/api/admin/create-user.php';

        const data = await window.AdminAuth.apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (data.success) {
            alert(userId ? 'User updated successfully' : 'User created successfully');
            closeModal();
            loadUsers();
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('[ADMIN] Error saving user:', error);
        alert('Error saving user');
    }
});

// Delete user
async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
        return;
    }

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/delete-user.php', {
            method: 'POST',
            body: JSON.stringify({ id: userId })
        });

        if (data.success) {
            alert('User deleted successfully');
            loadUsers();
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('[ADMIN] Error deleting user:', error);
        alert('Error deleting user');
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showError(message) {
    document.getElementById('users-table').innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

// User Details Modal Functions
async function viewUserDetails(userId) {
    const modal = document.getElementById('user-details-modal');
    const content = document.getElementById('user-details-content');
    
    modal.classList.add('active');
    content.innerHTML = '<div class="loading"><i class="fa fa-spinner fa-spin" style="font-size: 32px;"></i><p>Loading user details...</p></div>';

    try {
        const data = await window.AdminAuth.apiRequest(`../public/backend/api/admin/get-user-details.php?user_id=${userId}`);
        
        if (data.success && data.data) {
            const user = data.data;
            renderUserDetails(user);
        } else {
            content.innerHTML = '<div class="empty-state"><p>Error loading user details</p></div>';
        }
    } catch (error) {
        console.error('[ADMIN] Error loading user details:', error);
        content.innerHTML = '<div class="empty-state"><p>Error loading user details</p></div>';
    }
}

let currentEditingUser = null;
let isEditMode = false;

function renderUserDetails(user, editMode = false) {
    const content = document.getElementById('user-details-content');
    isEditMode = editMode;
    currentEditingUser = user;
    
    // Format date helper (for input fields)
    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };

    // Format date helper (for display)
    const formatDateForDisplay = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Format datetime helper (for display only)
    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Helper to create editable field
    const createField = (label, fieldName, value, type = 'text', options = null) => {
        const fieldId = `edit_${fieldName}`;
        const displayValue = value || '';
        
        if (editMode) {
            if (type === 'select' && options) {
                let selectHtml = `<select id="${fieldId}" class="edit-field" data-field="${fieldName}">`;
                selectHtml += `<option value="">-- Clear --</option>`;
                options.forEach(opt => {
                    const selected = opt.value === displayValue ? 'selected' : '';
                    selectHtml += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
                });
                selectHtml += '</select>';
                return selectHtml;
            } else if (type === 'textarea') {
                return `<textarea id="${fieldId}" class="edit-field" data-field="${fieldName}" rows="3">${displayValue}</textarea>`;
            } else if (type === 'date') {
                return `<input type="date" id="${fieldId}" class="edit-field" data-field="${fieldName}" value="${formatDateForInput(displayValue)}">`;
            } else if (type === 'number') {
                return `<input type="number" id="${fieldId}" class="edit-field" data-field="${fieldName}" value="${displayValue}">`;
            } else if (type === 'checkbox') {
                return `<input type="checkbox" id="${fieldId}" class="edit-field" data-field="${fieldName}" ${value ? 'checked' : ''}>`;
            } else if (type === 'file') {
                return `<input type="file" id="${fieldId}" class="edit-field" data-field="${fieldName}" accept="image/*,.pdf">
                        <small style="display: block; margin-top: 4px; color: #717171;">Current: ${value || 'None'}</small>`;
            } else {
                return `<input type="${type}" id="${fieldId}" class="edit-field" data-field="${fieldName}" value="${displayValue}" placeholder="Enter ${label.toLowerCase()}">`;
            }
        } else {
            return `<span class="detail-value">${displayValue || 'N/A'}</span>`;
        }
    };

    content.innerHTML = `
        <style>
            .user-details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                margin-bottom: 32px;
            }
            .user-details-section {
                background: #f7f7f7;
                padding: 20px;
                border-radius: 8px;
            }
            .user-details-section h3 {
                font-size: 18px;
                margin-bottom: 16px;
                color: #222;
                border-bottom: 2px solid var(--primary);
                padding-bottom: 8px;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e0e0e0;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                font-weight: 600;
                color: #717171;
            }
            .detail-value {
                color: #222;
                text-align: right;
            }
            .edit-field {
                width: 100%;
                padding: 8px 12px;
                border: 2px solid var(--border);
                border-radius: 6px;
                font-size: 14px;
                font-family: inherit;
                transition: all 0.3s;
            }
            .edit-field:focus {
                outline: none;
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(255, 56, 92, 0.1);
            }
            .edit-field[type="checkbox"] {
                width: auto;
                cursor: pointer;
            }
            .edit-field[type="checkbox"]:checked {
                accent-color: var(--primary);
            }
            .user-image-container {
                text-align: center;
                margin-bottom: 24px;
            }
            .user-image-container img {
                max-width: 200px;
                max-height: 200px;
                border-radius: 8px;
                border: 3px solid var(--border);
            }
            .document-image-container {
                margin-top: 16px;
                text-align: center;
            }
            .document-image-container img {
                max-width: 100%;
                max-height: 400px;
                border-radius: 8px;
                border: 2px solid var(--border);
            }
            .document-image-container embed {
                width: 100%;
                height: 500px;
                border-radius: 8px;
                border: 2px solid var(--border);
            }
            .full-width {
                grid-column: 1 / -1;
            }
        </style>

        <div class="user-details-grid">
            <div class="user-details-section full-width">
                <h3>Profile Picture</h3>
                <div class="user-image-container">
                    ${user.profile_picture ? 
                        `<img id="profile-preview" src="../public/${user.profile_picture}" alt="Profile Picture" onerror="this.src='../public/images/profile_photo.png'">` : 
                        '<p id="profile-preview-text">No profile picture</p>'
                    }
                </div>
                ${editMode ? `
                    <div style="text-align: center; margin-top: 16px;">
                        <input type="file" id="edit_profile_picture" class="edit-field" data-field="profile_picture" accept="image/*" style="display: none;" onchange="previewProfileImage(this)">
                        <button type="button" class="btn btn-edit" onclick="document.getElementById('edit_profile_picture').click()">
                            <i class="fa fa-upload"></i> Change Profile Picture
                        </button>
                        ${user.profile_picture ? `
                            <button type="button" class="btn btn-delete" onclick="removeProfilePicture()" style="margin-left: 8px;">
                                <i class="fa fa-trash"></i> Remove
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>

            <div class="user-details-section">
                <h3>Basic Information</h3>
                <div class="detail-row">
                    <span class="detail-label">User ID:</span>
                    <span class="detail-value">#${user.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">First Name:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('First Name', 'first_name', user.first_name, 'text') : (user.first_name || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Last Name:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Last Name', 'last_name', user.last_name, 'text') : (user.last_name || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Email', 'email', user.email, 'email') : (user.email || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">User Type:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('User Type', 'user_type', user.user_type, 'select', [
                        {value: 'customer', label: 'Customer'},
                        {value: 'host', label: 'Host'},
                        {value: 'admin', label: 'Admin'},
                        {value: 'pending', label: 'Pending'}
                    ]) : (user.user_type || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Verified Status:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Verified', 'is_verified', user.is_verified, 'checkbox') : (user.is_verified == 1 ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-secondary">Not Verified</span>')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Active Status:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Active', 'is_active', user.is_active, 'checkbox') : (user.is_active == 1 ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>')}</div>
                </div>
            </div>

            <div class="user-details-section">
                <h3>Personal Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Gender:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Gender', 'gender', user.gender, 'select', [
                        {value: 'male', label: 'Male'},
                        {value: 'female', label: 'Female'},
                        {value: 'other', label: 'Other'}
                    ]) : (user.gender || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date of Birth:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Date of Birth', 'date_of_birth', user.date_of_birth, 'date') : formatDateForDisplay(user.date_of_birth)}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Age:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Age', 'age', user.age, 'number') : (user.age || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Nationality:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Nationality', 'nationality', user.nationality, 'text') : (user.nationality || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone Number:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Phone Number', 'phone_number', user.phone_number, 'tel') : (user.phone_number || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Languages:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Languages', 'languages_spoken', user.languages_spoken, 'text') : (user.languages_spoken || 'N/A')}</div>
                </div>
            </div>

            <div class="user-details-section">
                <h3>Contact & Emergency</h3>
                <div class="detail-row">
                    <span class="detail-label">Emergency Contact Name:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Emergency Contact Name', 'emergency_contact_name', user.emergency_contact_name, 'text') : (user.emergency_contact_name || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Emergency Contact Phone:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Emergency Contact Phone', 'emergency_contact_phone', user.emergency_contact_phone, 'tel') : (user.emergency_contact_phone || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Address ID:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Address ID', 'address_id', user.address_id, 'number') : (user.address_id || 'N/A')}</div>
                </div>
            </div>

            <div class="user-details-section">
                <h3>Account Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Credits:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Credits', 'credits', user.credits, 'number') : (user.credits || 0)}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">User Ranking:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('User Ranking', 'user_ranking', user.user_ranking, 'text') : (user.user_ranking || 'N/A')}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Reviews:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Total Reviews', 'total_reviews', user.total_reviews, 'number') : (user.total_reviews || 0)}</div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Years Hosting:</span>
                    <div class="detail-value" style="width: 60%;">${editMode ? createField('Years Hosting', 'years_hosting', user.years_hosting, 'number') : (user.years_hosting || 'N/A')}</div>
                </div>
            </div>

            <div class="user-details-section">
                <h3>Timestamps</h3>
                <div class="detail-row">
                    <span class="detail-label">Created At:</span>
                    <span class="detail-value">${formatDateTime(user.created_at)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Updated At:</span>
                    <span class="detail-value">${formatDateTime(user.updated_at)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Last Login:</span>
                    <span class="detail-value">${formatDateTime(user.last_login)}</span>
                </div>
            </div>

            <div class="user-details-section full-width">
                <h3>Bio</h3>
                ${editMode ? createField('Bio', 'bio', user.bio, 'textarea') : (user.bio ? `<p>${user.bio}</p>` : '<p>No bio provided</p>')}
            </div>

            <div class="user-details-section full-width">
                <h3>ID/Passport Document</h3>
                ${user.id_passport_picture ? `
                    <div class="document-image-container" id="document-preview-container">
                        ${user.id_passport_picture && user.id_passport_picture.toLowerCase().endsWith('.pdf') ? 
                            `<embed src="../public/${user.id_passport_picture}" type="application/pdf">` : 
                            `<img src="../public/${user.id_passport_picture}" alt="ID/Passport Document">`
                        }
                    </div>
                ` : `
                    <div id="document-preview-container" style="text-align: center; padding: 20px; border: 2px dashed var(--border); border-radius: 8px; background: var(--light-gray);">
                        <p>No document uploaded</p>
                    </div>
                `}
                ${editMode ? `
                    <div style="text-align: center; margin-top: 16px;">
                        <input type="file" id="edit_id_passport_picture" class="edit-field" data-field="id_passport_picture" accept="image/*,.pdf" style="display: none;" onchange="previewDocumentImage(this)">
                        <button type="button" class="btn btn-edit" onclick="document.getElementById('edit_id_passport_picture').click()">
                            <i class="fa fa-upload"></i> ${user.id_passport_picture ? 'Change' : 'Upload'} Document
                        </button>
                        ${user.id_passport_picture ? `
                            <button type="button" class="btn btn-delete" onclick="removeDocumentImage()" style="margin-left: 8px;">
                                <i class="fa fa-trash"></i> Remove
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>

        </div>

        <div class="action-buttons" style="display: flex; gap: 12px; justify-content: center; margin-top: 32px; padding-top: 24px; border-top: 2px solid var(--border);">
            ${!editMode ? `
                <button class="btn btn-edit" onclick="toggleEditMode()">
                    <i class="fa fa-edit"></i> Edit
                </button>
                <button class="btn btn-view" onclick="closeUserDetailsModal()">
                    <i class="fa fa-times"></i> Close
                </button>
            ` : `
                <button class="btn btn-view" onclick="cancelEdit()">
                    <i class="fa fa-times"></i> Cancel
                </button>
                <button class="btn btn-add" onclick="saveUserChanges()">
                    <i class="fa fa-save"></i> Save Changes
                </button>
            `}
        </div>
    `;
}

function toggleEditMode() {
    if (!currentEditingUser) return;
    isEditMode = true;
    renderUserDetails(currentEditingUser, true);
}

function cancelEdit() {
    if (!currentEditingUser) return;
    isEditMode = false;
    // Reset removal flags
    window.profilePictureRemoved = false;
    window.idPassportRemoved = false;
    renderUserDetails(currentEditingUser, false);
}

async function saveUserChanges() {
    if (!currentEditingUser) return;

    // Handle image uploads first
    const profilePictureFile = document.getElementById('edit_profile_picture')?.files[0];
    const idPassportFile = document.getElementById('edit_id_passport_picture')?.files[0];
    
    // Upload images if changed
    if (profilePictureFile) {
        try {
            const formData = new FormData();
            formData.append('profile_picture', profilePictureFile);
            formData.append('user_id', currentEditingUser.id);
            formData.append('image_type', 'profile_picture');

            const token = localStorage.getItem('admin_token');
            const response = await fetch('../public/backend/api/admin/upload-user-image.php', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            if (!result.success) {
                alert('Error uploading profile picture: ' + result.message);
                return;
            }
        } catch (error) {
            console.error('[ADMIN] Error uploading profile picture:', error);
            alert('Error uploading profile picture');
            return;
        }
    }

    if (idPassportFile) {
        try {
            const formData = new FormData();
            formData.append('id_passport_picture', idPassportFile);
            formData.append('user_id', currentEditingUser.id);
            formData.append('image_type', 'id_passport_picture');

            const token = localStorage.getItem('admin_token');
            const response = await fetch('../public/backend/api/admin/upload-user-image.php', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            if (!result.success) {
                alert('Error uploading document: ' + result.message);
                return;
            }
        } catch (error) {
            console.error('[ADMIN] Error uploading document:', error);
            alert('Error uploading document');
            return;
        }
    }

    // Handle other field updates
    const updateData = {
        id: currentEditingUser.id
    };

    // Collect all editable fields (excluding file inputs)
    const editableFields = document.querySelectorAll('.edit-field:not([type="file"])');
    editableFields.forEach(field => {
        const fieldName = field.dataset.field;
        // Skip image fields - they're handled separately
        if (fieldName === 'profile_picture' || fieldName === 'id_passport_picture') {
            return;
        }

        let value = null;

        if (field.type === 'checkbox') {
            value = field.checked ? 1 : 0;
        } else if (field.type === 'number') {
            value = field.value !== '' && field.value !== null ? parseFloat(field.value) : null;
        } else if (field.tagName === 'SELECT') {
            value = field.value === '' ? null : field.value;
        } else if (field.tagName === 'TEXTAREA') {
            value = field.value.trim() === '' ? null : field.value.trim();
        } else if (field.type === 'date') {
            value = field.value === '' ? null : field.value;
        } else if (field.type === 'email' || field.type === 'tel' || field.type === 'text') {
            value = field.value.trim() === '' ? null : field.value.trim();
        } else {
            value = field.value.trim() === '' ? null : field.value.trim();
        }

        updateData[fieldName] = value;
    });

    // Handle removed images
    if (window.profilePictureRemoved) {
        updateData.profile_picture = null;
    }
    if (window.idPassportRemoved) {
        updateData.id_passport_picture = null;
    }

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/update-user.php', {
            method: 'POST',
            body: JSON.stringify(updateData)
        });

        if (data.success) {
            alert('User updated successfully!');
            // Reset removed flags
            window.profilePictureRemoved = false;
            window.idPassportRemoved = false;
            // Reload user data to show updated information
            await viewUserDetails(currentEditingUser.id);
            isEditMode = false;
            // Refresh users list
            loadUsers();
        } else {
            alert('Error: ' + (data.message || 'Failed to update user'));
        }
    } catch (error) {
        console.error('[ADMIN] Error updating user:', error);
        alert('Error updating user. Please try again.');
    }
}

function previewProfileImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profile-preview');
            const previewText = document.getElementById('profile-preview-text');
            if (preview) {
                preview.src = e.target.result;
            } else if (previewText) {
                previewText.outerHTML = `<img id="profile-preview" src="${e.target.result}" alt="Profile Picture" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 3px solid var(--border);">`;
            }
        };
        reader.readAsDataURL(input.files[0]);
        window.profilePictureRemoved = false; // Reset removal flag
    }
}

function previewDocumentImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const container = document.getElementById('document-preview-container');
        
        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = function(e) {
                container.innerHTML = `<embed src="${e.target.result}" type="application/pdf" style="width: 100%; height: 500px; border-radius: 8px; border: 2px solid var(--border);">`;
            };
            reader.readAsDataURL(file);
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                container.innerHTML = `<img src="${e.target.result}" alt="ID/Passport Document" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 2px solid var(--border);">`;
            };
            reader.readAsDataURL(file);
        }
        window.idPassportRemoved = false; // Reset removal flag
    }
}

function removeProfilePicture() {
    if (confirm('Are you sure you want to remove the profile picture?')) {
        const preview = document.getElementById('profile-preview');
        const previewText = document.getElementById('profile-preview-text');
        const input = document.getElementById('edit_profile_picture');
        
        if (preview) {
            preview.remove();
        }
        if (!previewText) {
            const container = document.querySelector('.user-image-container');
            container.innerHTML = '<p id="profile-preview-text">No profile picture</p>';
        }
        if (input) {
            input.value = '';
        }
        window.profilePictureRemoved = true;
    }
}

function removeDocumentImage() {
    if (confirm('Are you sure you want to remove the ID/Passport document?')) {
        const container = document.getElementById('document-preview-container');
        const input = document.getElementById('edit_id_passport_picture');
        
        container.innerHTML = '<p style="text-align: center; padding: 20px;">No document uploaded</p>';
        if (input) {
            input.value = '';
        }
        window.idPassportRemoved = true;
    }
}

function closeUserDetailsModal() {
    document.getElementById('user-details-modal').classList.remove('active');
    isEditMode = false;
    currentEditingUser = null;
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('user-details-modal');
    if (e.target === modal) {
        closeUserDetailsModal();
    }
});

// Load users on page load
loadUsers();

