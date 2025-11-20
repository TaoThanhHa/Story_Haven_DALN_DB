const commentForm = document.getElementById("commentForm");
const commentInput = document.getElementById("commentInput");
const commentsList = document.getElementById("commentsList");

// ==================== CREATE COMMENT ELEMENT ====================
function createCommentElement(cmt) {
  const div = document.createElement("div");
  div.className = "comment-item mb-3";
  div.dataset.commentId = cmt._id;

  const repliesHTML = cmt.replies && cmt.replies.length
    ? cmt.replies.map(r => `
      <div class="reply-item d-flex align-items-start mt-2" data-reply-id="${r._id}">
        <img src="${r.userId.avatar || '/images/default-avatar.png'}" class="me-2" style="width:30px;height:30px;border-radius:50%;">
        <div class="flex-grow-1">
          <a href="/account/${cmt.userId._id}" class="fw-bold">${r.userId.username}</a>
          <span class="text-muted small"> • ${new Date(r.createdAt).toLocaleString()}</span>
          <div class="reply-content mt-1 mb-1">${r.content}</div>
          <div>
            ${r.userId._id === window.currentUserId ? `
              <button class="btn btn-sm btn-link edit-reply-btn">Sửa</button>
              <button class="btn btn-sm btn-link text-danger delete-reply-btn">Xóa</button>
            ` : ""}
            <button class="btn btn-sm btn-link reply-btn">Trả lời</button>
          </div>
        </div>
      </div>
    `).join("") : "";

  div.innerHTML = `
    <div class="d-flex align-items-start">
      <img src="${cmt.userId.avatar || '/images/default-avatar.png'}" class="me-2" style="width:40px;height:40px;border-radius:50%;">
      <div class="flex-grow-1">
        <a href="/account/${cmt.userId._id}" class="fw-bold">${cmt.userId.username}</a>
        <span class="text-muted small"> • ${new Date(cmt.createdAt).toLocaleString()}</span>
        <div class="comment-content mt-1 mb-2">${cmt.content}</div>
        <div>
          ${cmt.userId._id === window.currentUserId ? `
            <button class="btn btn-sm btn-link edit-comment-btn">Sửa</button>
            <button class="btn btn-sm btn-link text-danger delete-comment-btn">Xóa</button>
          ` : ""}
          <button class="btn btn-sm btn-link reply-btn">Trả lời</button>
        </div>
        <div class="replies">${repliesHTML}</div>
      </div>
    </div>
  `;
  return div;
}

// ==================== LOAD COMMENTS ====================
// ==================== LOAD COMMENTS ====================
async function loadComments() {
  if (!CHAPTERCURRENT) return;
  try {
    const res = await fetch(`/api/chapter/${CHAPTERCURRENT}/comments`);
    const data = await res.json();
    commentsList.innerHTML = "";
    if (data.success && data.comments.length) {
      // Sắp xếp comment mới nhất lên trước
      const sortedComments = data.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      sortedComments.forEach(cmt => commentsList.appendChild(createCommentElement(cmt)));
    }
  } catch (err) {
    console.error("Lỗi load comment:", err);
  }
}


// ==================== ADD COMMENT ====================
if (commentForm) {
  commentForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!commentInput.value.trim()) return;
    try {
      await fetch("/api/chapter/comment/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: CHAPTERCURRENT, content: commentInput.value })
      });
      commentInput.value = "";
      loadComments();
    } catch (err) { console.error(err); }
  });
}

// ==================== DELEGATE EDIT / DELETE / REPLY ====================
commentsList.addEventListener("click", async e => {
  const commentEl = e.target.closest(".comment-item, .reply-item");
  if (!commentEl) return;

  const commentId = commentEl.dataset.commentId;
  const replyId = commentEl.dataset.replyId;

  // Delete
  if (e.target.classList.contains("delete-comment-btn")) {
    if (!confirm("Bạn có chắc muốn xóa bình luận này?")) return;
    await fetch(`/api/chapter/comment/${commentId}`, { method: "DELETE" });
    loadComments();
  }
  if (e.target.classList.contains("delete-reply-btn")) {
    if (!confirm("Bạn có chắc muốn xóa phản hồi này?")) return;
    await fetch(`/api/chapter/comment/reply/${replyId}`, { method: "DELETE" });
    loadComments();
  }

  // Edit
  if (e.target.classList.contains("edit-comment-btn")) {
    const oldContent = commentEl.querySelector(".comment-content").innerText;
    const newContent = prompt("Nhập nội dung mới:", oldContent);
    if (!newContent) return;
    await fetch("/api/chapter/comment/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, content: newContent })
    });
    loadComments();
  }
  if (e.target.classList.contains("edit-reply-btn")) {
    const oldContent = commentEl.querySelector(".reply-content").innerText;
    const newContent = prompt("Nhập nội dung mới:", oldContent);
    if (!newContent) return;
    await fetch("/api/chapter/comment/reply/edit", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyId, content: newContent })
    });
    loadComments();
  }

// Reply
if (e.target.classList.contains("reply-btn")) {
  // Nếu đã có form reply đang mở thì không tạo thêm
  if (commentEl.querySelector(".reply-form")) return;

  // Tạo form reply
  const form = document.createElement("form");
  form.className = "reply-form mt-2 d-flex";

  const textarea = document.createElement("textarea");
  textarea.className = "form-control me-2";
  textarea.rows = 1;
  textarea.placeholder = "Nhập phản hồi...";

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "btn btn-primary";
  btn.innerHTML = `<i class="fas fa-paper-plane"></i>`;

  form.appendChild(textarea);
  form.appendChild(btn);

  // Thay vì append cuối, insert ngay dưới comment/reply được click
  commentEl.after(form);

  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const content = textarea.value.trim();
    if (!content) return;

    // Lấy parent comment ID
    const parentCommentId = commentEl.dataset.commentId || commentEl.closest(".comment-item").dataset.commentId;

    try {
      await fetch("/api/chapter/comment/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: parentCommentId, content })
      });

      // Tải lại comment mới nhất, reply vẫn giữ nguyên thứ tự
      await loadComments();
    } catch (err) {
      console.error(err);
    }
  });
}

});

// ==================== LOAD COMMENTS ON PAGE ====================
document.addEventListener("DOMContentLoaded", loadComments);
