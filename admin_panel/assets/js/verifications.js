/**
 * Admin Verifications Management
 */

if (!window.AdminAuth.requireAdmin()) {}

const adminUser = window.AdminAuth.getAdminUser();
if (adminUser) {
    const initials = (adminUser.first_name.charAt(0) + adminUser.last_name.charAt(0)).toUpperCase();
    document.getElementById('admin-avatar').textContent = initials;
    document.getElementById('admin-name').textContent = `${adminUser.first_name} ${adminUser.last_name}`;
}

let currentUserId = null;

async function loadVerifications() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/verifications.php');

        const container = document.getElementById('verifications-table');
        
        if (data.success && data.data && data.data.length > 0) {
            container.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Document</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(user => `
                            <tr>
                                <td>${user.first_name} ${user.last_name}</td>
                                <td>${user.email}</td>
                                <td>${user.verification_document ? '<span class="badge badge-info">Document Uploaded</span>' : 'No document'}</td>
                                <td>${formatDate(user.created_at)}</td>
                                <td>
                                    <button class="btn btn-view" onclick="viewUserDetails(${user.id})">
                                        <i class="fa fa-eye"></i> View User
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fa fa-check-circle"></i><p>No pending verifications</p></div>';
        }
    } catch (error) {
        console.error('[ADMIN] Error loading verifications:', error);
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('user-details-modal');
    if (e.target === modal) {
        closeUserDetailsModal();
    }
});

async function viewUserDetails(userId) {
    currentUserId = userId;
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

function renderUserDetails(user) {
    const content = document.getElementById('user-details-content');
    
    // Format date helper
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Format datetime helper
    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
            .action-buttons {
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-top: 32px;
                padding-top: 24px;
                border-top: 2px solid var(--border);
            }
        </style>

        <div class="user-details-grid">
            <div class="user-details-section full-width">
                <div class="user-image-container">
                    ${user.profile_picture ? 
                        `<img src="../public/${user.profile_picture}" alt="Profile Picture" onerror="this.src='../public/images/profile_photo.png'">` : 
                        '<p>No profile picture</p>'
                    }
                </div>
            </div>

            <div class="user-details-section">
                <h3>Basic Information</h3>
                <div class="detail-row">
                    <span class="detail-label">User ID:</span>
                    <span class="detail-value">#${user.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Full Name:</span>
                    <span class="detail-value">${user.first_name || 'N/A'} ${user.last_name || ''}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${user.email || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">User Type:</span>
                    <span class="detail-value">${user.user_type || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Verified Status:</span>
                    <span class="detail-value">${user.is_verified == 1 ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-secondary">Not Verified</span>'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Active Status:</span>
                    <span class="detail-value">${user.is_active == 1 ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</span>
                </div>
            </div>

            <div class="user-details-section">
                <h3>Personal Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Gender:</span>
                    <span class="detail-value">${user.gender || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date of Birth:</span>
                    <span class="detail-value">${formatDate(user.date_of_birth)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Age:</span>
                    <span class="detail-value">${user.age || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Nationality:</span>
                    <span class="detail-value">${user.nationality || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone Number:</span>
                    <span class="detail-value">${user.phone_number || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Languages:</span>
                    <span class="detail-value">${user.languages_spoken || 'N/A'}</span>
                </div>
            </div>

            <div class="user-details-section">
                <h3>Contact & Emergency</h3>
                <div class="detail-row">
                    <span class="detail-label">Emergency Contact Name:</span>
                    <span class="detail-value">${user.emergency_contact_name || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Emergency Contact Phone:</span>
                    <span class="detail-value">${user.emergency_contact_phone || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Address ID:</span>
                    <span class="detail-value">${user.address_id || 'N/A'}</span>
                </div>
            </div>

            <div class="user-details-section">
                <h3>Account Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Credits:</span>
                    <span class="detail-value">${user.credits || 0}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">User Ranking:</span>
                    <span class="detail-value">${user.user_ranking || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Reviews:</span>
                    <span class="detail-value">${user.total_reviews || 0}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Years Hosting:</span>
                    <span class="detail-value">${user.years_hosting || 'N/A'}</span>
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

            ${user.bio ? `
            <div class="user-details-section full-width">
                <h3>Bio</h3>
                <p>${user.bio}</p>
            </div>
            ` : ''}

            ${user.id_passport_picture ? `
            <div class="user-details-section full-width">
                <h3>ID/Passport Document</h3>
                <div class="document-image-container">
                    ${user.id_passport_picture.endsWith('.pdf') ? 
                        `<embed src="../public/${user.id_passport_picture}" type="application/pdf">` : 
                        `<img src="../public/${user.id_passport_picture}" alt="ID/Passport Document">`
                    }
                </div>
            </div>
            ` : ''}

        </div>

        <div class="action-buttons">
            <button class="btn btn-delete" onclick="denyVerification()">
                <i class="fa fa-times"></i> Deny
            </button>
            <button class="btn btn-add" onclick="verifyUser()">
                <i class="fa fa-check"></i> Verify
            </button>
        </div>
    `;
}

function closeUserDetailsModal() {
    document.getElementById('user-details-modal').classList.remove('active');
    currentUserId = null;
}

async function verifyUser() {
    if (!currentUserId) return;
    
    if (!confirm('Are you sure you want to verify this user and make them a host?')) {
        return;
    }

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/verify-user.php', {
            method: 'POST',
            body: JSON.stringify({ user_id: currentUserId, action: 'verify' })
        });

        if (data.success) {
            alert('User verified successfully! They are now a host.');
            closeUserDetailsModal();
            loadVerifications();
        } else {
            alert('Error: ' + (data.message || 'Failed to verify user'));
        }
    } catch (error) {
        console.error('[ADMIN] Error verifying user:', error);
        alert('Error verifying user. Please try again.');
    }
}

async function denyVerification() {
    if (!currentUserId) return;
    
    if (!confirm('Are you sure you want to deny this verification request? The user will remain as a regular user and can re-apply later.')) {
        return;
    }

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/verify-user.php', {
            method: 'POST',
            body: JSON.stringify({ user_id: currentUserId, action: 'deny' })
        });

        if (data.success) {
            alert('Verification request denied. The user has been notified.');
            closeUserDetailsModal();
            loadVerifications();
        } else {
            alert('Error: ' + (data.message || 'Failed to deny verification'));
        }
    } catch (error) {
        console.error('[ADMIN] Error denying verification:', error);
        alert('Error denying verification. Please try again.');
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

loadVerifications();

