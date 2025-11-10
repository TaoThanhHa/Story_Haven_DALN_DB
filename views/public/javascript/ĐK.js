document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const messageBox = document.getElementById("formMessage");
    const emailError = document.getElementById("email-error");
    const passwordError = document.getElementById("password-error");
    const confirmPasswordError = document.getElementById("confirm-password-error");

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const password = document.getElementById("password").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();

        // Reset lỗi
        emailError.style.display = "none";
        passwordError.style.display = "none";
        confirmPasswordError.style.display = "none";
        messageBox.style.display = "none";

        // Kiểm tra đầy đủ thông tin
        if (!username || !email || !phone || !password || !confirmPassword) {
            showMessage("Vui lòng điền đầy đủ thông tin!", "error");
            return;
        }

        // Kiểm tra email hợp lệ
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            emailError.textContent = "Email không hợp lệ.";
            emailError.style.display = "block";
            return;
        }

        // Kiểm tra mật khẩu
        if (password.length < 6) {
            passwordError.textContent = "Mật khẩu phải có ít nhất 6 ký tự!";
            passwordError.style.display = "block";
            return;
        }

        if (password !== confirmPassword) {
            confirmPasswordError.textContent = "Mật khẩu và nhập lại mật khẩu không khớp!";
            confirmPasswordError.style.display = "block";
            return;
        }

        // Gửi API register
        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, phone, password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showMessage(result.message || "Đăng ký thành công!", "success");
                setTimeout(() => window.location.href = "/login", 1500);
            } else {
                showMessage(result.error || "Có lỗi xảy ra khi đăng ký!", "error");
            }
        } catch (err) {
            console.error("Lỗi đăng ký:", err);
            showMessage("Không thể kết nối máy chủ. Vui lòng thử lại!", "error");
        }
    });

    function showMessage(text, type) {
        messageBox.textContent = text;
        messageBox.style.color = type === "error" ? "red" : "green";
        messageBox.style.display = "block";
    }
});
