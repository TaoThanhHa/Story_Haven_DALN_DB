let currentPage = 1;
let currentSearch = '';
let currentRole = '';
let currentStatus = '';

// Hàm định dạng ngày tháng
function formatDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', { hour12: false });
}

// Fetch users
async function fetchUsers(page = 1, search = '', role = '', status = '') {
    try {
        const res = await fetch(`/admin/api/users?page=${page}&limit=10&search=${search}&role=${role}&status=${status}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch users');

        displayUsers(data.users);
        setupPagination(data.totalUsers, data.totalPages, data.currentPage);

        currentPage = data.currentPage;
        currentSearch = search;
        currentRole = role;
        currentStatus = status;
    } catch (err) {
        console.error(err);
        alert('Lỗi khi tải danh sách người dùng: ' + err.message);
    }
}

// Hiển thị user vào bảng
function displayUsers(users) {
    const tbody = document.querySelector('#user-table tbody');
    tbody.innerHTML = '';
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="7">Không có người dùng nào.</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = tbody.insertRow();
        row.insertCell().textContent = user._id; // sửa từ user.id thành user._id
        row.insertCell().textContent = user.username;
        row.insertCell().textContent = user.email;
        row.insertCell().textContent = user.role;
        row.insertCell().textContent = user.status === 'active' ? 'Hoạt động' : 'Bị khóa';
        row.insertCell().textContent = formatDateTime(user.created_at);

        const actions = row.insertCell();

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Chi tiết/Sửa';
        editBtn.className = 'btn btn-sm btn-info';
        editBtn.onclick = () => openUserModal(user._id);
        actions.appendChild(editBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Xóa';
        deleteBtn.className = 'btn btn-sm btn-danger ml-2';
        deleteBtn.onclick = () => deleteUser(user._id);
        actions.appendChild(deleteBtn);
    });
}

// Phân trang
function setupPagination(totalItems, totalPages, currentPage) {
    const paginationDiv = document.getElementById('user-pagination');
    paginationDiv.innerHTML = '';
    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.textContent = 'Trước';
    prev.disabled = currentPage === 1;
    prev.onclick = () => fetchUsers(currentPage - 1, currentSearch, currentRole, currentStatus);
    paginationDiv.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active' : '';
        btn.onclick = () => fetchUsers(i, currentSearch, currentRole, currentStatus);
        paginationDiv.appendChild(btn);
    }

    const next = document.createElement('button');
    next.textContent = 'Sau';
    next.disabled = currentPage === totalPages;
    next.onclick = () => fetchUsers(currentPage + 1, currentSearch, currentRole, currentStatus);
    paginationDiv.appendChild(next);
}

// Search & filter
function searchAndFilterUsers() {
    const search = document.getElementById('search-input').value;
    const role = document.getElementById('role-filter').value;
    const status = document.getElementById('status-filter').value;
    fetchUsers(1, search, role, status);
}

// Modal
async function openUserModal(userId) {
    const modal = document.getElementById('userModal');
    modal.style.display = 'block';
    try {
        const res = await fetch(`/admin/api/users/${userId}`);
        const user = await res.json();
        if (!res.ok) throw new Error(user.error || 'Failed to fetch user');

        document.getElementById('modalTitle').textContent = `Chi tiết người dùng: ${user.username}`;
        document.getElementById('modalUserId').value = user._id;
        document.getElementById('modalUsername').value = user.username;
        document.getElementById('modalEmail').value = user.email;
        document.getElementById('modalRole').value = user.role;
        document.getElementById('modalStatus').value = user.status;
        document.getElementById('modalCreatedAt').value = formatDateTime(user.created_at);
        document.getElementById('modalTotalStories').value = user.total_stories;

        const currentAdminId = document.body.dataset.userId;
        if (currentAdminId && currentAdminId === user._id) {
            document.getElementById('deleteUserBtn').style.display = 'none';
        } else {
            document.getElementById('deleteUserBtn').style.display = 'inline-block';
        }
    } catch (err) {
        console.error(err);
        alert('Lỗi khi tải chi tiết người dùng: ' + err.message);
        hideModal('userModal');
    }
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Lưu thay đổi
async function saveUserChanges() {
    const userId = document.getElementById('modalUserId').value;
    const role = document.getElementById('modalRole').value;
    const status = document.getElementById('modalStatus').value;

    try {
        const res = await fetch(`/admin/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, status })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Failed');

        alert('Cập nhật người dùng thành công!');
        hideModal('userModal');
        fetchUsers(currentPage, currentSearch, currentRole, currentStatus);
    } catch (err) {
        console.error(err);
        alert('Lỗi khi lưu thay đổi: ' + err.message);
    }
}

// Xóa user
async function deleteUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    try {
        const res = await fetch(`/admin/api/users/${userId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'Failed');

        alert('Xóa người dùng thành công!');
        fetchUsers(currentPage, currentSearch, currentRole, currentStatus);
    } catch (err) {
        console.error(err);
        alert('Lỗi khi xóa người dùng: ' + err.message);
    }
}

// DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();

    document.getElementById('saveUserBtn')?.addEventListener('click', saveUserChanges);
    document.getElementById('deleteUserBtn')?.addEventListener('click', () => {
        const userId = document.getElementById('modalUserId').value;
        if (userId) deleteUser(userId);
    });

    document.getElementById('role-filter')?.addEventListener('change', searchAndFilterUsers);
    document.getElementById('status-filter')?.addEventListener('change', searchAndFilterUsers);
    document.getElementById('search-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') searchAndFilterUsers();
    });
});
