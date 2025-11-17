const express = require('express');
const router = express.Router();
const path = require("path");
const storyController = require('../controllers/storyController');
const apiController = require('../controllers/apiController'); // Đảm bảo đường dẫn đúng
const mongoose = require('mongoose'); // Đảm bảo đã require mongoose

// Middleware xác thực session
const authMiddleware = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// Middleware để gắn user vào req.user nếu có session (dùng cho việc kiểm tra đăng nhập trên client)
// Đây là một cách để PassportJS thường làm, nếu bạn không dùng Passport, bạn cần làm thủ công
router.use((req, res, next) => {
    if (req.session.user) {
        req.user = req.session.user; // Gắn thông tin user từ session vào req.user
    }
    next();
});

// ========== Routes cho giao diện người dùng ==========
router.get('/', storyController.getIndex);
router.get('/library', authMiddleware, storyController.getLibrary);

router.get('/story/new', authMiddleware, storyController.getNewStory);
router.get('/story/edit', authMiddleware, storyController.getEditStory);
router.get('/story/:id', storyController.getDetailStory);
router.get('/story/:id/chapter/:chapterId', storyController.getChapter);

router.get('/create-chapter', authMiddleware, storyController.createChapter);
router.get('/editchapter', authMiddleware, storyController.getEditChapter);

router.get('/account', authMiddleware, storyController.getAccount);
router.get('/account/:userId', storyController.getUserProfile); // Có thể trùng lặp hoặc cần xem xét lại với route social

router.get('/my-story', authMiddleware, storyController.getMyStory);
router.get('/login', storyController.getLogin);
router.get('/forgot_password', (req, res) => {
    res.render('forgot_password');
});
router.get('/reset-password/:token', (req, res) => {
    res.render('reset_password');
});
router.get('/register', storyController.getRegister);
// router.get('/account', authMiddleware, storyController.getAccount); // Dòng này trùng lặp, có thể xóa
router.get('/search', storyController.getSearch);
router.get('/category', storyController.getCategory);

// THÊM ROUTE MỚI CHO TRANG SOCIAL VÀO ĐÂY
router.get("/account/:userId/social", async (req, res) => {
    try {
        const { userId } = req.params;
        // Kiểm tra loggedInUser từ req.user (được gắn bởi middleware ở trên)
        const loggedInUser = req.user;
        const currentUserId = loggedInUser ? loggedInUser._id : null;


        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).render('404', { message: "User ID không hợp lệ." });
        }

        // Gọi hàm helper từ apiController để lấy dữ liệu user đã populate
        // Giả sử apiController._fetchUserProfileData đã được định nghĩa và export đúng cách
        // Nếu không, bạn cần điều chỉnh cách này hoặc đưa logic vào đây
        const result = await apiController._fetchUserProfileData(userId, currentUserId);

        if (!result.success || !result.user) {
            return res.status(result.statusCode || 404).render('404', { message: result.message || "Không tìm thấy người dùng hoặc lỗi khi tải profile." });
        }

        // Render trang social.ejs và truyền dữ liệu user đã populate
        // ĐẢM BẢO ĐƯỜNG DẪN ĐẾN SOCIAL.EJS LÀ CHÍNH XÁC
        res.render("social", { // Sửa đường dẫn render
            user: result.user, // user đã populate đầy đủ followers và following
            loggedInUser: loggedInUser, // Thông tin người dùng đang đăng nhập (hoặc null nếu chưa đăng nhập)
            currentTab: req.query.tab || 'followers' // Truyền tab hiện tại để JS client có thể chọn đúng tab
        });

    } catch (err) {
        console.error("Lỗi khi tải trang social:", err);
        // Render trang lỗi và truyền thông báo lỗi
        res.status(500).render('404', { message: "Lỗi server khi tải trang social: " + err.message });
    }
});

router.use((req, res) => {
  res.status(404).render("404");
});

module.exports = router;