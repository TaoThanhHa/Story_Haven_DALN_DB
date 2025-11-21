document.addEventListener("DOMContentLoaded", () => {
const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");
const togglePassword = document.getElementById("togglePassword");

// Toggle hiển thị mật khẩu
if (togglePassword) {
togglePassword.addEventListener("click", () => {
const passwordField = document.getElementById("pass");
const isHidden = passwordField.type === "password";
passwordField.type = isHidden ? "text" : "password";
togglePassword.classList.toggle("fa-eye");
togglePassword.classList.toggle("fa-eye-slash");
});
}

// Xử lý đăng nhập
loginForm.addEventListener("submit", async (event) => {
event.preventDefault();

const email = document.getElementById("user").value.trim();
const password = document.getElementById("pass").value.trim();

// Kiểm tra đầu vào
if (!email || !password) {
  showError("Vui lòng nhập đầy đủ email và mật khẩu!");
  return;
}

try {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();

  if (response.ok && result.success) {
    showSuccess(result.message || "Đăng nhập thành công! Đang chuyển hướng...");
    setTimeout(() => {
      window.location.href = result.redirectUrl || "/"; 
    }, 1200);
  } else {
    showError(result.error || "Email hoặc mật khẩu không chính xác!");
  }
} catch (err) {
  console.error("Lỗi đăng nhập:", err);
  showError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau!");
}


});

// Hiển thị thông báo lỗi
function showError(message) {
if (!errorMessage) return;
errorMessage.textContent = message;
errorMessage.style.color = "red";
errorMessage.style.display = "block";
}

// Hiển thị thông báo thành công
function showSuccess(message) {
if (!errorMessage) return;
errorMessage.textContent = message;
errorMessage.style.color = "green";
errorMessage.style.display = "block";
}
});