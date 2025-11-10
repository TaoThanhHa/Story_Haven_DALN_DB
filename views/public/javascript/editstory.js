const STORY_ID = new URLSearchParams(window.location.search).get("id");
let selectedFile = null;
let currentControl = 0; // 0 = bản nháp, 1 = đã đăng

// Khi tải trang
document.addEventListener("DOMContentLoaded", () => {
  if (STORY_ID) {
    fetchStoryData(STORY_ID);
  }

  document.querySelector(".story").style.display = "block";
  document.querySelector(".chap").style.display = "none";
});

// 🟣 Chuyển tab giữa Tác phẩm / Chapter
function changeContent(element, tab) {
  const storyElement = document.querySelector(".story");
  const chapElement = document.querySelector(".chap");

  if (tab === "Tạo tác phẩm") {
    storyElement.style.display = "block";
    chapElement.style.display = "none";
  } else {
    storyElement.style.display = "none";
    chapElement.style.display = "block";
    if (STORY_ID) {
      loadChapterList(STORY_ID);
    } else {
      alert("⚠️ Vui lòng lưu truyện trước khi tạo chương!");
    }
  }

  document.querySelectorAll(".word").forEach(w => w.classList.remove("selected"));
  element.classList.add("selected");
}

// 🟢 Lấy dữ liệu truyện
async function fetchStoryData(storyId) {
  try {
    const res = await fetch(`/api/story/${storyId}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      alert("Không tìm thấy truyện!");
      return;
    }

    fillStoryData(data.story);
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu:", err);
  }
}

// 🟢 Điền dữ liệu vào form
function fillStoryData(story) {
  document.getElementById("story-title").value = story.title || "";
  document.getElementById("story-content").value = story.description || "";
  document.getElementById("status-select").value = story.status || "writing";

  currentControl = story.control ? parseInt(story.control) : 0;
  updateControlButton();

  // Checkbox thể loại
  if (story.category) {
    const categories = story.category.split(",").map(c => c.trim());
    document.querySelectorAll("#category-list input[type='checkbox']").forEach(cb => {
      cb.checked = categories.includes(cb.value);
    });
  }

  if (story.thumbnail) {
    document.getElementById("preview-image").src = story.thumbnail;
  }
}

// 🟡 Cập nhật nút đăng tải
function updateControlButton() {
  const btn = document.getElementById("toggle-control-btn");
  if (!btn) return;
  btn.textContent = currentControl === 1 ? "Dừng đăng tải" : "Đăng tải";
}

// 🟢 Đổi trạng thái đăng tải
function togglePublish() {
  if (!STORY_ID) return alert("Không tìm thấy ID truyện!");

  const newControl = currentControl === 1 ? 0 : 1;

  fetch(`/api/story/${STORY_ID}/control`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ control: newControl })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert("Lỗi khi cập nhật trạng thái đăng tải!");
        return;
      }
      currentControl = newControl;
      updateControlButton();
      alert(`Truyện đã được ${newControl === 1 ? "đăng tải" : "dừng đăng tải"}.`);
    })
    .catch(err => console.error("Lỗi khi đổi trạng thái:", err));
}

// 🟢 Lưu thông tin truyện
function saveStory() {
  if (!STORY_ID) return alert("Không tìm thấy ID truyện!");

  const categories = Array.from(
    document.querySelectorAll("#category-list input[type='checkbox']:checked")
  ).map(cb => cb.value);

  const updatedStory = {
    title: document.getElementById("story-title").value.trim(),
    description: document.getElementById("story-content").value.trim(),
    category: categories.join(", "),
    status: document.getElementById("status-select").value,
    control: currentControl
  };

  fetch(`/api/story/${STORY_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedStory)
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert("Lỗi khi lưu truyện!");
        return;
      }

      if (selectedFile) {
        const formData = new FormData();
        formData.append("thumbnail", selectedFile);

        return fetch(`/api/story/${STORY_ID}/thumbnail`, {
          method: "PUT",
          body: formData
        })
          .then(res => res.json())
          .then(imgData => {
            if (imgData.success) {
              alert("Lưu truyện + ảnh bìa thành công!");
            } else {
              alert("Lưu truyện thành công nhưng lỗi khi cập nhật ảnh bìa!");
            }
          });
      } else {
        alert("Lưu truyện thành công!");
      }
    })
    .catch(err => console.error("Lỗi khi lưu:", err));
}

