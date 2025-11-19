// ===================== GLOBAL =====================
let allChapters = [];
let currentPage = 1;
const itemsPerPage = 10;
let continueChapterId = null;

// ===================== LẤY STORY ID TỪ URL =====================
function getStoryIdFromURL() {
    const match = window.location.pathname.match(/\/story\/([^\/]+)/);
    return match ? match[1] : null;
}

// ===================== DOMCONTENTLOADED =====================
document.addEventListener("DOMContentLoaded", async function () {
    const storyId = getStoryIdFromURL();
    if (!storyId) return;

    // song song lấy cả story + tiến độ đọc
    await Promise.all([
        fetchStoryData(storyId),
        fetchContinueChapter(storyId)
    ]);

    // cập nhật nút đọc
    updateReadButton(storyId);

    // Kiểm tra trạng thái follow ngay khi load
    await checkFollowStatus(storyId);

    const followBtn = document.getElementById("followBtn");
    if (followBtn) followBtn.addEventListener("click", () => toggleFollow(storyId));

    await fetchTotalFollow(storyId);
    await fetchRecommendStories(storyId);
});
// ===================== FETCH STORY DATA =====================
async function fetchStoryData(storyId) {
    try {
        const res = await fetch(`/api/story/${storyId}`);
        if (!res.ok) throw new Error("Không thể tải dữ liệu truyện");
        const data = await res.json();

        fillStoryData(data.story, data.chapters || []);
    } catch (err) {
        console.error("Lỗi khi lấy dữ liệu:", err);
        alert("Không thể tải thông tin truyện. Vui lòng thử lại sau!");
    }
}

// ===================== FILL STORY DATA =====================
function fillStoryData(story, chapters) {
    document.querySelector(".story-name").textContent = story.title;

    const authorName = story.userId?.username || "Không rõ";
    const authorId = story.userId?._id || "";
    document.querySelector(".story-infor ul").innerHTML = `
        <li>Tác giả: ${authorId ? `<a href="/account/${authorId}">${authorName}</a>` : authorName}</li>
        <li>Thể loại: ${story.category || "Chưa phân loại"}</li>
    `;

    document.querySelector(".story-description").textContent = story.description || "";

    const thumbnail = story.thumbnail || "/images/default.jpg";
    document.querySelector(".cover-photo img").src = thumbnail;
    document.querySelector(".story").style.backgroundImage = `url('${thumbnail}')`;

    const votesEl = document.getElementById("votes");
    if (votesEl) votesEl.textContent = story.votes || 0;

    // Chỉ lấy chapter đã đăng (control === 1)
    const publishedChapters = chapters.filter(ch => ch.control === 1);
    publishedChapters.sort((a, b) => a.chapter_number - b.chapter_number);
    allChapters = publishedChapters;

    renderChapters();
    renderPagination();

    // --- Lấy tổng view + vote ---
    fetchTotalStoryViews(story._id);
    fetchTotalStoryVotes(story._id);
}

// ===================== RENDER CHAPTER LIST =====================
function renderChapters() {
    const container = document.getElementById("chapterList");
    container.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const visibleChapters = allChapters.slice(start, start + itemsPerPage);

    if (visibleChapters.length === 0) {
        container.innerHTML = `<p class="text-muted text-center">Chưa có chương nào được đăng tải.</p>`;
        return;
    }

    visibleChapters.forEach(chap => {
        const a = document.createElement("a");
        a.href = `/story/${chap.storyId}/chapter/${chap._id}`;
        a.classList.add("list-group-item", "list-group-item-action", "episode");

        const createdAt = new Date(chap.createdAt || chap.updatedAt);
        const formattedDate = isNaN(createdAt) ? "Không rõ" :
            `${createdAt.getDate()}/${createdAt.getMonth() + 1}/${createdAt.getFullYear()}`;

        a.innerHTML = `
            <span class="episode-item-num">${chap.chapter_number}</span>
            <span class="episode-item-title">${chap.title}</span>
            <span class="episode-item-date text-muted small">(${formattedDate})</span>
        `;
        container.appendChild(a);
    });
}

// ===================== PAGINATION =====================
function renderPagination() {
    const pagination = document.getElementById("chapterPagination");
    pagination.innerHTML = "";

    const totalPages = Math.ceil(allChapters.length / itemsPerPage);
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement("li");
        li.classList.add("page-item");
        if (i === currentPage) li.classList.add("active");

        const link = document.createElement("a");
        link.classList.add("page-link");
        link.href = "#";
        link.textContent = i;
        link.addEventListener("click", e => {
            e.preventDefault();
            currentPage = i;
            renderChapters();
            renderPagination();
        });

        li.appendChild(link);
        pagination.appendChild(li);
    }
}

