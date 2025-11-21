const menuToggle = document.querySelector(".fa");
const menuContainer = document.querySelector(".menu");
if (menuToggle && menuContainer) {
  menuToggle.addEventListener("click", () => {
    menuContainer.classList.toggle("open");
  });
}
let CHAPTERCURRENT = null;
let STORYID = null;
let BACKCHAPTER = null;
let NEXTCHAPTER = null;

document.addEventListener("DOMContentLoaded", async function () {
  await initializeChapterPage();
});

// Hàm khởi tạo trang chương, để tái sử dụng khi chuyển chương
async function initializeChapterPage() {
  const pathSegments = window.location.pathname.split("/");
  if (pathSegments.length >= 5) {
    STORYID = pathSegments[2];
    CHAPTERCURRENT = pathSegments[4];

    await fetchStoryChapterData(STORYID, CHAPTERCURRENT);
    checkUserVote(CHAPTERCURRENT); 
    updateTotalStoryViews(STORYID);
    updateChapterView(CHAPTERCURRENT);
  }
}


// === NAVIGATION CHAPTER ===
function backChapter() {
  if (!BACKCHAPTER) {
    alert("Đây là chương đầu tiên!");
    return;
  }
  window.location.href = `/story/${STORYID}/chapter/${BACKCHAPTER}`;
}

function nextChapter() {
  if (!NEXTCHAPTER) {
    alert("Đây là chương cuối cùng!");
    return;
  }
  window.location.href = `/story/${STORYID}/chapter/${NEXTCHAPTER}`;
}

// === FETCH STORY & CHAPTER DATA ===
async function fetchStoryChapterData(storyId, chapterId) {
  try {
    const chapterRes = await fetch(`/api/chapter/${chapterId}`);
    const chapter = await chapterRes.json();
    if (chapter.error) {
      alert("Không tìm thấy chương!");
      return;
    }
    fillContentChapter(chapter);

    const storyRes = await fetch(`/api/story/${storyId}`);
    const data = await storyRes.json();
    if (!data || data.error) {
      alert("Không tìm thấy truyện!");
      return;
    }

    const publishedChapters = (data.chapters || []).filter(ch => ch.control === 1);
    fillStoryChapterData(data.story, publishedChapters);
    setBackNextChapter(publishedChapters);
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu:", err);
  }
}

function setBackNextChapter(chapters) {
  chapters.forEach((chapter, index) => {
    if (chapter._id === CHAPTERCURRENT) {
      BACKCHAPTER = chapters[index - 1]?._id || null;
      NEXTCHAPTER = chapters[index + 1]?._id || null;
    }
  });
}

function fillContentChapter(chapter) {
  const chapterTitle = document.querySelector(".tieu-de");
  if (chapterTitle) chapterTitle.textContent = chapter.title;

  const contentContainer = document.querySelector(".noi-dung");
  if (contentContainer) {
    contentContainer.innerHTML = "";
    const paragraphs = (chapter.content || "").split("\n").filter(p => p.trim() !== "");
    paragraphs.forEach(p => {
      const div = document.createElement("div");
      div.textContent = p;
      contentContainer.appendChild(div);
    });
  }
}

function fillStoryChapterData(story, chapters) {
  document.title = story.title;

  const storyName = document.querySelector(".story-name a");
  if (storyName) {
    storyName.textContent = story.title;
    storyName.href = `/story/${story._id}`;
  }

  const chapterBox = document.querySelector(".box-chap");
  if (chapterBox) {
    chapterBox.innerHTML = "";
    chapters.forEach(chap => {
      const a = document.createElement("a");
      a.href = `/story/${story._id}/chapter/${chap._id}`;
      a.textContent = `${chap.title}`;
      a.classList.add("chapter-link");
      a.style.display = "block";
      a.style.padding = "8px";
      a.style.borderRadius = "5px";
      a.style.margin = "4px 0";
      a.style.textDecoration = "none";
      a.style.fontWeight = "bold";
      a.style.transition = "0.3s";

      if (chap._id === CHAPTERCURRENT) {
        a.style.background = "#333";
        a.style.color = "#fff";
      } else {
        a.style.background = "#f5f5f5";
        a.style.color = "#333";
        a.addEventListener("mouseenter", () => {
          a.style.background = "#333";
          a.style.color = "#fff";
        });
        a.addEventListener("mouseleave", () => {
          a.style.background = "#f5f5f5";
          a.style.color = "#333";
        });
      }

      chapterBox.appendChild(a);
    });
  }
}

// === VIEW LOGIC ===
async function updateChapterView(chapterId) {
  try {
    const res = await fetch("/api/chapter/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
    });
    const data = await res.json();
    const viewCountEl = document.getElementById("viewCount");
    if (viewCountEl && data.views !== undefined) viewCountEl.textContent = data.views;
  } catch (err) {
    console.error("Không thể cập nhật lượt xem:", err);
  }
}

async function updateTotalStoryViews(storyId) {
  try {
    const res = await fetch(`/api/story/${storyId}/views`);
    if (!res.ok) throw new Error("Không thể tải tổng view");
    const data = await res.json();
    const viewsEl = document.getElementById("views");
    if (viewsEl && data.total_views !== undefined) viewsEl.textContent = data.total_views;
  } catch (err) {
    console.error("Lỗi khi lấy tổng view:", err);
  }
}

// === VOTE LOGIC ===
const VoteBtn = document.getElementById("Vote");

if (VoteBtn) {
  VoteBtn.addEventListener("click", async () => {
    if (!CHAPTERCURRENT) {
      console.warn("Không có CHAPTERCURRENT để vote.");
      return;
    }

    try {
      const res = await fetch("/api/chapter/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chapterId: CHAPTERCURRENT }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.voted) {
        VoteBtn.classList.add("clicked");
      } else {
        VoteBtn.classList.remove("clicked");
      }

      updateChapterVoteCount(CHAPTERCURRENT);
    } catch (err) {
      console.error("Lỗi khi vote:", err);
    }
  });
}

// Kiểm tra trạng thái vote khi load trang và khi chuyển chương
async function checkUserVote(chapterId) {
  try {
    const res = await fetch(`/api/chapter/${chapterId}/votes/user`);
    const data = await res.json();

    const currentVoteBtn = document.getElementById("Vote"); 
    if (currentVoteBtn) {
      if (data.voted) {
        currentVoteBtn.classList.add("clicked");
      } else {
        currentVoteBtn.classList.remove("clicked");
      }
    }

    updateChapterVoteCount(chapterId);
  } catch (err) {
    console.error("Lỗi khi kiểm tra vote:", err);
  }
}

// Lấy tổng vote chapter
async function updateChapterVoteCount(chapterId) {
  try {
    const res = await fetch(`/api/chapter/${chapterId}/votes`);
    const data = await res.json();

    const voteCountEl = document.getElementById("voteCount");
    if (voteCountEl && data.total_votes !== undefined) {
      voteCountEl.textContent = data.total_votes;
    }
  } catch (err) {
    console.error("Lỗi khi cập nhật tổng vote:", err);
  }
}