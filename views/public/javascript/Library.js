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
        <a href="/story/${story._id}" class="text-decoration-none text-dark">
          <img src="${story.thumbnail || "../images/default.jpg"}"
               class="card-img-top story-thumbnail"
               alt="${story.title}">
        </a>

        <div class="card-body">
          <h5 class="card-title text-truncate-2">${escapeHtml(story.title)}</h5>
          <p class="card-text text-muted small">${escapeHtml(story.category) || "Chưa phân loại"}</p>

          <p class="card-text text-muted small">
            <i class="fa fa-eye"></i> 
            <span id="views-${story._id}">...</span>

            <i class="fa fa-star ms-2"></i> 
            <span id="votes-${story._id}">...</span>

            <i class="fa fa-bars ms-2"></i> 
            <span id="chap-${story._id}">...</span>
          </p>

          <a href="/story/${story._id}" class="btn btn-primary w-100 mt-2">Đọc ngay</a>
        </div>
      </div>
    `;

    container.appendChild(col);

    fetch(`/api/story/${story._id}/views`)
      .then(r => r.json())
      .then(d => {
        document.getElementById(`views-${story._id}`).textContent =
          d?.total_views ?? 0;
      })
      .catch(() => {
        document.getElementById(`views-${story._id}`).textContent = 0;
      });

    fetch(`/api/story/${story._id}/votes`)
      .then(r => r.json())
      .then(d => {
        document.getElementById(`votes-${story._id}`).textContent =
          d?.total_votes ?? 0;
      })
      .catch(() => {
        document.getElementById(`votes-${story._id}`).textContent = 0;
      });

    fetch(`/api/story/${story._id}/chapters/published`)
      .then(r => r.json())
      .then(d => {
        document.getElementById(`chap-${story._id}`).textContent =
          d?.total_chapters ?? 0;
      })
      .catch(() => {
        document.getElementById(`chap-${story._id}`).textContent = 0;
      });
  });
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
