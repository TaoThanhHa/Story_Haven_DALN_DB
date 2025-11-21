document.addEventListener('DOMContentLoaded', function() { 
    const registerForm = document.getElementById('registerForm');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const confirmPasswordError = document.getElementById('confirm-password-error');

    let phoneError = document.getElementById('phone-error');
    if (!phoneError) {
        phoneError = document.createElement('div');
        phoneError.id = 'phone-error';
        phoneError.className = 'error';
        phoneError.style.display = 'none';
        phoneError.style.color = 'red';
        const phoneInput = document.getElementById('phone');
        phoneInput.insertAdjacentElement('afterend', phoneError);
    }

    // Hàm hiển thị lỗi
    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    // Hàm ẩn lỗi
    function hideError(element) {
        element.style.display = 'none';
    }

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideError(emailError);
        hideError(passwordError);
        hideError(confirmPasswordError);
        hideError(phoneError);

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        let isValid = true;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!emailRegex.test(email)) {
            showError(emailError, 'Email không hợp lệ. Vui lòng sử dụng email @gmail.com.');
            isValid = false;
        }

        const phoneRegex = /^(0[0-9]{9})$/;
        if (!phoneRegex.test(phone)) {
            showError(phoneError, 'Số điện thoại không hợp lệ. Vui lòng nhập 10 chữ số, bắt đầu bằng số 0.');
            isValid = false;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]).{8,}$/;
        if (!passwordRegex.test(password)) {
            showError(passwordError, 'Mật khẩu phải có ít nhất 8 ký tự, gồm 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.');
            isValid = false;
        }

        // Kiểm tra mật khẩu khớp
        if (password !== confirmPassword) {
            showError(confirmPasswordError, 'Mật khẩu và nhập lại mật khẩu không khớp!');
            isValid = false;
        }

        if (!isValid) return;

        // Gửi dữ liệu hợp lệ
        const data = { username: name, email, phone, password };

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert(result.message || 'Đăng ký thành công!');
                window.location.href = '/login';
            } else {
                if (result.error && result.error.includes('password')) {
                    showError(passwordError, result.error);
                } else {
                    alert(result.error || 'Có lỗi xảy ra khi đăng ký!');
                }
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Có lỗi xảy ra trong quá trình đăng ký.');
        }
    });
});
