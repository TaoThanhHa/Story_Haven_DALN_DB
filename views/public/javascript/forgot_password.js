document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const messageDiv = document.getElementById('message');
    const errorMessageDiv = document.getElementById('errorMessage');

    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;

        messageDiv.textContent = '';
        errorMessageDiv.textContent = '';

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                messageDiv.textContent = data.message || 'Yêu cầu đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn.';
                forgotPasswordForm.reset(); 
            } else {
                errorMessageDiv.textContent = data.error || 'Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng thử lại.';
            }
        } catch (error) {
            console.error('Lỗi khi gửi yêu cầu quên mật khẩu:', error);
            errorMessageDiv.textContent = 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';
        }
    });
});