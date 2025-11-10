// ===================== GLOBAL =====================
let allChapters = [];
let currentPage = 1;
const itemsPerPage = 10;

// ===================== DOMCONTENTLOADED =====================
document.addEventListener("DOMContentLoaded", async function () {
    const pathSegments = window.location.pathname.split("/");
    const storyId = pathSegments[pathSegments.length - 1];
    if (!storyId) return;

    // --- Lấy dữ liệu truyện và danh sách chapter ---
    await fetchStoryData(storyId);

    // --- Kiểm tra trạng thái theo dõi ---
    await checkFollowStatus(storyId);

    // --- Xử lý nút theo dõi ---
    const followBtn = document.getElementById("followBtn");
    if (followBtn) {
        followBtn.addEventListener("click", () => toggleFollow(storyId));
    }
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
async function fillStoryData(story, chapters) {
    document.querySelector(".story-name").textContent = story.title;
    document.querySelector(".story-infor ul").innerHTML = `
        <li>Tác giả: ${story.username || (story.userId && story.userId.username) || "Không rõ"}</li>
        <li>Thể loại: ${story.category || "Chưa phân loại"}</li>
    `;

    document.querySelector(".story-description").textContent = story.description || "";

    const thumbnail = story.thumbnail || "/images/default.jpg";
    document.querySelector(".cover-photo img").src = thumbnail;
    document.querySelector(".story").style.backgroundImage = `url('${thumbnail}')`;

    // Likes vẫn lấy từ story
    const votesEl = document.getElementById("votes");
    if (votesEl) votesEl.textContent = story.votes || 0;

    // Chỉ lấy chapter đã đăng (control === 1)
    const publishedChapters = chapters.filter(ch => ch.control === 1);
    publishedChapters.sort((a, b) => a.chapter_number - b.chapter_number);
    allChapters = publishedChapters;

    renderChapters();
    renderPagination();

    if (publishedChapters.length > 0) {
        document.querySelector(".btn-read").href = `/story/${story._id}/chapter/${publishedChapters[0]._id}`;
    } else {
        const btnRead = document.querySelector(".btn-read");
        btnRead.classList.add("disabled");
        btnRead.textContent = "Chưa có chương nào";
    }

    // --- Lấy tổng view tất cả chapter từ API (update live) ---
    await fetchTotalStoryViews(story._id);
    await fetchTotalStoryVotes(story._id);

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
        a.innerHTML = `
            <span class="episode-item-num">${chap.chapter_number}</span>
            <span class="episode-item-title">${chap.title}</span>
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

// ===================== TOTAL STORY VIEWS =====================
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

