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
                                    ${user.verification_document ? `
                                        <button class="btn btn-view" onclick="viewDocument(${user.id}, '${user.verification_document}')">
                                            <i class="fa fa-eye"></i> View
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-add" onclick="quickApprove(${user.id})">
                                        <i class="fa fa-check"></i> Approve
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

function viewDocument(userId, docPath) {
    currentUserId = userId;
    const viewer = document.getElementById('document-viewer');
    
    if (docPath.endsWith('.pdf')) {
        viewer.innerHTML = `<embed src="../public/${docPath}" type="application/pdf" width="100%" height="600px">`;
    } else {
        viewer.innerHTML = `<img src="../public/${docPath}" style="max-width: 100%; height: auto; border-radius: 8px;">`;
    }

    document.getElementById('view-doc-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('view-doc-modal').classList.remove('active');
    currentUserId = null;
}

async function approveVerification() {
    if (!currentUserId) return;

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/verify-user.php', {
            method: 'POST',
            body: JSON.stringify({ user_id: currentUserId, is_verified: 1 })
        });

        if (data.success) {
            alert('User verified successfully');
            closeModal();
            loadVerifications();
        }
    } catch (error) {
        console.error('[ADMIN] Error approving:', error);
    }
}

async function rejectVerification() {
    if (!currentUserId) return;
    if (!confirm('Reject this verification request?')) return;

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/verify-user.php', {
            method: 'POST',
            body: JSON.stringify({ user_id: currentUserId, is_verified: 0 })
        });

        if (data.success) {
            alert('Verification rejected');
            closeModal();
            loadVerifications();
        }
    } catch (error) {
        console.error('[ADMIN] Error rejecting:', error);
    }
}

async function quickApprove(userId) {
    if (!confirm('Verify this user without viewing document?')) return;

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/verify-user.php', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, is_verified: 1 })
        });

        if (data.success) {
            alert('User verified successfully');
            loadVerifications();
        }
    } catch (error) {
        console.error('[ADMIN] Error approving:', error);
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

loadVerifications();

