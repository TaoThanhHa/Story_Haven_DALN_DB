document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('reportedCommentsTableBody');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const reasonFilter = document.getElementById('reasonFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfoSpan = document.getElementById('pageInfo');

    const commentDetailModal = document.getElementById('commentDetailModal');
    const closeButton = commentDetailModal.querySelector('.close-button');
    const modalReportId = document.getElementById('modalReportId');
    const modalCommentId = document.getElementById('modalCommentId');
    const modalCommentType = document.getElementById('modalCommentType');
    const modalStoryTitle = document.getElementById('modalStoryTitle');
    const modalChapterTitle = document.getElementById('modalChapterTitle');
    const modalTargetUserProfile = document.getElementById('modalTargetUserProfile');
    const modalCommentContent = document.getElementById('modalCommentContent');
    const modalCommentAuthor = document.getElementById('modalCommentAuthor');
    const modalCommentAuthorEmail = document.getElementById('modalCommentAuthorEmail');
    const modalReporterUsername = document.getElementById('modalReporterUsername');
    const modalReporterEmail = document.getElementById('modalReporterEmail');
    const modalReportReason = document.getElementById('modalReportReason');
    const modalReportStatus = document.getElementById('modalReportStatus');
    const modalCommentStatus = document.getElementById('modalCommentStatus');
    const modalReportedAt = document.getElementById('modalReportedAt');
    const modalAdminUsername = document.getElementById('modalAdminUsername');
    const modalActionTaken = document.getElementById('modalActionTaken');

    const adminReportStatusSelect = document.getElementById('adminReportStatus');
    const adminActionTakenTextarea = document.getElementById('adminActionTaken');
    const adminCommentStatusSelect = document.getElementById('adminCommentStatus');
    const saveAdminActionsBtn = document.getElementById('saveAdminActionsBtn');
    const deleteCommentBtn = document.getElementById('deleteCommentBtn');
    const deleteReportBtn = document.getElementById('deleteReportBtn');

    let currentPage = 1;
    let totalPages = 1;
    let currentSearch = '';
    let currentStatusFilter = 'pending'; 
    let currentReasonFilter = '';
    let currentReportId = null; 

    async function fetchReportedComments() {
        try {
            const response = await fetch(`/admin/api/reported-comments?page=${currentPage}&limit=10&search=${currentSearch}&status=${currentStatusFilter}&reason=${currentReasonFilter}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderTable(data.reportedComments);
            currentPage = data.currentPage;
            totalPages = data.totalPages;
            updatePaginationControls();
        } catch (error) {
            console.error('Lỗi khi tải bình luận bị báo cáo:', error);
            tableBody.innerHTML = '<tr><td colspan="10">Không thể tải dữ liệu. Vui lòng thử lại.</td></tr>';
        }
    }

    function renderTable(comments) {
        tableBody.innerHTML = '';
        if (comments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10">Không tìm thấy bình luận bị báo cáo nào.</td></tr>';
            return;
        }

        comments.forEach(comment => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = comment.report_id;
            row.insertCell().textContent = comment.comment_id;
            row.insertCell().textContent = comment.comment_content ? comment.comment_content.substring(0, 50) + (comment.comment_content.length > 50 ? '...' : '') : '';
            row.insertCell().textContent = comment.comment_author;
            row.insertCell().textContent = comment.reporter_username;
            row.insertCell().textContent = comment.report_reason;
            row.insertCell().textContent = comment.report_status;
            row.insertCell().textContent = comment.comment_status;
            row.insertCell().textContent = new Date(comment.reported_at).toLocaleString();

            const actionsCell = row.insertCell();
            const viewBtn = document.createElement('button');
            viewBtn.textContent = 'Xem & Xử lý';
            viewBtn.classList.add('btn', 'btn-info');
            viewBtn.addEventListener('click', () => openDetailModal(comment.report_id));
            actionsCell.appendChild(viewBtn);
        });
    }

    function updatePaginationControls() {
        pageInfoSpan.textContent = `Trang ${currentPage} / ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    async function openDetailModal(reportId) {
        currentReportId = reportId;
        try {
            const response = await fetch(`/admin/api/reported-comments/${reportId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const report = await response.json();

            modalReportId.textContent = report.report_id;
            modalCommentId.textContent = report.comment_id;
            modalCommentType.textContent = report.comment_type;
            modalStoryTitle.textContent = report.story_title;
            modalChapterTitle.textContent = report.chapter_title;
            modalTargetUserProfile.textContent = report.target_user_profile;
            modalCommentContent.value = report.comment_content;
            modalCommentAuthor.textContent = report.comment_author;
            modalCommentAuthorEmail.textContent = report.comment_author_email;
            modalReporterUsername.textContent = report.reporter_username;
            modalReporterEmail.textContent = report.reporter_email;
            modalReportReason.textContent = report.report_reason;
            modalReportStatus.textContent = report.report_status;
            modalCommentStatus.textContent = report.comment_status;
            modalReportedAt.textContent = new Date(report.reported_at).toLocaleString();
            modalAdminUsername.textContent = report.admin_username || 'N/A';
            modalActionTaken.value = report.action_taken || '';

            adminReportStatusSelect.value = report.report_status;
            adminActionTakenTextarea.value = report.action_taken || '';
            adminCommentStatusSelect.value = report.comment_status;

            commentDetailModal.style.display = 'block';
        } catch (error) {
            console.error('Lỗi khi tải chi tiết báo cáo:', error);
            alert('Không thể tải chi tiết báo cáo. Vui lòng thử lại.');
        }
    }

    closeButton.addEventListener('click', () => {
        commentDetailModal.style.display = 'none';
        currentReportId = null; 
        fetchReportedComments(); 
    });

    window.addEventListener('click', (event) => {
        if (event.target === commentDetailModal) {
            commentDetailModal.style.display = 'none';
            currentReportId = null; 
            fetchReportedComments(); 
        }
    });

    applyFilterBtn.addEventListener('click', () => {
        currentSearch = searchInput.value;
        currentStatusFilter = statusFilter.value;
        currentReasonFilter = reasonFilter.value;
        currentPage = 1;
        fetchReportedComments();
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchReportedComments();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchReportedComments();
        }
    });

    saveAdminActionsBtn.addEventListener('click', async () => {
        if (!currentReportId) return;

        const newReportStatus = adminReportStatusSelect.value;
        const newActionTaken = adminActionTakenTextarea.value;
        const newCommentStatus = adminCommentStatusSelect.value;
        const commentId = modalCommentId.textContent;

        if (confirm('Bạn có chắc chắn muốn lưu các thay đổi này?')) {
            try {
                const reportResponse = await fetch(`/admin/api/reported-comments/${currentReportId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newReportStatus, action_taken: newActionTaken })
                });

                if (!reportResponse.ok) {
                    throw new Error(`HTTP error! status: ${reportResponse.status} khi cập nhật báo cáo`);
                }

                if (newCommentStatus !== modalCommentStatus.textContent) {
                    const commentResponse = await fetch(`/admin/api/comments/${commentId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newCommentStatus })
                    });
                    if (!commentResponse.ok) {
                        throw new Error(`HTTP error! status: ${commentResponse.status} khi cập nhật bình luận gốc`);
                    }
                }

                alert('Hành động admin đã được lưu thành công!');
                commentDetailModal.style.display = 'none';
                fetchReportedComments(); 
            } catch (error) {
                console.error('Lỗi khi lưu hành động admin:', error);
                alert('Có lỗi xảy ra khi lưu hành động admin. Vui lòng kiểm tra console.');
            }
        }
    });

    deleteCommentBtn.addEventListener('click', async () => {
        const commentId = modalCommentId.textContent;
        if (confirm('Bạn có chắc chắn muốn XÓA VĨNH VIỄN bình luận này? Hành động này không thể hoàn tác và sẽ xóa tất cả các báo cáo liên quan!')) {
            try {
                const response = await fetch(`/admin/api/comments/${commentId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                alert('Bình luận và các báo cáo liên quan đã được xóa vĩnh viễn!');
                commentDetailModal.style.display = 'none';
                fetchReportedComments();
            } catch (error) {
                console.error('Lỗi khi xóa bình luận:', error);
                alert('Có lỗi xảy ra khi xóa bình luận. Vui lòng kiểm tra console.');
            }
        }
    });

    deleteReportBtn.addEventListener('click', async () => {
        if (!currentReportId) return;
        if (confirm('Bạn có chắc chắn muốn XÓA BÁO CÁO này? Bình luận gốc sẽ KHÔNG bị xóa.')) {
            try {
                const response = await fetch(`/admin/api/reported-comments/${currentReportId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                alert('Báo cáo đã được xóa thành công!');
                commentDetailModal.style.display = 'none';
                fetchReportedComments();
            } catch (error) {
                console.error('Lỗi khi xóa báo cáo:', error);
                alert('Có lỗi xảy ra khi xóa báo cáo. Vui lòng kiểm tra console.');
            }
        }
    });

    fetchReportedComments();
});