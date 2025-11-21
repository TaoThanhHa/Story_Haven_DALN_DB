let STORY_ID = null;

// Preview ảnh bìa khi chọn (guard element)
const imageUploadEl = document.getElementById("image-upload");
if (imageUploadEl) {
  imageUploadEl.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = document.getElementById("preview-image");
      if (preview) preview.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function validateTitle(title) {
  if (!title.trim()) return "Tiêu đề không được để trống";
  if (title.length < 3) return "Tiêu đề phải dài hơn 3 ký tự";
  if (title.length > 100) return "Tiêu đề không được dài quá 100 ký tự";
  return null;
}

function validateDescription(desc) {
  if (!desc.trim()) return "Mô tả không được để trống";
  if (desc.length < 10) return "Mô tả phải dài hơn 10 ký tự";
  if (desc.length > 1000) return "Mô tả không được dài quá 1000 ký tự";
  return null;
}

function getSelectedCategories() {
  const checked = document.querySelectorAll("#category-list input[type='checkbox']:checked");
  return Array.from(checked).map(cb => cb.value);
}

function validateCategories(categories) {
  if (!categories.length) return "Vui lòng chọn ít nhất 1 thể loại";
  return null;
}

function validateImage(fileInput) {
  if (!fileInput) return "Vui lòng chọn ảnh bìa";
  const file = fileInput.files[0];
  if (!file) return "Vui lòng chọn ảnh bìa";
  const validTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!validTypes.includes(file.type)) return "Ảnh chỉ được JPG, PNG hoặc GIF";
  if (file.size > 5 * 1024 * 1024) return "Ảnh không được vượt quá 5MB";
  return null;
}

async function saveStory() {
  try {
    const titleEl = document.getElementById("story-title");
    const descEl = document.getElementById("story-content");
    const statusEl = document.getElementById("status-select");
    const imageInput = document.getElementById("image-upload");

    const title = titleEl?.value.trim() || "";
    const description = descEl?.value.trim() || "";
    const categories = getSelectedCategories();
    const status = statusEl?.value || "writing";

    const errors = [
      validateTitle(title),
      validateDescription(description),
      validateCategories(categories),
      validateImage(imageInput)
    ].filter(Boolean);

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", categories.join(", "));
    formData.append("status", status);
    formData.append("control", "0");
    formData.append("thumbnail", imageInput.files[0]);

    const response = await fetch("/api/story/new", {
      method: "POST",
      body: formData,
      credentials: "include"
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Không thể lưu truyện!");
    }

    STORY_ID = result.storyId;
    alert("✅ Truyện đã được lưu!");

    window.location.href = `/story/edit?id=${STORY_ID}`;
  } catch (err) {
    console.error("Lỗi khi lưu truyện:", err);
    alert(err.message || "Có lỗi xảy ra khi lưu truyện!");
  }
}

const storyBlock = document.querySelector(".story");
if (storyBlock) storyBlock.style.display = "block";
