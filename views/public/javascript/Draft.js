document.addEventListener("DOMContentLoaded", async () => {
  const STORY_ID = new URLSearchParams(window.location.search).get("storyId");
  const storyTitle = document.getElementById("story-title");
  const chapterLabel = document.querySelector(".chapter");
  const storyEditor = document.querySelector(".story-editor");
  const saveBtn = document.querySelector("button[onclick='saveStory()']");

  let lastTitle = "";
  let lastContent = "";
  let isSaving = false;
  let nextChapterNumber = 1;

  // 🧩 Thanh trạng thái lưu
  const statusBar = document.createElement("div");
  statusBar.id = "save-status";
  statusBar.style.fontSize = "14px";
  statusBar.style.color = "#6c757d";
  statusBar.style.marginTop = "5px";
  statusBar.textContent = "💾 Chưa lưu";
  document.querySelector(".actions").appendChild(statusBar);

  // 🧩 Kiểm tra ID truyện
  if (!STORY_ID) {
    alert("Không tìm thấy ID truyện!");
    return;
  }

  // 🧩 Ngăn người dùng xuống dòng khi nhập tiêu đề
  storyTitle.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      storyTitle.innerText = storyTitle.innerText.trim();
    }
  });

  // 🧩 Lấy số chương cao nhất
  async function getMaxChapter(storyId) {
    try {
      const res = await fetch(`/api/chapters/max?storyId=${storyId}`);
      const data = await res.json();
      nextChapterNumber = data.maxChapter ? data.maxChapter + 1 : 1;
    } catch (err) {
      console.error("Lỗi khi lấy chương:", err);
    }
  }

  await getMaxChapter(STORY_ID);

  // 🧩 Tạo đoạn văn trống mặc định
  if (storyEditor && storyEditor.innerText.trim() === "") {
    const newParagraph = document.createElement("p");
    newParagraph.textContent = "";
    storyEditor.appendChild(newParagraph);
  }

  // 🧩 Kiểm tra thay đổi nội dung
  function hasChanges() {
    const currentTitle = storyTitle.innerText.trim();
    const currentContent = storyEditor.innerText.trim();
    return currentTitle !== lastTitle || currentContent !== lastContent;
  }

  // 🧩 Hàm lưu chương
  async function saveStory(isAuto = false) {
    const title = storyTitle.innerText.trim();
    const content = storyEditor.innerText.trim();

    if (!title || !content) {
      if (!isAuto) alert("Vui lòng nhập tiêu đề và nội dung chương!");
      return;
    }

    try {
      isSaving = true;
      statusBar.textContent = "💾 Đang lưu...";

      console.log("📤 Gửi request lưu chương:", {
        storyId: STORY_ID,
        title,
        content,
        chapter_number: nextChapterNumber,
      });

      const response = await fetch(`/api/chapter/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          storyId: STORY_ID,
          title,
          content,
          chapter_number: nextChapterNumber,
          auto_save: isAuto,
        }),
      });

      const result = await response.json();
      console.log("📥 Phản hồi từ server:", result);

      const now = new Date().toLocaleTimeString("vi-VN");

      if (response.ok && result.success) {
        lastTitle = title;
        lastContent = content;
        statusBar.textContent = `✅ Đã lưu lúc ${now}`;
        if (!isAuto) alert("✅ Lưu chương thành công!");
      } else if (response.status === 401) {
        statusBar.textContent = "⚠️ Cần đăng nhập!";
        if (!isAuto) {
          alert("⚠️ Bạn cần đăng nhập để lưu chương!");
          window.location.href = "/login";
        }
      } else {
        statusBar.textContent = "❌ Lưu thất bại!";
        if (!isAuto) alert(result.error || "❌ Lưu thất bại, vui lòng thử lại!");
      }
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      statusBar.textContent = "⚠️ Không thể kết nối!";
      if (!isAuto) alert("Không thể kết nối đến máy chủ!");
    } finally {
      isSaving = false;
    }
  }

  // 🧩 Tự động lưu mỗi 30 giây khi có thay đổi
  setInterval(() => {
    if (!isSaving && hasChanges()) {
      saveStory(true);
    }
  }, 30000);

  // ✅ Export hàm ra global scope
  window.saveStory = saveStory;
});
