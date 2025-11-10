let currentPage = 1;
let currentSearch = '';
let currentStatus = '';
let currentCategory = '';

function formatDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', { hour12: false });
}

async function fetchStories(page = 1, search = '', status = '', category = '') {
    try {
        // URL đúng với API routes
        const res = await fetch(`/api/stories?page=${page}&limit=10&search=${search}&status=${status}&category=${category}`);
        
        // Lấy raw text trước để kiểm tra
        const text = await res.text();

        // Nếu server trả HTML (thường là '<!DOCTYPE html>') thì throw error
        if (text.startsWith('<')) {
            console.error('Server trả HTML, không phải JSON:', text);
            throw new Error('Lỗi server: không nhận được JSON từ API. Có thể chưa login hoặc URL sai.');
        }

        const data = JSON.parse(text);

        if (!res.ok) throw new Error(data.error || 'Lỗi khi tải truyện');

        displayStories(data.stories);
        setupPagination(data.totalStories, data.totalPages, data.currentPage);

        // Cập nhật biến global
        currentPage = data.currentPage;
        currentSearch = search;
        currentStatus = status;
        currentCategory = category;

    } catch (err) {
        console.error('fetchStories error:', err);
        alert(err.message);
    }
}


function displayStories(stories) {
    const tbody = document.querySelector('#story-table-body');
    tbody.innerHTML = '';
    if (!stories.length) return tbody.innerHTML = '<tr><td colspan="9">Không có truyện nào.</td></tr>';
    stories.forEach(s => {
        const row = tbody.insertRow();
        row.insertCell().textContent = s.id;
        const thumbCell = row.insertCell();
        const img = document.createElement('img');
        img.src = s.thumbnail || '/images/default-thumbnail.png';
        img.style.width = '60px';
        thumbCell.appendChild(img);
        row.insertCell().textContent = s.title;
        row.insertCell().textContent = s.author_username;
        row.insertCell().textContent = s.category || '';
        row.insertCell().textContent = s.status === 'complete' ? 'Hoàn thành' : (s.status === 'writing' ? 'Đang viết' : (s.status === 'blocked' ? 'Bị khóa' : 'Đã duyệt'));
        row.insertCell().textContent = s.total_chapters || 0;
        row.insertCell().textContent = formatDateTime(s.created_at);
        const actions = row.insertCell();
        const detailBtn = document.createElement('button');
        detailBtn.textContent = 'Chi tiết/Sửa';
        detailBtn.className = 'btn btn-info btn-sm';
        detailBtn.onclick = () => openStoryModal(s.id);
        actions.appendChild(detailBtn);
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Xóa';
        delBtn.className = 'btn btn-danger btn-sm ml-2';
        delBtn.onclick = () => deleteStory(s.id);
        actions.appendChild(delBtn);
    });
}

