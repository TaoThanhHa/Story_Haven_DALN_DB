// public/javascript/admin_dashboard.js

let newStoriesChartInstance = null; 
let storyCategoriesChartInstance = null; 

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin Dashboard script loaded.');

    async function fetchDashboardData() {
        try {
            const response = await fetch('/admin/api/dashboard/stats');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Dashboard Data:', data);
            renderDashboard(data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);

            // Gán giá trị lỗi mà không phá vỡ giao diện
            safeSetText('totalUsers', 'Lỗi');
            safeSetText('totalStories', 'Lỗi');
            safeSetText('totalComments', 'Lỗi');
            safeSetText('pendingReports', 'Lỗi');

            const list = document.getElementById('adminActivitiesList');
            if (list) {
                list.innerHTML = '<li>Không thể tải hoạt động.</li>';
            }
        }
    }

    // Hàm hỗ trợ đặt text mà không gây lỗi khi ID không tồn tại
    function safeSetText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function renderDashboard(data) {

        safeSetText('totalUsers', data.totalUsers.toLocaleString('vi-VN'));
        safeSetText('totalStories', data.totalStories.toLocaleString('vi-VN'));
        safeSetText('totalComments', data.totalComments.toLocaleString('vi-VN'));
        safeSetText('pendingReports', data.pendingReports.toLocaleString('vi-VN'));
        
        renderNewStoriesChart(data.newStoriesLast7Days);
        renderStoryCategoriesChart(data.storyCategories);

        const adminActivitiesList = document.getElementById('adminActivitiesList');
        if (adminActivitiesList) {
            adminActivitiesList.innerHTML = `
                <li><i class="fas fa-info-circle"></i> Chưa có dữ liệu hoạt động gần đây của Admin.</li>
                <li><i class="fas fa-comments"></i> Có ${data.pendingReports} bình luận bị báo cáo. 
                    <a href="/admin/comments" class="text-link">Xem ngay</a>
                </li>
            `;
        }
    }

    function renderNewStoriesChart(storyData) {
        const ctx = document.getElementById('newStoriesChart').getContext('2d');

        if (newStoriesChartInstance) newStoriesChartInstance.destroy();

        const today = new Date();
        const labels = [];
        const counts = [];
        const dataMap = new Map();

        storyData.forEach(item => {
            dataMap.set(item._id.split('T')[0], item.count);
        });

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);

            const dateStr = d.toISOString().split('T')[0];

            labels.push(d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }));
            counts.push(dataMap.get(dateStr) || 0);
        }

        newStoriesChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số truyện mới',
                    data: counts,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true },
                    x: {}
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderStoryCategoriesChart(categoryData) {
        const ctx = document.getElementById('storyCategoriesChart').getContext('2d');

        if (storyCategoriesChartInstance) storyCategoriesChartInstance.destroy();

        const labels = categoryData.map(item => item.category);
        const data = categoryData.map(item => item.count);

        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#6A8A8A', '#FFCD56', '#C70039', '#FFC300'
        ];

        storyCategoriesChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                return `${tooltipItem.label}: ${tooltipItem.raw.toLocaleString('vi-VN')} truyện`;
                            }
                        }
                    }
                }
            }
        });
    }

    fetchDashboardData();
});
