let allStories = [];

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/api/storiesbyuser", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    allStories = await response.json();
    await renderStories(allStories); // await để load view live

    // Gắn sự kiện tìm kiếm
    const searchInput = document.getElementById("searchMyStory");
    if (searchInput) {
      searchInput.addEventListener("input", async function () {
        const keyword = this.value.toLowerCase();
        const filteredStories = allStories.filter(story =>
          story.title?.toLowerCase().includes(keyword)
        );
        await renderStories(filteredStories);
      });
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách truyện:", error);
    alert("Không thể tải danh sách truyện của bạn.");
  }
});

async function renderStories(stories) {
  const container = document.getElementById("storyContainer");
  container.innerHTML = "";

  if (!stories.length) {
    container.innerHTML = `<p class="text-muted">Không có truyện nào.</p>`;
    return;
  }

  for (const story of stories) {
    const row = document.createElement("div");
    row.className = "row g-0 mb-3 p-2 border-bottom rounded";

    row.innerHTML = `
      <div class="col-md-3 d-flex justify-content-center">
        <img src="${story.thumbnail || '/images/default.jpg'}" class="img-fluid rounded" alt="Story Cover">
      </div>
      <div class="col-md-7">
        <div class="story-details">
          <h5 class="story-title">${story.title || "Không có tiêu đề"}</h5>
          <p class="story-meta">Cập nhật: ${formatTime(story.created_at)}</p>
          <p class="story-meta">
            <i class="fas fa-eye"></i> <span class="story-views">0</span> -
            <i class="fas fa-star"></i> <span class="story-votes">0</span> -
            <i class="fa fa-bars"></i> <span class="story-chapters">0</span>
          </p>
        </div>
      </div>
      <div class="col-md-2 d-flex flex-column justify-content-around align-items-center">
        <a href="/story/edit?id=${story._id}" class="btn btn-primary btn-sm mb-1 w-100">
          <i class="fas fa-edit"></i> Sửa
        </a>
        <button class="btn btn-danger btn-sm w-100" onclick="deleteStory('${story._id}')">
          <i class="fas fa-trash"></i> Xóa
        </button>
      </div>
    `;

    container.appendChild(row);

    // ✅ Update VIEW
    fetch(`/api/story/${story._id}/views`)
      .then(r => r.json())
      .then(d => row.querySelector(".story-views").textContent = d.total_views ?? 0)
      .catch(() => {});

    // ✅ Update VOTE
    fetch(`/api/story/${story._id}/votes`)
      .then(r => r.json())
      .then(d => row.querySelector(".story-votes").textContent = d.total_votes ?? 0)
      .catch(() => {});

    // ✅ Lấy tổng chương (đăng + bản thảo)
    fetch(`/api/story/${story._id}/chapters/count`)
      .then(r => r.json())
      .then(d => {
        row.querySelector(".story-chapters").textContent =
          `Đã đăng: ${d.published} | Nháp: ${d.draft}`;
  });

  }
}

function formatTime(updatedAt) {
  const timeDiff = Math.floor((new Date() - new Date(updatedAt)) / (1000 * 60 * 60));
  return timeDiff < 24 ? `${timeDiff} giờ trước` : `${Math.floor(timeDiff / 24)} ngày trước`;
}

async function deleteStory(storyId) {
  if (!confirm("Bạn có chắc muốn xóa truyện này?")) return;

  try {
    const response = await fetch(`/api/story/${storyId}`, { method: "DELETE", credentials: "include" });
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Có lỗi xảy ra khi xóa truyện");
    alert("Đã xóa truyện thành công!");

    allStories = allStories.filter(story => story._id !== storyId);
    await renderStories(allStories);
  } catch (error) {
    console.error("Lỗi khi xóa truyện:", error);
    alert(error.message || "Không thể xóa truyện.");
  }
}

