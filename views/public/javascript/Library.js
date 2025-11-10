document.addEventListener("DOMContentLoaded", async function () {
  const container = document.getElementById("storiesContainer");
  container.innerHTML = `<p class="text-center text-muted">Đang tải truyện...</p>`;

  try {
    const response = await fetch("/api/library", { credentials: "include" });
    if (response.status === 401) {
      container.innerHTML = `<p class="text-center text-danger">⚠️ Bạn cần đăng nhập để xem thư viện.</p>`;
      return;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<p class="text-center text-muted">Bạn chưa theo dõi truyện nào.</p>`;
      return;
    }

    renderStories(data);
  } catch (err) {
    console.error("❌ Lỗi khi tải thư viện:", err);
    container.innerHTML = `<p class="text-center text-danger">Không thể tải danh sách truyện.</p>`;
  }
});

function renderStories(stories) {
  const container = document.getElementById("storiesContainer");
  container.innerHTML = "";

  stories.forEach(story => {
    const col = document.createElement("div");
    col.className = "col-md-3 col-sm-6 mb-3";

    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img src="${story.thumbnail || '/images/default.jpg'}"
             class="card-img-top"
             alt="${escapeHtml(story.title)}">
        <div class="card-body">
          <h5 class="card-title text-truncate-2">${escapeHtml(story.title)}</h5>
          <p class="text-muted small">${story.category || 'Không rõ thể loại'}</p>
          <a href="/story/${story._id}" class="btn btn-primary w-100 mt-2">Đọc ngay</a>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
