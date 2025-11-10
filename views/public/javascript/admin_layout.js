document.addEventListener('DOMContentLoaded', () => {
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
    const navLinks = document.querySelectorAll('.sidebar-nav ul li a');
    const logoutBtn = document.getElementById('logout-btn');
    const currentPath = window.location.pathname;

    // Highlight nav active
    navLinks.forEach(link => {
        if (currentPath.startsWith(link.getAttribute('href'))) link.classList.add('active');
    });

    // Toggle sidebar (hiện placeholder)
    toggleSidebarBtn?.addEventListener('click', () => console.log('Toggle sidebar clicked'));

    // Logout
    logoutBtn?.addEventListener('click', async e => {
        e.preventDefault();
        try {
            const res = await fetch('/admin/logout', { method: 'GET' });
            if (res.ok) {
                alert('Đăng xuất thành công!');
                window.location.href = '/login';
            } else {
                console.error('Đăng xuất thất bại', res.status);
                alert('Đăng xuất thất bại.');
            }
        } catch (err) {
            console.error('Lỗi khi đăng xuất:', err);
            alert('Có lỗi xảy ra khi đăng xuất.');
        }
    });

    // Modal chung
    window.showModal = modalId => document.getElementById(modalId)?.style.setProperty('display','flex');
    window.hideModal = modalId => document.getElementById(modalId)?.style.setProperty('display','none');

    document.querySelectorAll('.modal .close-button').forEach(btn =>
        btn.addEventListener('click', () => hideModal(btn.closest('.modal')?.id))
    );

    document.querySelectorAll('.modal').forEach(modal =>
        modal.addEventListener('click', e => { if (e.target === modal) hideModal(modal.id); })
    );
});
