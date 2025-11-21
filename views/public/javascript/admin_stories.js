let currentPage = 1;
let currentSearch = "";
let currentVisibility = "";
let currentCategories = [];

// Tải danh sách thể loại từ backend
async function loadCategories() {
    const select = document.getElementById("story-category-filter");
    select.innerHTML = '<option value="">Tất cả thể loại</option>';

    try {
        const res = await fetch("/admin/api/stories/categories");
        const categories = await res.json();

        categories.forEach(c => {
            const option = document.createElement("option");
            option.value = c;
            option.textContent = c;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Không tải được danh sách thể loại", err);

        const fallback = [
            "Bách hợp","Cổ đại","Cung đấu","Đam mỹ","Dị giới","Đô thị","Hài hước",
            "Hệ thống","Hiện đại","Khoa học viễn tưởng","Kinh dị","Lịch sử","Linh dị",
            "Mạt thế","Ngôn tình","Ngược luyến","Phiêu lưu","Quân sự","Sủng ngọt",
            "Tâm lý","Tiên hiệp","Trinh thám","Trọng sinh","Xuyên không"
        ];
        fallback.forEach(c => {
            const option = document.createElement("option");
            option.value = c;
            option.textContent = c;
            select.appendChild(option);
        });
    }
}

// Lấy danh sách truyện theo tìm kiếm + lọc
async function fetchStories(page = 1, search = "", visibility = "", categories = []) {
    const tbody = document.getElementById("story-table-body");
    tbody.innerHTML = `<tr><td colspan="10">Đang tải...</td></tr>`;

    const query = new URLSearchParams();
    query.append("page", page);
    query.append("search", search);
    if (visibility) query.append("visibility", visibility);
    if (categories.length) query.append("category", categories.join(","));

    try {
        const res = await fetch(`/admin/api/stories?${query.toString()}`);
        const data = await res.json();

        tbody.innerHTML = "";
        if (!data.stories.length) {
            tbody.innerHTML = `<tr><td colspan="10">Không tìm thấy truyện</td></tr>`;
            renderPagination(1, page);
            return;
        }

        data.stories.forEach(story => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${story._id}</td>
                <td><img src="${story.thumbnail}" style="width:50px;height:70px;object-fit:cover"></td>
                <td>${story.title}</td>
                <td>${story.authorUsername}</td>
                <td>${story.category || 'Không có'}</td>
                <td>${story.status}</td>
                <td>${story.visibility === 'public' ? 'Công khai' : 'Ẩn truyện'}</td>
                <td>${story.chapterCount || 0}</td>
                <td>${new Date(story.createdAt).toLocaleDateString()}</td>
                <td><button class="btn btn-sm btn-info" onclick="openStoryModal('${story._id}')">Chi tiết</button></td>
            `;
            tbody.appendChild(tr);
        });

        renderPagination(Math.ceil(data.total / 10), page);
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="10">Lỗi tải dữ liệu</td></tr>`;
    }
}

// Tìm kiếm + lọc nâng cao
function searchAndFilterStories() {
    const keyword = document.getElementById("story-search-input").value;
    const visibility = document.getElementById("story-visibility-filter").value;
    const category = document.getElementById("story-category-filter").value;

    const categories = category ? [category] : [];

    currentSearch = keyword;
    currentVisibility = visibility;
    currentCategories = categories;

    fetchStories(1, keyword, visibility, categories);
}

// Init khi load trang
document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    fetchStories();

    document.getElementById('story-search-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') searchAndFilterStories();
    });

    document.getElementById('story-visibility-filter').addEventListener('change', searchAndFilterStories);
    document.getElementById('story-category-filter').addEventListener('change', searchAndFilterStories);
});

// Phân trang
function renderPagination(totalPages, current) {
    const container = document.getElementById("story-pagination");
    container.innerHTML = "";
    for(let i=1;i<=totalPages;i++){
        const btn = document.createElement("button");
        btn.className = `btn btn-sm ${i===current?'btn-primary':'btn-light'} mx-1`;
        btn.textContent = i;
        btn.onclick = ()=>fetchStories(i,currentSearch,currentVisibility,currentCategories);
        container.appendChild(btn);
    }
}