// ===================== FOLLOW STATUS =====================
async function checkFollowStatus(storyId) {
    try {
        const res = await fetch(`/api/story/follow-status/${storyId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const btn = document.getElementById("followBtn");
        if (!btn) return;

        if (data.followed) {
            btn.classList.add("btn-danger");
            btn.innerHTML = '<i class="fas fa-heart"></i> Đang theo dõi';
        } else {
            btn.classList.remove("btn-danger");
            btn.innerHTML = '<i class="fas fa-heart"></i> Theo dõi';
        }
    } catch (err) {
        console.warn("Không thể kiểm tra trạng thái follow:", err);
    }
}

async function toggleFollow(storyId) {
    try {
        const res = await fetch(`/api/story/follow`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ storyId })
        });
        if (res.status === 401) {
            alert("⚠️ Vui lòng đăng nhập để theo dõi truyện.");
            window.location.href = "/login";
            return;
        }

        const data = await res.json();
        const btn = document.getElementById("followBtn");
        if (!btn) return;

        if (data.followed) {
            btn.classList.add("btn-danger");
            btn.innerHTML = '<i class="fas fa-heart"></i> Đang theo dõi';
        } else {
            btn.classList.remove("btn-danger");
            btn.innerHTML = '<i class="fas fa-heart"></i> Theo dõi';
        }
    } catch (err) {
        console.error("Lỗi khi toggle follow:", err);
    }
}

// ===================== TOTAL STORY VIEWS / VOTES =====================
async function fetchTotalStoryViews(storyId) {
    try {
        const res = await fetch(`/api/story/${storyId}/views`);
        if (!res.ok) throw new Error("Không thể tải tổng view");
        const data = await res.json();
        const viewsEl = document.getElementById("views");
        if (viewsEl && data.total_views !== undefined) {
            viewsEl.textContent = data.total_views;
        }
    } catch (err) {
        console.error("Lỗi khi lấy tổng view:", err);
    }
}

async function fetchTotalStoryVotes(storyId) {
    try {
        const res = await fetch(`/api/story/${storyId}/votes`);
        if (!res.ok) throw new Error("Không thể tải tổng vote");
        const data = await res.json();
        const likesEl = document.getElementById("votes");
        if (likesEl && data.total_votes !== undefined) {
            likesEl.textContent = data.total_votes;
        }
    } catch (err) {
        console.error("Lỗi khi lấy tổng vote:", err);
    }
}

// ===================== FOLLOW TOTAL =====================
async function fetchTotalFollow(storyId) {
    try {
        const res = await fetch(`/api/story/${storyId}/followers`);
        const data = await res.json();
        document.getElementById("totalFollow").textContent = data.total_follow ?? 0;
    } catch (err) {
        console.error("Lỗi follow:", err);
    }
}

// ===================== RECOMMEND STORIES =====================
async function fetchRecommendStories(storyId) {
    try {
        const res = await fetch(`/api/story/${storyId}/recommend`);
        const stories = await res.json();
        const container = document.getElementById("recommendContainer");

        container.innerHTML = stories.length
            ? ""
            : `<p class="text-muted">Không có truyện phù hợp</p>`;

        stories.forEach(story => {
            container.innerHTML += `
            <div class="col-6 col-md-3 mb-3 storyBox">
              <a href="/story/${story._id}" class="text-decoration-none text-dark">
                <div class="card h-100 shadow-sm">
                  <img src="${story.thumbnail || "../images/default.jpg"}"
                       class="card-img-top story-thumbnail">
                  <div class="card-body">
                    <h5 class="card-title text-truncate-2">${story.title}</h5>
                    <p class="card-text text-muted small">${story.category}</p>
                  </div>
                </div>
              </a>
            </div>`;
        });
    } catch (err) {
        console.error("Lỗi gợi ý:", err);
    }
}

// ===================== READING PROGRESS =====================
async function fetchContinueChapter(storyId) {
    try {
        const res = await fetch(`/api/reading/${storyId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        continueChapterId = data.chapterId || null;
    } catch (err) {
        console.warn("Không thể lấy tiến độ đọc:", err);
    }
}

async function saveReadingProgress(storyId, chapterId) {
    try {
        await fetch(`/api/reading/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ storyId, chapterId })
        });
    } catch (err) {
        console.error("Không thể lưu tiến độ đọc:", err);
    }
}

// ===================== UPDATE READ BUTTON =====================
function updateReadButton(storyId) {
    const btnRead = document.querySelector(".btn-read");
    if (!btnRead) return;

    if (continueChapterId) {
        btnRead.textContent = "Đọc tiếp";
        btnRead.href = `/story/${storyId}/chapter/${continueChapterId}`;
    } else if (allChapters.length > 0) {
        btnRead.textContent = "Đọc từ chương 1";
        btnRead.href = `/story/${storyId}/chapter/${allChapters[0]._id}`;
    } else {
        btnRead.textContent = "Chưa có chương nào";
        btnRead.classList.add("disabled");
        btnRead.href = "#";
    }
}
