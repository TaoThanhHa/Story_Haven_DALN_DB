// public/javascript/admin_layout.js

document.addEventListener('DOMContentLoaded', () => {
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
    const navLinks = document.querySelectorAll('.sidebar-nav ul li a');
    const logoutBtn = document.getElementById('logout-btn');
    const currentPath = window.location.pathname;
    const sidebar = document.querySelector('.sidebar'); 

    navLinks.forEach(link => {
        if (currentPath.startsWith(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });

    // Toggle sidebar
    toggleSidebarBtn?.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed'); 
        console.log('Toggle sidebar clicked');
    });

    // Logout
    logoutBtn?.addEventListener('click', async e => {
        e.preventDefault();
        try {
            const res = await fetch('/admin/logout', { method: 'GET' });
            
            if (res.ok) {
                alert('Đăng xuất thành công!');
                window.location.href = '/login'; 
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Không thể đọc lỗi từ server.' }));
                console.error('Đăng xuất thất bại:', res.status, errorData.error || res.statusText);
                alert(`Đăng xuất thất bại: ${errorData.error || 'Vui lòng thử lại.'}`);
            }
        } catch (err) {
            console.error('Lỗi khi đăng xuất:', err);
            alert('Có lỗi xảy ra khi đăng xuất. Vui lòng kiểm tra kết nối.');
        }
    });

    window.showModal = modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.setProperty('display', 'flex'); 
        }
    };

    window.hideModal = modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.setProperty('display', 'none');
        }
    };

    // Gắn sự kiện cho nút đóng modal (close-button)
    document.querySelectorAll('.modal .close-button').forEach(btn =>
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) hideModal(modal.id);
        })
    );

    // Gắn sự kiện đóng modal khi click ra ngoài vùng nội dung modal
    document.querySelectorAll('.modal').forEach(modal =>
        modal.addEventListener('click', e => {
            if (e.target === modal) { 
                hideModal(modal.id);
            }
        })
    );
});