// 🟢 Load danh sách chương
async function loadChapterList(storyId) {
  try {
    const res = await fetch(`/api/story/${storyId}/chapters`);
    const data = await res.json();

    if (!res.ok || data.error) {
      document.getElementById("chapter-list").innerHTML = "<p>Không có dữ liệu chương.</p>";
      return;
    }

    fillChapterList(data.chapters);
  } catch (err) {
    console.error("Lỗi khi load chương:", err);
  }
}

// 🟢 Hiển thị danh sách chương
function fillChapterList(chapters) {
  const chapterListDiv = document.getElementById("chapter-list");

  if (!chapters || chapters.length === 0) {
    chapterListDiv.innerHTML = "<p>Chưa có chương nào.</p>";
    return;
  }

  let html = `
    <table class="table table-hover align-middle">
      <thead>
        <tr>
          <th style="width: 60px;">#</th>
          <th>Tiêu đề chương</th>
          <th style="width: 150px;">Trạng thái</th>
          <th style="width: 180px;">Ngày cập nhật</th>
          <th style="width: 160px;">Hành động</th>
        </tr>
      </thead>
      <tbody id="chapter-table-body">
  `;

  chapters.forEach(chap => {
    const statusText = chap.control === 1 ? "Đăng tải" : "Bản thảo";
    const statusColor = chap.control === 1 ? "text-success" : "text-muted";

    html += `
      <tr data-id="${chap._id}" draggable="true">
        <td>${chap.chapter_number}</td>
        <td>${chap.title}</td>
        <td class="${statusColor}" style="font-weight: 600;">${statusText}</td>
        <td>${new Date(chap.updatedAt || chap.createdAt).toLocaleString()}</td>
        <td>
          <a href="/editchapter?chapterId=${chap._id}&storyId=${STORY_ID}"
            class="btn btn-sm btn-warning me-1">Sửa</a>
          <button class="btn btn-sm btn-secondary me-1" onclick="toggleChapterControl('${chap._id}', ${chap.control})">
            ${chap.control === 1 ? "Dừng" : "Đăng"}
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteChapter('${chap._id}')">Xóa</button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  chapterListDiv.innerHTML = html;

  enableChapterDragDrop(); // ⚡ gọi sau khi render bảng
}

// 🟢 Kéo thả chương để thay đổi thứ tự
function enableChapterDragDrop() {
  const tbody = document.getElementById("chapter-table-body");
  if (!tbody) return;

  new Sortable(tbody, {
    animation: 150,
    ghostClass: "table-active",
    onEnd: async function () {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const newOrder = rows.map((row, index) => ({
        chapterId: row.dataset.id,
        chapter_number: index + 1
      }));

      try {
        const res = await fetch("/api/chapters/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: STORY_ID, newOrder })
        });
        const data = await res.json();

        if (data.success) {
          // Hiệu ứng nhẹ khi reorder xong
          rows.forEach((row, i) => {
            const cell = row.querySelector("td:first-child");
            cell.textContent = i + 1;
            cell.style.transition = "background 0.4s";
            cell.style.background = "#d1e7dd";
            setTimeout(() => (cell.style.background = ""), 400);
          });
        } else {
          alert("Lỗi khi cập nhật thứ tự chương!");
        }
      } catch (err) {
        console.error("reorder error:", err);
      }
    }
  });
}

async function toggleChapterControl(chapterId, currentControl) {
  const newControl = currentControl === 1 ? 0 : 1;
  try {
    const res = await fetch(`/api/chapter/${chapterId}/control`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ control: newControl }),
    });
    const data = await res.json();
    if (data.success) {
      loadChapterList(STORY_ID); // reload danh sách
    } else {
      alert("Lỗi khi cập nhật trạng thái chương!");
    }
  } catch (err) {
    console.error("toggleChapterControl:", err);
  }
}

// 🟢 Thêm chương mới
function addChapter() {
  if (!STORY_ID) {
    alert("Vui lòng lưu truyện trước khi thêm chương!");
    return;
  }
  window.location.href = `/create-chapter?storyId=${STORY_ID}`;
}

// 🟢 Xóa chương
function deleteChapter(chapterId) {
  if (!confirm("Bạn có chắc muốn xóa chương này?")) return;

  fetch(`/api/chapter/${chapterId}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Đã xóa chương!");
        loadChapterList(STORY_ID); // ✅ Tải lại danh sách để cập nhật thứ tự mới
      } else {
        alert("Lỗi khi xóa chương!");
      }
    })
    .catch(err => console.error("Lỗi khi xóa:", err));
}

// 🟢 Upload ảnh bìa
document.getElementById("image-upload").addEventListener("change", e => {
  selectedFile = e.target.files[0];
  if (selectedFile) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById("preview-image").src = e.target.result;
    };
    reader.readAsDataURL(selectedFile);
  }
});
