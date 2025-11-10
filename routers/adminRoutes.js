const express = require('express');
const router = express.Router();
const authController = require('../controllers/apiController');
const authMiddleware = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

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
    pageCss: 'dmin_comments.css',    // nếu có css riêng
    pageJs: 'dmin_comments.js' 
  });
});

// 🔹 Các API admin
router.get('/api/users', adminController.getUsers);
router.get('/api/users/:id', adminController.getUserById);
router.put('/api/users/:id', adminController.updateUser);
router.put('/api/users/:id/status', adminController.updateUserStatus);
router.delete('/api/users/:id', adminController.deleteUser);

module.exports = router;
