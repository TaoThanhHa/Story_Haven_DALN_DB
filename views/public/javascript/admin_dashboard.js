// public/javascript/admin_dashboard.js

let newStoriesChartInstance = null; // Biến để lưu trữ thể hiện biểu đồ
let storyCategoriesChartInstance = null; // Biến để lưu trữ thể hiện biểu đồ

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
            console.log('New Stories Last 7 Days:', data.newStoriesLast7Days);
            renderDashboard(data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            document.getElementById('totalUsers').textContent = 'Lỗi';
            document.getElementById('totalStories').textContent = 'Lỗi';
            document.getElementById('totalComments').textContent = 'Lỗi';
            document.getElementById('pendingStories').textContent = 'Lỗi';
            document.getElementById('pendingReports').textContent = 'Lỗi';
            document.getElementById('adminActivitiesList').innerHTML = '<li>Không thể tải hoạt động.</li>';
        }
    }

    function renderDashboard(data) {
        // Cập nhật các thẻ thống kê
        document.getElementById('totalUsers').textContent = data.totalUsers.toLocaleString('vi-VN');
        document.getElementById('totalStories').textContent = data.totalStories.toLocaleString('vi-VN');
        document.getElementById('totalComments').textContent = data.totalComments.toLocaleString('vi-VN');
        document.getElementById('pendingStories').textContent = data.pendingStories.toLocaleString('vi-VN');
        document.getElementById('pendingReports').textContent = data.pendingReports.toLocaleString('vi-VN');

        // Vẽ biểu đồ truyện mới trong 7 ngày
        renderNewStoriesChart(data.newStoriesLast7Days);

        // Vẽ biểu đồ thể loại truyện
        renderStoryCategoriesChart(data.storyCategories);

        const adminActivitiesList = document.getElementById('adminActivitiesList');
        adminActivitiesList.innerHTML = `
            <li><i class="fas fa-info-circle"></i> Chưa có dữ liệu hoạt động gần đây của Admin.</li>
            <li><i class="fas fa-exclamation-circle"></i> Có ${data.pendingStories} truyện đang chờ duyệt. <a href="/admin/stories" class="text-link">Xem ngay</a></li>
            <li><i class="fas fa-comments"></i> Có ${data.pendingReports} bình luận bị báo cáo. <a href="/admin/comments" class="text-link">Xem ngay</a></li>
        `;
    }

    function renderNewStoriesChart(storyData) {
        const ctx = document.getElementById('newStoriesChart').getContext('2d');

        // Hủy biểu đồ cũ nếu nó tồn tại
        if (newStoriesChartInstance) {
            newStoriesChartInstance.destroy();
        }

        const today = new Date();
        const labels = [];
        const counts = [];
        const dataMap = new Map();
        storyData.forEach(item => {
            dataMap.set(item.date.split('T')[0], item.count); // Format YYYY-MM-DD
        });

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
            labels.push(d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' })); // VD: 11/04

            counts.push(dataMap.get(dateStr) || 0);
        }

        newStoriesChartInstance = new Chart(ctx, { // Gán thể hiện biểu đồ vào biến
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
                maintainAspectRatio: false, // Rất quan trọng để biểu đồ không tự động thay đổi tỉ lệ
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Số lượng'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Ngày'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    function renderStoryCategoriesChart(categoryData) {
        const ctx = document.getElementById('storyCategoriesChart').getContext('2d');

        // Hủy biểu đồ cũ nếu nó tồn tại
        if (storyCategoriesChartInstance) {
            storyCategoriesChartInstance.destroy();
        }

        const labels = categoryData.map(item => item.category);
        const data = categoryData.map(item => item.count);
        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#6A8A8A', '#FFCD56', '#C70039', '#FFC300'
        ];

        storyCategoriesChartInstance = new Chart(ctx, { // Gán thể hiện biểu đồ vào biến
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
                maintainAspectRatio: false, // Rất quan trọng
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                let label = tooltipItem.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += tooltipItem.raw.toLocaleString('vi-VN') + ' truyện';
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // Khởi chạy
    fetchDashboardData();
});