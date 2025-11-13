let currentPage = 1;
let currentSearch = '';
let currentStatus = '';
let currentCategory = ''; // Để lọc theo thể loại

// --- KHÔNG CẦN STATIC_CATEGORIES NỮA VÌ SẼ TẢI ĐỘNG TỪ API ---
// const STATIC_CATEGORIES = [...]

function formatDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Sử dụng 'vi-VN' và timezone của server hoặc client
    return date.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

async function fetchStories(page = 1, search = '', status = '', category = '') {
    try {
        const res = await fetch(`/admin/api/stories?page=${page}&limit=10&search=${search}&status=${status}&category=${category}`);

        // Đảm bảo server trả về JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('Server trả HTML/Text, không phải JSON:', text);
            throw new Error('Lỗi server: không nhận được JSON từ API. Có thể chưa login hoặc URL sai, hoặc lỗi server trả về HTML.');
        }

        const data = await res.json(); // Đã chắc chắn là JSON, parse trực tiếp

        if (!res.ok) throw new Error(data.error || 'Lỗi khi tải truyện');

        displayStories(data.stories);
        setupPagination(data.totalStories, data.totalPages, data.currentPage);

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
        row.insertCell().textContent = s._id; // MongoDB dùng _id
        const thumbCell = row.insertCell();
        const img = document.createElement('img');
        img.src = s.thumbnail || '/images/default-thumbnail.png';
        img.alt = s.title; // Thêm alt text
        img.style.width = '60px';
        img.style.height = 'auto'; // Đảm bảo tỷ lệ ảnh
        thumbCell.appendChild(img);
        row.insertCell().textContent = s.title;
        row.insertCell().textContent = s.authorUsername; // Giả định backend đã populate và trả về authorName
        row.insertCell().textContent = Array.isArray(s.category) ? s.category.join(', ') : (s.category || '');
        row.insertCell().textContent = s.status === 'complete' ? 'Hoàn thành' : (s.status === 'writing' ? 'Đang viết' : (s.status === 'blocked' ? 'Bị khóa' : 'Đã duyệt'));
        row.insertCell().textContent = s.totalChapters || 0; // Giả định backend đã tính totalChapters
        row.insertCell().textContent = formatDateTime(s.createdAt); // MongoDB dùng createdAt thay vì created_at
        const actions = row.insertCell();
        const detailBtn = document.createElement('button');
        detailBtn.textContent = 'Chi tiết/Sửa';
        detailBtn.className = 'btn btn-info btn-sm';
        detailBtn.onclick = () => openStoryModal(s._id);
        actions.appendChild(detailBtn);
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Xóa';
        delBtn.className = 'btn btn-danger btn-sm ml-2';
        delBtn.onclick = () => deleteStory(s._id);
        actions.appendChild(delBtn);
    });
}

