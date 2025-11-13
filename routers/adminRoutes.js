const express = require('express');
const router = express.Router();
const authController = require('../controllers/apiController'); // Hoặc controller chứa logic login/logout
const authMiddleware = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController'); // <-- Controller chứa các hàm admin

// 🔹 Login page (GET)
router.get('/login', (req, res) => {
  res.render('login_admin', { title: 'Đăng nhập Admin' });
});

// 🔹 Login (POST)
router.post('/login', authController.login);

// 🔹 Logout
router.post('/logout', authController.logout);

// 🔹 Middleware bảo vệ các route admin
router.use(authMiddleware.isAdmin);

// 🔹 Dashboard
router.get('/dashboard', (req, res) => {
  res.render('admin_layout', {
    pageTitle: 'Dashboard Admin',
    user: req.session.user,
    pageBody: 'admin_dashboard', // admin_dashboard.ejs
    pageCss: 'admin_dashboard.css',    // nếu có css riêng
    pageJs: 'admin_dashboard.js'       // nếu có js riêng
  });
});

// 🔹 Quản lý Users
router.get('/users', (req, res) => {
  res.render('admin_layout', {
    pageTitle: 'Quản lý Người dùng',
    user: req.session.user,
    pageBody: 'admin_users',    // admin_users.ejs
    pageCss: 'admin_users.css',    // nếu có css riêng
    pageJs: 'admin_users.js'
  });
});

// 🔹 Quản lý Stories
router.get('/stories', (req, res) => {
  res.render('admin_layout', {
    pageTitle: 'Quản lý Truyện',
    user: req.session.user,
    pageBody: 'admin_stories',  // admin_stories.ejs
    pageCss: 'admin_stories.css',    // nếu có css riêng
    pageJs: 'admin_stories.js'
  });
});

// 🔹 Quản lý Comments
router.get('/comments', (req, res) => {
  res.render('admin_layout', {
    pageTitle: 'Quản lý Bình luận',
    user: req.session.user,
    pageBody: 'admin_comments', // admin_comments.ejs
    pageCss: 'admin_comments.css', // Chú ý: bạn đang để dmin_comments.css
    pageJs: 'admin_comments.js' // Chú ý: bạn đang để dmin_comments.js
  });
});

// 🔹 Các API admin
router.get('/api/users', adminController.getUsers);
router.get('/api/users/:id', adminController.getUserById);
router.put('/api/users/:id', adminController.updateUser);
router.put('/api/users/:id/status', adminController.updateUserStatus);
router.delete('/api/users/:id', adminController.deleteUser);

// <-- THÊM CÁC ROUTE API CHO STORIES VÀ CATEGORIES TẠI ĐÂY -->
router.get('/api/stories', adminController.getStories);
router.get('/api/stories/:id', adminController.getStoryById);
router.put('/api/stories/:id', adminController.updateStory);
router.delete('/api/stories/:id', adminController.deleteStory);
router.get('/api/story-categories', adminController.getUniqueStoryCategories);

//Dashboard
router.get('/api/dashboard/stats', adminController.getDashboardStats);

// === API ROUTES CHO ADMIN - COMMENTS ===
router.get('/api/reported-comments', adminController.getReportedComments); // Lấy danh sách bình luận bị báo cáo
router.get('/api/reported-comments/:id', adminController.getReportedCommentById); // Lấy chi tiết một báo cáo bình luận
router.put('/api/reported-comments/:id/status', adminController.updateReportedCommentStatus); // Cập nhật trạng thái xử lý báo cáo
router.put('/api/comments/:id/status', adminController.updateCommentStatus); // Cập nhật trạng thái của bình luận gốc (ẩn/hiển thị)
router.delete('/api/comments/:id', adminController.deleteComment); // Xóa bình luận gốc và các báo cáo liên quan
router.delete('/api/reported-comments/:id', adminController.deleteReportedComment); // Xóa một báo cáo cụ thể

module.exports = router;