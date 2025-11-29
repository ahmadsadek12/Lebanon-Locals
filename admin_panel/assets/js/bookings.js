/**
 * Admin Bookings Management
 */

if (!window.AdminAuth.requireAdmin()) {}

const adminUser = window.AdminAuth.getAdminUser();
if (adminUser) {
    const initials = (adminUser.first_name.charAt(0) + adminUser.last_name.charAt(0)).toUpperCase();
    document.getElementById('admin-avatar').textContent = initials;
    document.getElementById('admin-name').textContent = `${adminUser.first_name} ${adminUser.last_name}`;
}

let allBookings = [];

async function loadBookings() {
    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/bookings.php');
        if (data.success && data.data) {
            allBookings = data.data;
            displayBookings(allBookings);
        }
    } catch (error) {
        console.error('[ADMIN] Error loading bookings:', error);
    }
}

function displayBookings(bookings) {
    const container = document.getElementById('bookings-table');
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-calendar"></i><p>No bookings found</p></div>';
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Guest</th>
                    <th>Listing</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Guests</th>
                    <th>Total</th>
                    <th>Service Fee</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                    <tr>
                        <td>#${booking.id}</td>
                        <td>${booking.guest_name || 'N/A'}</td>
                        <td>${booking.listing_title || 'N/A'}</td>
                        <td><span class="badge badge-info">${booking.listing_type}</span></td>
                        <td>${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}</td>
                        <td>${booking.number_of_guests || booking.guests || 1}</td>
                        <td>$${parseFloat(booking.total_price || 0).toFixed(2)}</td>
                        <td>$${parseFloat(booking.service_fee || 0).toFixed(2)}</td>
                        <td><span class="badge badge-${getStatusClass(booking.booking_status || booking.status)}">${booking.booking_status || booking.status}</span></td>
                        <td><span class="badge badge-${getPaymentClass(booking.payment_status)}">${booking.payment_status || 'N/A'}</span></td>
                        <td>
                            <button class="btn btn-edit" onclick="editBooking(${booking.id})"><i class="fa fa-edit"></i></button>
                            <button class="btn btn-delete" onclick="deleteBooking(${booking.id})"><i class="fa fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Filter bookings
document.getElementById('filter-status').addEventListener('change', function(e) {
    const status = e.target.value;
    const filtered = status ? allBookings.filter(b => (b.booking_status || b.status) === status) : allBookings;
    displayBookings(filtered);
});

// Search bookings
document.getElementById('search-bookings').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    const filtered = allBookings.filter(b =>
        (b.guest_name && b.guest_name.toLowerCase().includes(query)) ||
        (b.listing_title && b.listing_title.toLowerCase().includes(query)) ||
        String(b.id).includes(query)
    );
    displayBookings(filtered);
});

function editBooking(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;

    document.getElementById('booking-id').value = booking.id;
    document.getElementById('booking-status').value = booking.booking_status || booking.status;
    document.getElementById('payment-status').value = booking.payment_status || 'pending';

    document.getElementById('edit-booking-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('edit-booking-modal').classList.remove('active');
}

document.getElementById('edit-booking-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
        id: document.getElementById('booking-id').value,
        booking_status: document.getElementById('booking-status').value,
        payment_status: document.getElementById('payment-status').value
    };

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/update-booking.php', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (data.success) {
            alert('Booking updated successfully');
            closeModal();
            loadBookings();
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('[ADMIN] Error updating booking:', error);
        alert('Error updating booking');
    }
});

async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
        const data = await window.AdminAuth.apiRequest('../public/backend/api/admin/delete-booking.php', {
            method: 'POST',
            body: JSON.stringify({ id: bookingId })
        });

        if (data.success) {
            alert('Booking deleted successfully');
            loadBookings();
        } else {
            alert('Error: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('[ADMIN] Error deleting booking:', error);
        alert('Error deleting booking');
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusClass(status) {
    const map = { 'confirmed': 'success', 'pending': 'warning', 'cancelled': 'danger', 'completed': 'info' };
    return map[status] || 'secondary';
}

function getPaymentClass(status) {
    const map = { 'paid': 'success', 'pending': 'warning', 'failed': 'danger', 'refunded': 'info' };
    return map[status] || 'secondary';
}

loadBookings();