// Hàm mở modal và tải chi tiết truyện
async function openStoryModal(id) {
    document.getElementById('modalStoryId').value = '';
    document.getElementById('storyModalLabel').textContent = 'Đang tải chi tiết truyện...';
    
    // Hiển thị modal và backdrop ngay lập tức
    const modal = document.getElementById('storyModal');
    modal.style.display = 'block';
    modal.classList.add('show');
    let backdrop = document.getElementById('storyModalBackdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'storyModalBackdrop';
        document.body.appendChild(backdrop);
    }
    document.body.classList.add('modal-open');

    try {
        // Tải danh sách thể loại vào modal SELECT trước khi điền dữ liệu truyện
        await loadCategoriesIntoModalFilter(); // Gọi hàm này khi mở modal
        
        const res = await fetch(`/admin/api/stories/${id}`);
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('Server trả HTML/Text cho story detail:', text);
            throw new Error('Lỗi server: không nhận được JSON từ API chi tiết truyện.');
        }
        const s = await res.json();

        if (!res.ok) throw new Error(s.error || 'Lỗi tải chi tiết truyện');
        
        document.getElementById('modalStoryId').value = s._id;
        document.getElementById('modalStoryTitle').value = s.title;
        document.getElementById('modalAuthorUsername').value = s.authorUsername; // Giả định authorName
        document.getElementById('modalDescription').value = s.description;
        document.getElementById('modalThumbnailImg').src = s.thumbnail || '/images/default-thumbnail.png';
        document.getElementById('modalThumbnail').value = s.thumbnail || '';
        
        // Đặt giá trị cho select thể loại
        const modalCategorySelect = document.getElementById('modalCategory');
        // Nếu s.category là mảng, chọn phần tử đầu tiên hoặc để trống nếu cần UI đa lựa chọn
        if (Array.isArray(s.category) && s.category.length > 0) {
            modalCategorySelect.value = s.category[0]; // Chọn thể loại đầu tiên
        } else if (typeof s.category === 'string') {
            modalCategorySelect.value = s.category; // Nếu category là chuỗi đơn
        } else {
            modalCategorySelect.value = ''; // Không chọn gì
        }

        document.getElementById('modalStatus').value = s.status;
        document.getElementById('modalCreatedAt').value = formatDateTime(s.createdAt); // MongoDB dùng createdAt

        const tbody = document.getElementById('modalChaptersList');
        tbody.innerHTML = '';
        if (s.chapters && s.chapters.length > 0) { // s.chapters là một mảng
            s.chapters.forEach(c => {
                const row = tbody.insertRow();
                row.insertCell().textContent = c.chapterNumber;
                row.insertCell().textContent = c.title;
                row.insertCell().textContent = formatDateTime(c.createdAt); // MongoDB dùng createdAt
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3">Chưa có chương nào.</td></tr>';
        }
        document.getElementById('storyModalLabel').textContent = `Chi tiết Truyện: ${s.title}`;
    } catch (err) {
        console.error('Lỗi khi mở modal truyện:', err);
        alert(`Không thể tải chi tiết truyện: ${err.message}`);
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
    const selectedCategory = document.getElementById('modalCategory').value; // Lấy giá trị category được chọn

    // Nếu backend mong đợi một string đơn, chỉ gửi `selectedCategory`.
    const categoryToSend = selectedCategory;

    try {
        const res = await fetch(`/admin/api/stories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, category: categoryToSend }) 
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi lưu truyện');
        alert('Cập nhật truyện thành công');
        hideModal('storyModal');
        fetchStories(currentPage, currentSearch, currentStatus, currentCategory);
    } catch (err) {
        console.error(err);
        alert(`Lỗi lưu truyện: ${err.message}`);
    }
}

async function deleteStory(id) {
    if (!confirm('Xóa truyện này? Toàn bộ chương cũng sẽ bị xóa.')) return;
    try {
        const res = await fetch(`/admin/api/stories/${id}`, { method: 'DELETE' });
        const data = await res.json(); // Lấy phản hồi JSON
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
    
    // Nút "Trước"
    addBtn('Trước', Math.max(1,page-1), page===1);

    // Xử lý các nút số trang
    const maxPagesToShow = 5; // Số nút trang tối đa hiển thị
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Điều chỉnh lại startPage nếu endPage quá gần totalPages
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
        addBtn('1', 1); // Nút "Đầu"
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'mx-1';
            div.appendChild(dots);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        addBtn(i, i, false, i === page);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'mx-1';
            div.appendChild(dots);
        }
        addBtn(totalPages, totalPages); // Nút "Cuối"
    }

    // Nút "Sau"
    addBtn('Sau', Math.min(totalPages,page+1), page===totalPages);
}


// --- HÀM MỚI: Tải danh sách thể loại động vào filter (dùng cho bộ lọc chính) ---
async function loadCategoriesIntoFilter() {
    const categoryFilter = document.getElementById('story-category-filter');
    // Xóa tất cả các option hiện có (trừ option "Tất cả thể loại" nếu có)
    categoryFilter.querySelectorAll('option:not([value=""])').forEach(option => option.remove());

    try {
        const response = await fetch('/admin/api/story-categories'); // API của bạn trả về danh sách thể loại
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        const categories = await response.json();

        categories.forEach(catName => {
            if (catName) { // Đảm bảo thể loại không rỗng
                const option = document.createElement('option');
                option.value = catName;
                option.textContent = catName;
                categoryFilter.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading categories into filter:', error);
        // Có thể thêm một option lỗi để người dùng biết
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Lỗi tải thể loại';
        option.disabled = true;
        categoryFilter.appendChild(option);
    }
}

// --- HÀM MỚI: Tải danh sách thể loại vào SELECT của modal chỉnh sửa truyện ---
async function loadCategoriesIntoModalFilter() {
    const modalCategorySelect = document.getElementById('modalCategory');
    // Xóa tất cả các option hiện có (để thêm lại từ đầu)
    modalCategorySelect.innerHTML = ''; 

    // Thêm một option rỗng hoặc "Chọn thể loại" làm placeholder
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Chọn thể loại';
    modalCategorySelect.appendChild(defaultOption);

    try {
        const response = await fetch('/admin/api/story-categories'); // API của bạn trả về danh sách thể loại
        if (!response.ok) {
            throw new Error('Failed to fetch categories for modal');
        }
        const categories = await response.json();

        categories.forEach(catName => {
            if (catName) {
                const option = document.createElement('option');
                option.value = catName;
                option.textContent = catName;
                modalCategorySelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading categories into modal filter:', error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Lỗi tải thể loại';
        option.disabled = true;
        modalCategorySelect.appendChild(option);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    fetchStories();
    loadCategoriesIntoFilter(); // Tải danh sách thể loại vào bộ lọc chính khi trang tải

    document.getElementById('story-search-input').addEventListener('keypress', e => { if(e.key==='Enter') searchAndFilterStories(); });
    document.getElementById('story-status-filter').addEventListener('change', searchAndFilterStories);
    document.getElementById('story-category-filter').addEventListener('change', searchAndFilterStories);
    document.getElementById('saveStoryChangesBtn')?.addEventListener('click', saveStoryChanges);
    document.getElementById('deleteStoryBtn')?.addEventListener('click', () => {
        const id = document.getElementById('modalStoryId').value;
        if(id) deleteStory(id);
    });
    window.onclick = e => {
        const storyModal = document.getElementById('storyModal');
        const backdrop = document.getElementById('storyModalBackdrop');
        if (e.target === storyModal || e.target === backdrop) {
            hideModal('storyModal');
        }
    };
});