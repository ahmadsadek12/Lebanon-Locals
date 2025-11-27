/**
 * Admin Payments Viewer
 */

if (!window.AdminAuth.requireAdmin()) {}

const adminUser = window.AdminAuth.getAdminUser();
if (adminUser) {
    const initials = (adminUser.first_name.charAt(0) + adminUser.last_name.charAt(0)).toUpperCase();
    document.getElementById('admin-avatar').textContent = initials;
    document.getElementById('admin-name').textContent = `${adminUser.first_name} ${adminUser.last_name}`;
}

let allPayments = [];

async function loadPayments() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/payments.php');
        if (data.success && data.data) {
            allPayments = data.data;
            displayPayments(allPayments);
        } else {
            showError('Failed to load payments');
        }
    } catch (error) {
        console.error('[ADMIN] Error loading payments:', error);
        showError('Error loading payments');
    }
}

function displayPayments(payments) {
    const container = document.getElementById('payments-table');

    if (!payments || payments.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-dollar"></i><p>No payments found</p></div>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Booking ID</th>
                    <th>Transaction ID</th>
                    <th>Guest</th>
                    <th>Host</th>
                    <th>Listing</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${payments.map(payment => `
                    <tr>
                        <td>#${payment.booking_id}</td>
                        <td>${payment.transaction_id || 'N/A'}</td>
                        <td>${payment.guest_name || 'N/A'}</td>
                        <td>${payment.host_name || 'N/A'}</td>
                        <td>${payment.listing_title || 'N/A'}</td>
                        <td><span class="badge badge-${getTypeColor(payment.listing_type)}">${payment.listing_type}</span></td>
                        <td>$${parseFloat(payment.total_price).toFixed(2)}</td>
                        <td><span class="badge badge-${getStatusColor(payment.payment_status)}">${payment.payment_status}</span></td>
                        <td>${payment.payment_method || 'N/A'}</td>
                        <td>${formatDate(payment.booking_date)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function getTypeColor(type) {
    const colorMap = {
        'experience': 'info',
        'event': 'warning',
        'stay': 'success'
    };
    return colorMap[type] || 'secondary';
}

function getStatusColor(status) {
    const colorMap = {
        'paid': 'success',
        'pending': 'warning',
        'refunded': 'info',
        'failed': 'danger'
    };
    return colorMap[status] || 'secondary';
}

document.getElementById('filter-status').addEventListener('change', applyFilters);
document.getElementById('filter-type').addEventListener('change', applyFilters);
document.getElementById('search-payments').addEventListener('input', applyFilters);

function applyFilters() {
    const status = document.getElementById('filter-status').value;
    const type = document.getElementById('filter-type').value;
    const searchQuery = document.getElementById('search-payments').value.toLowerCase();

    let filtered = allPayments;

    if (status) {
        filtered = filtered.filter(p => p.payment_status === status);
    }
    if (type) {
        filtered = filtered.filter(p => p.listing_type === type);
    }
    if (searchQuery) {
        filtered = filtered.filter(p =>
            (p.guest_name && p.guest_name.toLowerCase().includes(searchQuery)) ||
            (p.host_name && p.host_name.toLowerCase().includes(searchQuery)) ||
            (p.listing_title && p.listing_title.toLowerCase().includes(searchQuery)) ||
            (p.transaction_id && p.transaction_id.toLowerCase().includes(searchQuery))
        );
    }

    displayPayments(filtered);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showError(message) {
    document.getElementById('payments-table').innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
}

loadPayments();