async function loadCategoriesIntoFilter() {
    const select = document.getElementById('story-category-filter');
    select.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
    try {
        const res = await fetch('/admin/api/story-categories');
        if (!res.ok) throw new Error('Lỗi tải danh sách thể loại');
        const cats = await res.json();
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadCategoriesIntoModalFilter() {
    const select = document.getElementById('modalCategory');
    select.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Chọn thể loại';
    select.appendChild(defaultOpt);
    try {
        const res = await fetch('/admin/api/story-categories');
        if (!res.ok) throw new Error('Lỗi tải thể loại modal');
        const cats = await res.json();
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error(err);
    }
}

async function openStoryModal(id) {
    const modal = document.getElementById('storyModal');
    modal.style.display = 'block';
    modal.classList.add('show');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'storyModalBackdrop';
    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');

    await loadCategoriesIntoModalFilter();
    try {
        const res = await fetch(`/admin/api/stories/${id}`);
        const s = await res.json();
        if (!res.ok) throw new Error(s.error || 'Lỗi tải chi tiết');
        document.getElementById('modalStoryId').value = s.id;
        document.getElementById('modalStoryTitle').value = s.title;
        document.getElementById('modalAuthorUsername').value = s.author_username;
        document.getElementById('modalDescription').value = s.description;
        document.getElementById('modalThumbnailImg').src = s.thumbnail || '/images/default-thumbnail.png';
        document.getElementById('modalThumbnail').value = s.thumbnail || '';
        document.getElementById('modalCategory').value = s.category || '';
        document.getElementById('modalStatus').value = s.status;
        document.getElementById('modalCreatedAt').value = formatDateTime(s.created_at);
        const tbody = document.getElementById('modalChaptersList');
        tbody.innerHTML = '';
        if (s.chapters?.length) {
            s.chapters.forEach(c => {
                const row = tbody.insertRow();
                row.insertCell().textContent = c.chapter_number;
                row.insertCell().textContent = c.title;
                row.insertCell().textContent = formatDateTime(c.created_at);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3">Chưa có chương nào.</td></tr>';
        }
    } catch (err) {
        console.error(err);
        alert(err.message);
        hideModal('storyModal');
    }
}

function hideModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = 'none';
    modal.classList.remove('show');
    const backdrop = document.getElementById('storyModalBackdrop');
    if (backdrop) backdrop.remove();
    document.body.classList.remove('modal-open');
}

async function saveStoryChanges() {
    const id = document.getElementById('modalStoryId').value;
    const status = document.getElementById('modalStatus').value;
    const category = document.getElementById('modalCategory').value;
    try {
        const res = await fetch(`/admin/api/stories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, category })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi lưu truyện');
        alert('Cập nhật truyện thành công');
        hideModal('storyModal');
        fetchStories(currentPage, currentSearch, currentStatus, currentCategory);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

async function deleteStory(id) {
    if (!confirm('Xóa truyện này? Toàn bộ chương cũng sẽ bị xóa.')) return;
    try {
        const res = await fetch(`/admin/api/stories/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi xóa truyện');
        alert('Xóa truyện thành công');
        hideModal('storyModal');
        fetchStories(currentPage, currentSearch, currentStatus, currentCategory);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

function searchAndFilterStories() {
    const search = document.getElementById('story-search-input').value;
    const status = document.getElementById('story-status-filter').value;
    const category = document.getElementById('story-category-filter').value;
    fetchStories(1, search, status, category);
}

// Pagination giống code cũ, không thay đổi logic
function setupPagination(totalItems, totalPages, page) {
    const div = document.getElementById('story-pagination');
    div.innerHTML = '';
    if (totalPages <= 1) return;
    const addBtn = (text, p, disabled = false, active = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.className = `btn btn-outline-primary mr-1${active?' active':''}`;
        btn.disabled = disabled;
        btn.onclick = () => fetchStories(p, currentSearch, currentStatus, currentCategory);
        div.appendChild(btn);
    };
    addBtn('Trước', Math.max(1,page-1), page===1);
    let start = Math.max(1, page-2), end = Math.min(totalPages, start+4);
    if(end-start<4) start = Math.max(1,end-4);
    for(let i=start;i<=end;i++) addBtn(i,i,false,i===page);
    if(end<totalPages) addBtn('Cuối', totalPages);
    addBtn('Sau', Math.min(totalPages,page+1), page===totalPages);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchStories();
    loadCategoriesIntoFilter();
    document.getElementById('story-search-input').addEventListener('keypress', e => { if(e.key==='Enter') searchAndFilterStories(); });
    document.getElementById('story-status-filter').addEventListener('change', searchAndFilterStories);
    document.getElementById('story-category-filter').addEventListener('change', searchAndFilterStories);
    document.getElementById('saveStoryChangesBtn')?.addEventListener('click', saveStoryChanges);
    document.getElementById('deleteStoryBtn')?.addEventListener('click', () => {
        const id = document.getElementById('modalStoryId').value;
        if(id) deleteStory(id);
    });
    window.onclick = e => {
        if(e.target==document.getElementById('storyModal') || e.target==document.getElementById('storyModalBackdrop')) hideModal('storyModal');
    };
});
