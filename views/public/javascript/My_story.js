let allStories = [];
let currentTab = "draft"; 

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/storiesbyuser", { method: "GET", credentials: "include" });
    allStories = await res.json();

    setActiveTab();
    renderStoriesByTab();

    document.getElementById("tab-draft").onclick = () => {
      currentTab = "draft";
      setActiveTab();
      renderStoriesByTab();
    };

    document.getElementById("tab-published").onclick = () => {
      currentTab = "published";
      setActiveTab();
      renderStoriesByTab();
    };

    document.getElementById("searchMyStory").addEventListener("input", function () {
      renderStoriesByTab(this.value);
    });

  } catch (err) {
    console.error(err);
    alert("Không thể tải danh sách truyện.");
  }
});

function setActiveTab() {
  document.querySelectorAll(".word").forEach(tab => tab.classList.remove("selected"));
  if (currentTab === "draft") 
    document.getElementById("tab-draft").classList.add("selected");
  else 
    document.getElementById("tab-published").classList.add("selected");
}

function renderStoriesByTab(keyword = "") {
  keyword = keyword.toLowerCase();

  const filtered = allStories
    .filter(story => {
      const matchSearch = story.title.toLowerCase().includes(keyword);
      const matchTab =
        (currentTab === "draft" && story.control === 0) ||
        (currentTab === "published" && story.control === 1);
      return matchSearch && matchTab;
    })
    .sort((a, b) => {
      const dateA = new Date(a.latestChapter?.updatedAt || a.updatedAt || a.createdAt);
      const dateB = new Date(b.latestChapter?.updatedAt || b.updatedAt || b.createdAt);
      return (dateB.getTime() || 0) - (dateA.getTime() || 0);
    });

  renderStories(filtered);
}

function formatTime(date) {
  const d = new Date(date);
  if (isNaN(d)) return "Không xác định";

  const diffH = Math.floor((Date.now() - d.getTime()) / 3600000);
  return diffH < 24 ? `${diffH} giờ trước` : `${Math.floor(diffH / 24)} ngày trước`;
}

async function renderStories(stories) {
  const container = document.getElementById("storyContainer");
  container.innerHTML = "";

  if (!stories.length) {
    container.innerHTML = `<p class="text-muted">Không có truyện nào.</p>`;
    return;
  }

  stories.forEach(story => {
    const lastUpdate = story.latestChapter?.updatedAt || story.updatedAt || story.createdAt;

    const div = document.createElement("div");
    div.className = "story-row";

    div.innerHTML = `
      <img src="${story.thumbnail || '/images/default.jpg'}">
      <div class="flex-grow-1">
        <h5 class="story-title">
          ${story.title}
          ${story.control === 1 && story.status === "completed"
            ? `<span class="badge bg-success ms-2">Đã hoàn thành</span>`
            : ""}
        </h5>

        <p class="story-meta">Cập nhật: ${lastUpdate ? formatTime(lastUpdate) : "Chưa cập nhật"}</p>

        <p class="story-meta">
          <i class="fas fa-eye"></i> <span class="story-views">...</span> -
          <i class="fas fa-star"></i> <span class="story-votes">...</span> -
          <i class="fa fa-bars"></i> <span class="story-chapters">...</span>
        </p>
      </div>

      <div class="d-flex flex-column justify-content-around">
        <a href="/story/edit?id=${story._id}" class="btn btn-primary btn-sm mb-2">Sửa</a>
        <button class="btn btn-danger btn-sm" onclick="deleteStory('${story._id}')">Xóa</button>
      </div>
    `;
    container.appendChild(div);

    fetch(`/api/story/${story._id}/views`)
      .then(r => r.json())
      .then(d => div.querySelector(".story-views").textContent = d.total_views ?? 0);

    fetch(`/api/story/${story._id}/votes`)
      .then(r => r.json())
      .then(d => div.querySelector(".story-votes").textContent = d.total_votes ?? 0);

    fetch(`/api/story/${story._id}/chapters/count`)
      .then(r => r.json())
      .then(d => {
        div.querySelector(".story-chapters").textContent =
          `Đã đăng: ${d.published} | Nháp: ${d.draft}`;
      });
  });
}

async function deleteStory(id) {
  if (!confirm("Xóa truyện này?")) return;

  try {
    const res = await fetch(`/api/story/${id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw data.error;

    allStories = allStories.filter(s => s._id !== id);
    renderStoriesByTab();
    alert("Đã xóa truyện!");
  } catch (err) {
    alert("Không thể xóa truyện.");
  }
}
