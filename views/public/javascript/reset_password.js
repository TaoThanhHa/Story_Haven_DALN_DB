// views/public/javascript/reset_password.js
document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const messageDiv = document.getElementById('message');
    const errorMessageDiv = document.getElementById('errorMessage');

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        messageDiv.textContent = '';
        errorMessageDiv.textContent = '';

        if (newPassword !== confirmPassword) {
            errorMessageDiv.textContent = 'Mật khẩu mới và xác nhận mật khẩu không khớp.';
            return;
        }

        // Lấy token từ URL (ví dụ: /reset-password/YOUR_TOKEN_HERE)
        const pathSegments = window.location.pathname.split('/');
        const token = pathSegments[pathSegments.length - 1]; // Lấy phần tử cuối cùng

        if (!token) {
            errorMessageDiv.textContent = 'Token đặt lại mật khẩu không tìm thấy trong URL.';
            return;
        }

        try {
            const response = await fetch(`/api/reset-password/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                messageDiv.textContent = data.message || 'Mật khẩu đã được đặt lại thành công!';
                resetPasswordForm.reset();
                // Tùy chọn: Chuyển hướng về trang đăng nhập sau một thời gian
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                errorMessageDiv.textContent = data.error || 'Đã xảy ra lỗi khi đặt lại mật khẩu. Vui lòng thử lại.';
            }
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu đặt lại mật khẩu:', error);
            errorMessageDiv.textContent = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
        }
    });
});