// 🔍 Hàm tìm kiếm truyện theo từ khóa
async function performSearch(query) {
  if (!query) return;

  try {
    const response = await fetch(`/api/stories/search?title=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error("Không thể kết nối đến server");
    let data = await response.json();

    // 🔹 Lọc chỉ lấy truyện control = 1
    data = data.filter(story => story.control === 1);

    // 🔹 Sắp xếp theo thời gian cập nhật mới nhất (latestChapter > updatedAt > createdAt)
    data.sort((a, b) => {
      const dateA = new Date(a.latestChapter?.updatedAt || a.updatedAt || a.createdAt);
      const dateB = new Date(b.latestChapter?.updatedAt || b.updatedAt || b.createdAt);
      return (dateB.getTime() || 0) - (dateA.getTime() || 0); // mới nhất trước
    });

    await renderSearchResults(data); // await để đảm bảo view được load
  } catch (error) {
    console.error("Search error:", error);
    const container = document.getElementById("searchResults");
    if (container)
      container.innerHTML = `<p class="text-danger text-center mt-4">Đã xảy ra lỗi khi tìm kiếm.</p>`;
  }
}

// 🧩 Hàm render danh sách kết quả với tổng view live
async function renderSearchResults(stories) {
  const container = document.getElementById("searchResults");
  if (!container) return;
  container.innerHTML = "";

  if (!stories || stories.length === 0) {
    container.innerHTML = "<p class='text-center mt-4'>Không tìm thấy truyện nào.</p>";
    return;
  }

  const row = document.createElement("div");
  row.classList.add("row");

  for (const story of stories) {
    const col = document.createElement("div");
    col.className = "col-md-3 col-sm-6 mb-3 storyBox";

    col.innerHTML = `
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

    row.appendChild(col);

    // ✅ VIEW
    fetch(`/api/story/${story._id}/views`)
      .then(r => r.json())
      .then(d => col.querySelector(".story-views").textContent = d.total_views ?? 0);

    // ✅ VOTE
    fetch(`/api/story/${story._id}/votes`)
      .then(r => r.json())
      .then(d => col.querySelector(".story-votes").textContent = d.total_votes ?? 0);

    // ✅ CHAPTER
    fetch(`/api/story/${story._id}/chapters/published`)
      .then(r => r.json())
      .then(d => col.querySelector(".story-chapters").textContent = d.total_chapters ?? 0);
  }

  container.appendChild(row);
}

// 🧠 Bắt sự kiện submit form tìm kiếm (ở mọi trang)
document.querySelectorAll(".search-form").forEach((form) => {
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const searchQuery = this.querySelector("input").value.trim();
    if (!searchQuery) return;
    window.location.href = `/search?query=${encodeURIComponent(searchQuery)}`;
  });
});

// 🚀 Khi trang search_result.html được load, tự động gọi API tìm kiếm
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("query");
  if (query) {
    performSearch(query);
    const input = document.querySelector(".search-form input");
    if (input) input.value = query;
  }
});

// 🧱 Hàm escape HTML (ngăn XSS)
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
