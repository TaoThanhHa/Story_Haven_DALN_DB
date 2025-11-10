const express = require('express');
const router = express.Router();
const path = require("path"); 
const storyController = require('../controllers/storyController');

// Middleware xác thực session
const authMiddleware = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// ========== Routes cho giao diện người dùng ==========
router.get('/', storyController.getIndex);
router.get('/library', authMiddleware, storyController.getLibrary);

router.get('/story/new', authMiddleware, storyController.getNewStory);
router.get('/story/edit', authMiddleware, storyController.getEditStory);
router.get('/story/:id', storyController.getDetailStory);
router.get('/story/:id/chapter/:chapterId', storyController.getChapter);

router.get('/create-chapter', authMiddleware, storyController.createChapter);
router.get('/editchapter', authMiddleware, storyController.getEditChapter);

router.get('/my-story', authMiddleware, storyController.getMyStory);
router.get('/login', storyController.getLogin);
router.get('/register', storyController.getRegister);
router.get('/account', authMiddleware, storyController.getAccount);
router.get('/search', storyController.getSearch);
router.get('/category', storyController.getCategory);
router.use((req, res) => {
  res.status(404).render("404"); 
});


module.exports = router;
