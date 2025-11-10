// 🧩 Render danh sách truyện theo category với tổng view live
document.addEventListener("DOMContentLoaded", async () => {
  const resultsContainer = document.getElementById("storyResults");
  const titleElem = document.getElementById("categoryTitle");
  const noResults = document.getElementById("noResults");
  if (!resultsContainer) return;

  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");

  if (!category) {
    titleElem.textContent = "Không có thể loại được chọn";
    resultsContainer.innerHTML = `<p class="text-center text-muted">Vui lòng chọn một thể loại.</p>`;
    return;
  }

  titleElem.textContent = `Thể loại: ${decodeURIComponent(category)}`;

  try {
    const res = await fetch(`/api/stories/category?category=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error("Lỗi kết nối API");
    const stories = await res.json();

    resultsContainer.innerHTML = "";

    if (!Array.isArray(stories) || stories.length === 0) {
      noResults.style.display = "block";
      return;
    }

    noResults.style.display = "none";

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

      resultsContainer.appendChild(col);
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
  } catch (err) {
    console.error("Lỗi khi tải thể loại:", err);
    resultsContainer.innerHTML = `<p class="text-danger text-center mt-4">
      Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.
    </p>`;
  }
});
