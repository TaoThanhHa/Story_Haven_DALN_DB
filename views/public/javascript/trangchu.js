let currentPage = 1;
let totalPages = 1;
let allStories = []; // lưu tất cả truyện fetch về

// 🧩 Render danh sách truyện ra giao diện
function renderStories(stories) {
  const storyContainer = document.getElementById("storyContainer");
  storyContainer.innerHTML = "";

  if (!stories.length) {
    storyContainer.innerHTML = `<p class="text-muted">Không có truyện nào.</p>`;
    return;
  }

  // 🔹 Sắp xếp theo thời gian cập nhật mới nhất (latestChapter > updatedAt > createdAt)
  stories.sort((a, b) => {
    const dateA = new Date(a.latestChapter?.updatedAt || a.updatedAt || a.createdAt);
    const dateB = new Date(b.latestChapter?.updatedAt || b.updatedAt || b.createdAt);
    return (dateB.getTime() || 0) - (dateA.getTime() || 0); // mới nhất trước
  });

  stories.forEach(story => {
    const storyCard = document.createElement("div");
    storyCard.className = "col-6 col-md-3 mb-3 storyBox";

    storyCard.innerHTML = `
      <a href="/story/${story._id}" class="text-decoration-none text-dark">
        <div class="card h-100 shadow-sm">
          <img src="${story.thumbnail || "../images/default.jpg"}"
               class="card-img-top story-thumbnail"
               alt="${story.title}">
          <div class="card-body">
            <h5 class="card-title text-truncate-2">${story.title}</h5>
            <p class="card-text text-muted small">${story.category || "Chưa phân loại"}</p>
            <p class="card-text text-muted small">
              <i class="fa fa-eye"></i> <span class="story-views" data-id="${story._id}">0</span>
              <i class="fa fa-star"></i> <span class="story-votes">0</span>
              <i class="fa fa-bars"></i> <span class="story-chapters">0</span>
            </p>
          </div>
        </div>
      </a>
    `;

    storyContainer.appendChild(storyCard);

    // Update views
    fetch(`/api/story/${story._id}/views`)
      .then(r => r.json())
      .then(d => storyCard.querySelector(".story-views").textContent = d.total_views ?? 0);

    // Update votes
    fetch(`/api/story/${story._id}/votes`)
      .then(r => r.json())
      .then(d => storyCard.querySelector(".story-votes").textContent = d.total_votes ?? 0);

    // Update chapter counts
    fetch(`/api/story/${story._id}/chapters/published`)
      .then(r => r.json())
      .then(d => storyCard.querySelector(".story-chapters").textContent = d.total_chapters ?? 0);
  });
}

async function fetchStories(page = 1) {
  try {
    const response = await fetch(`/api/stories?page=${page}`);
    const data = await response.json();

    if (response.ok && data.success) {
      // Chỉ lấy stories control = 1 (backend đã filter rồi, nhưng giữ an toàn)
      const filteredStories = data.stories.filter(s => s.visibility === "public");

      // Sort giống my_story: latestChapter > updatedAt > createdAt
      filteredStories.sort((a, b) => {
        const dateA = new Date(a.latestChapter?.updatedAt || a.updatedAt || a.createdAt);
        const dateB = new Date(b.latestChapter?.updatedAt || b.updatedAt || b.createdAt);
        return dateB - dateA;
      });

      renderStories(filteredStories);

      currentPage = data.currentPage;
      totalPages = data.totalPages;

      const pagination = document.querySelector(".pagination-container");
      if (data.total <= 12) pagination.style.display = "none";
      else { pagination.style.display = "flex"; updatePagination(); }
    } else {
      console.error("Lỗi API:", data.error || "Không thể tải truyện");
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// 🧩 Cập nhật phân trang
function updatePagination() {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  // Trang trước
  pagination.innerHTML += `
    <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <button class="page-link" onclick="fetchStories(${currentPage - 1})">«</button>
    </li>
  `;

  let start = currentPage - 1;
  let end   = currentPage + 1;

  if (start < 1) { start = 1; end = 3; }
  if (end > totalPages) { end = totalPages; start = totalPages - 2; }
  if (start < 1) start = 1;

  if (start > 1) {
    pagination.innerHTML += `
      <li class="page-item">
        <button class="page-link" onclick="fetchStories(1)">1</button>
      </li>
    `;
    if (start > 2) pagination.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
  }

  for (let i = start; i <= end; i++) {
    pagination.innerHTML += `
      <li class="page-item ${i === currentPage ? "active" : ""}">
        <button class="page-link" onclick="fetchStories(${i})">${i}</button>
      </li>
    `;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pagination.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    pagination.innerHTML += `
      <li class="page-item">
        <button class="page-link" onclick="fetchStories(${totalPages})">${totalPages}</button>
      </li>
    `;
  }

  // Trang sau
  pagination.innerHTML += `
    <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <button class="page-link" onclick="fetchStories(${currentPage + 1})">»</button>
    </li>
  `;
}

// 🚀 Load khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
  fetchStories();
});
