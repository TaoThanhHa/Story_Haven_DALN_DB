const express = require('express');
const router = express.Router();
const path = require("path");
const storyController = require('../controllers/storyController');

// Middleware xác thực session
const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
        // Lưu URL gốc để người dùng có thể quay lại sau khi đăng nhập
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
    next();
};

// ========== Routes cho giao diện người dùng ==========

// Trang chủ
router.get('/', storyController.getIndex);

// Đăng nhập / Đăng ký
router.get('/login', storyController.getLogin);
router.get('/register', storyController.getRegister);

// Route cho profile của người dùng đang đăng nhập (có authMiddleware)
// Đây là route cụ thể cho người dùng đang xem profile của chính họ
router.get('/account', authMiddleware, storyController.getAccount);

// Route cho profile của người dùng bất kỳ
router.get('/account/:userId', storyController.getUserProfile); // Bạn cần tạo storyController.getUserProfile để lấy thông tin user từ DB

// Thư viện cá nhân
router.get('/library', authMiddleware, storyController.getLibrary);

// Tạo/Sửa truyện
router.get('/story/new', authMiddleware, storyController.getNewStory);
router.get('/story/edit/:id', authMiddleware, storyController.getEditStory); // Thêm :id để biết sửa truyện nào

// Chi tiết truyện và chapter
// Đặt các route cụ thể hơn lên trước
router.get('/story/:id/chapter/:chapterId', storyController.getChapter);
router.get('/story/:id', storyController.getDetailStory);


// Tạo/Sửa chapter
router.get('/create-chapter/:storyId', authMiddleware, storyController.createChapter); 
router.get('/editchapter/:chapterId', authMiddleware, storyController.getEditChapter); 

// Truyện của tôi
router.get('/my-story', authMiddleware, storyController.getMyStory);

// Tìm kiếm
router.get('/search', storyController.getSearch);

// Thể loại
router.get('/category', storyController.getCategory);

// Middleware xử lý 404 - Luôn đặt cuối cùng
router.use((req, res) => {
    res.status(404).render("404");
});

module.exports = router;