// Modal
async function openStoryModal(id){
    resetModal();
    showModal("storyModal");
    try{
        const res = await fetch(`/admin/api/stories/${id}`);
        const story = await res.json();

        document.getElementById('modalStoryId').value = story._id;
        document.getElementById('modalStoryTitle').value = story.title;
        document.getElementById('modalAuthorUsername').value = story.authorUsername;
        document.getElementById('modalDescription').value = story.description;
        document.getElementById('modalThumbnail').value = story.thumbnail;
        document.getElementById('modalThumbnailImg').src = story.thumbnail;
        document.getElementById('modalCategory').value = story.category;
        document.getElementById('modalStatus').value = story.status;
        document.getElementById('modalVisibility').value = story.visibility;
        document.getElementById('modalCreatedAt').value = new Date(story.createdAt).toLocaleDateString();

        const tbody = document.getElementById("modalChaptersList");
        tbody.innerHTML = "";
        if(story.chapters.length){
            story.chapters.forEach(c=>{
                const tr = document.createElement("tr");
                tr.innerHTML = `<td>${c.chapterNumber}</td><td>${c.title}</td><td>${new Date(c.createdAt).toLocaleDateString()}</td>`;
                tbody.appendChild(tr);
            });
        }else{
            tbody.innerHTML=`<tr><td colspan="3">Chưa có chương nào</td></tr>`;
        }

    }catch(err){
        alert("Không tải được chi tiết truyện");
        hideModal("storyModal");
    }
}

// Lưu visibility
async function saveStoryChanges(){
    const id = document.getElementById('modalStoryId').value;
    const visibility = document.getElementById('modalVisibility').value;
    try{
        const res = await fetch(`/admin/api/stories/${id}`,{
            method:'PUT',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({visibility})
        });
        const data = await res.json();
        alert(data.message || "Cập nhật thành công");
        hideModal("storyModal");
        fetchStories(currentPage,currentSearch,currentVisibility,currentCategories);
    }catch(err){
        alert("Lỗi cập nhật: "+err.message);
    }
}

// Xóa truyện
async function deleteStory() {
  const storyId = document.getElementById('modalStoryId').value;
  if (!storyId) return alert("ID truyện không hợp lệ");
  if (!confirm("Bạn chắc chắn muốn xóa truyện này?")) return;

  try {
    const res = await fetch(`/admin/api/stories/${storyId}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) return alert(data.error || "Xóa story thất bại");

    alert(data.message || "Đã xóa truyện thành công");
    hideModal('storyModal');
    fetchStories(currentPage, currentSearch, currentVisibility, currentCategories);
  } catch (err) {
    console.error(err);
    alert("Lỗi khi xóa truyện: " + err.message);
  }
}

// Modal helpers
function showModal(id){
    const modal = document.getElementById(id);
    modal.style.display="block";
    modal.classList.add("show");
    if(!document.getElementById("storyModalBackdrop")){
        const backdrop=document.createElement("div");
        backdrop.id="storyModalBackdrop";
        backdrop.className="modal-backdrop fade show";
        document.body.appendChild(backdrop);
    }
}

function hideModal(id){
    const modal = document.getElementById(id);
    modal.style.display="none";
    modal.classList.remove("show");
    const backdrop=document.getElementById("storyModalBackdrop");
    if(backdrop) backdrop.remove();
}

function resetModal(){
    document.getElementById("modalStoryId").value="";
    document.getElementById("modalStoryTitle").value="";
    document.getElementById("modalAuthorUsername").value="";
    document.getElementById("modalDescription").value="";
    document.getElementById("modalThumbnail").value="";
    document.getElementById("modalThumbnailImg").src="";
    document.getElementById("modalCategory").value="";
    document.getElementById("modalStatus").value="";
    document.getElementById("modalVisibility").value="";
    document.getElementById("modalCreatedAt").value="";
    document.getElementById("modalChaptersList").innerHTML="";
}

// Init
document.addEventListener("DOMContentLoaded",()=>{
    loadCategories();
    fetchStories();
    document.getElementById('saveStoryChangesBtn').addEventListener('click',saveStoryChanges);
    document.getElementById('deleteStoryBtn').addEventListener('click',deleteStory);

    document.getElementById('story-search-input').addEventListener('keypress',e=>{
        if(e.key==='Enter') searchAndFilterStories();
    });

    document.getElementById('story-visibility-filter').addEventListener('change',searchAndFilterStories);
});