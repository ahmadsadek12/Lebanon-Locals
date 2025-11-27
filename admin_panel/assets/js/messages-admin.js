/**
 * Admin Messages Viewer
 */

if (!window.AdminAuth.requireAdmin()) {}

const adminUser = window.AdminAuth.getAdminUser();
if (adminUser) {
    const initials = (adminUser.first_name.charAt(0) + adminUser.last_name.charAt(0)).toUpperCase();
    document.getElementById('admin-avatar').textContent = initials;
    document.getElementById('admin-name').textContent = `${adminUser.first_name} ${adminUser.last_name}`;
}

let allMessages = [];

async function loadMessages() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/messages.php');
        if (data.success && data.data) {
            allMessages = data.data;
            displayMessages(allMessages);
        } else {
            showError('Failed to load messages');
        }
    } catch (error) {
        console.error('[ADMIN] Error loading messages:', error);
        showError('Error loading messages');
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messages-table');

    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-envelope"></i><p>No messages found</p></div>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${messages.map(msg => `
                    <tr>
                        <td>#${msg.id}</td>
                        <td>${msg.sender_name || 'N/A'}</td>
                        <td>${msg.receiver_name || 'N/A'}</td>
                        <td>${msg.subject || 'N/A'}</td>
                        <td>${msg.message_text ? msg.message_text.substring(0, 50) + '...' : 'N/A'}</td>
                        <td>${msg.is_read == 1 ? '<span class="badge badge-success">Read</span>' : '<span class="badge badge-warning">Unread</span>'}</td>
                        <td>${formatDate(msg.created_at)}</td>
                        <td>
                            <button class="btn btn-delete" onclick="deleteMessage(${msg.id})">
                                <i class="fa fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

document.getElementById('filter-read').addEventListener('change', function(e) {
    const readStatus = e.target.value;
    const searchQuery = document.getElementById('search-messages').value.toLowerCase();

    let filtered = allMessages;
    if (readStatus !== '') {
        filtered = filtered.filter(m => m.is_read == readStatus);
    }
    if (searchQuery) {
        filtered = filtered.filter(m =>
            (m.sender_name && m.sender_name.toLowerCase().includes(searchQuery)) ||
            (m.receiver_name && m.receiver_name.toLowerCase().includes(searchQuery)) ||
            (m.subject && m.subject.toLowerCase().includes(searchQuery)) ||
            (m.message_text && m.message_text.toLowerCase().includes(searchQuery))
        );
    }

    displayMessages(filtered);
});

document.getElementById('search-messages').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const readStatus = document.getElementById('filter-read').value;

    let filtered = allMessages;
    if (readStatus !== '') {
        filtered = filtered.filter(m => m.is_read == readStatus);
    }
    if (query) {
        filtered = filtered.filter(m =>
            (m.sender_name && m.sender_name.toLowerCase().includes(query)) ||
            (m.receiver_name && m.receiver_name.toLowerCase().includes(query)) ||
            (m.subject && m.subject.toLowerCase().includes(query)) ||
            (m.message_text && m.message_text.toLowerCase().includes(query))
        );
    }

    displayMessages(filtered);
});

async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/delete-message.php', 'POST', { id: messageId });
        if (data.success) {
            alert('Message deleted successfully');
            loadMessages();
        } else {
            alert(data.message || 'Failed to delete message');
        }
    } catch (error) {
        console.error('[ADMIN] Error deleting message:', error);
        alert('Error deleting message');
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showError(message) {
    document.getElementById('messages-table').innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

loadMessages();
