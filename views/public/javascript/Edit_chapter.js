document.addEventListener("DOMContentLoaded", async () => {
  const CHAPTER_ID = new URLSearchParams(window.location.search).get("chapterId");
  const storyTitle = document.getElementById("story-title");
  const chapterLabel = document.getElementById("chapter-number");
  const storyEditor = document.querySelector(".story-editor");
  const saveBtn = document.querySelector("button[onclick='saveChapter()']");
  
  let lastTitle = "";
  let lastContent = "";
  let isSaving = false;

  // 🧩 Thanh trạng thái lưu
  const statusBar = document.createElement("div");
  statusBar.id = "save-status";
  statusBar.style.fontSize = "14px";
  statusBar.style.color = "#6c757d";
  statusBar.style.marginTop = "5px";
  statusBar.textContent = "💾 Chưa lưu";
  document.querySelector(".actions").appendChild(statusBar);

  // 🧩 Kiểm tra chapterId
  if (!CHAPTER_ID) {
    alert("Chapter ID không tồn tại!");
    console.error("❌ Thiếu chapterId trong URL!");
    return;
  }

  // 🧩 Ngăn người dùng xuống dòng khi nhập tiêu đề
  storyTitle.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      storyTitle.innerText = storyTitle.innerText.trim();
    }
  });

  // 🧩 Lấy dữ liệu chương từ server
  async function fetchChapterData(chapterId) {
    try {
      const res = await fetch(`/api/chapter/${chapterId}`, { credentials: "include" });
      const data = await res.json();

      if (!res.ok || !data) throw new Error(data.error || "Không tìm thấy dữ liệu!");

      storyTitle.innerText = data.title || "Chưa có tiêu đề";
      storyEditor.innerText = data.content || "";

      lastTitle = storyTitle.innerText.trim();
      lastContent = storyEditor.innerText.trim();
      console.log("✅ Dữ liệu chương đã tải:", data);
    } catch (err) {
      console.error("Lỗi khi tải chương:", err);
      alert("Không thể tải chương, vui lòng thử lại!");
    }
  }

  await fetchChapterData(CHAPTER_ID);

  // Kiểm tra xem nội dung có thay đổi không
  function hasChanges() {
    const currentTitle = storyTitle.innerText.trim();
    const currentContent = storyEditor.innerText.trim();
    return currentTitle !== lastTitle || currentContent !== lastContent;
  }

  // Hàm lưu chương
  async function saveChapter(isAuto = false) {
    const title = storyTitle.innerText.trim();
    const content = storyEditor.innerText.trim();

    if (!title || !content) {
      if (!isAuto) alert("Vui lòng nhập tiêu đề và nội dung!");
      return;
    }

    try {
      isSaving = true;
      statusBar.textContent = "💾 Đang lưu...";

      const response = await fetch(`/api/chapter/${CHAPTER_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          content,
          auto_save: isAuto,
        }),
      });

      const result = await response.json();
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

  if (saveBtn) saveBtn.addEventListener("click", () => saveChapter(false));

  //Tự động lưu mỗi 30 giây khi có thay đổi
  setInterval(() => {
    if (!isSaving && hasChanges()) {
      saveChapter(true);
    }
  }, 30000);
});
