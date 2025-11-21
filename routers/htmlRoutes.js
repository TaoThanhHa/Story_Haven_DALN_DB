const express = require('express');
const router = express.Router();
const path = require("path");
const storyController = require('../controllers/storyController');
const apiController = require('../controllers/apiController'); 
const mongoose = require('mongoose'); 

const authMiddleware = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

router.use((req, res, next) => {
    if (req.session.user) {
        req.user = req.session.user; 
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
router.get('/account/:userId', storyController.getUserProfile); 

router.get('/my-story', authMiddleware, storyController.getMyStory);
router.get('/login', storyController.getLogin);
router.get('/forgot_password', (req, res) => {
    res.render('forgot_password');
});
router.get('/reset-password/:token', (req, res) => {
    res.render('reset_password');
});
router.get('/register', storyController.getRegister);
router.get('/search', storyController.getSearch);
router.get('/category', storyController.getCategory);

router.get("/account/:userId/social", async (req, res) => {
    try {
        const { userId } = req.params;
        const loggedInUser = req.user;
        const currentUserId = loggedInUser ? loggedInUser._id : null;


        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).render('404', { message: "User ID không hợp lệ." });
        }

        const result = await apiController._fetchUserProfileData(userId, currentUserId);

        if (!result.success || !result.user) {
            return res.status(result.statusCode || 404).render('404', { message: result.message || "Không tìm thấy người dùng hoặc lỗi khi tải profile." });
        }

        res.render("social", { 
            user: result.user, 
            loggedInUser: loggedInUser,
            currentTab: req.query.tab || 'followers'
        });

    } catch (err) {
        console.error("Lỗi khi tải trang social:", err);
        res.status(500).render('404', { message: "Lỗi server khi tải trang social: " + err.message });
    }
});

router.use((req, res) => {
  res.status(404).render("404");
});

module.exports = router;