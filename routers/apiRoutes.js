const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const commentController = require('../controllers/commentController');
const chapController = require('../controllers/chapController');
const multer = require('multer');
const path = require('path');

// ==================== MULTER CONFIG ====================
const storage = multer.diskStorage({
    destination: './views/public/images/',
    filename: (req, file, cb) => {
        cb(null, 'story-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
};

router.get('/', (req, res) => res.render('index'));

// ==================== STORY ====================
router.get('/stories', apiController.getStories);
router.get('/storiesbyuser', authMiddleware, apiController.getAllStoryByUserId);
router.get('/story/:id', apiController.getStory);
router.post('/story/new', authMiddleware, upload.single('thumbnail'), apiController.createStory);
router.put('/story/:id', apiController.updateStory);
router.put('/story/:id/control', apiController.updateStoryControl);
router.put('/story/:id/thumbnail', upload.single('thumbnail'), apiController.updateThumnail);
router.delete('/story/:id', apiController.deleteStory);

// ==================== CHAPTER ====================
router.get('/story/:id/chapters', chapController.getChaptersByStory);
router.post('/chapter/new', authMiddleware, chapController.createChapter);
router.get('/chapter/:id', chapController.getChapter);
router.get('/chapters/max', chapController.getMaxPageChapter);
router.put('/chapter/:id', authMiddleware, chapController.updateChapter);
router.delete('/chapter/:id', authMiddleware, chapController.deleteChapter);
router.put("/chapters/reorder", chapController.reorderChapters);
router.put('/chapter/:id/control', authMiddleware, chapController.updateChapterControl);
router.get("/story/:storyId/chapters/published", chapController.getPublishedChapterCount);
router.get("/story/:storyId/chapters/count", chapController.getAllChapterCount);

// ==================== VIEW ====================
router.post("/chapter/view", chapController.addChapterView);
router.get("/chapter/:chapterId/views", chapController.getChapterViews);
router.get("/story/:storyId/views", chapController.getStoryViews);
// ==================== VOTE ====================
router.post('/chapter/vote', chapController.toggleVote);
router.get("/chapter/:chapterId/votes", chapController.getChapterVotes);
router.get("/chapter/:chapterId/votes/user", chapController.getUserVoteStatus);
router.get('/story/:storyId/votes', chapController.getTotalStoryVotes);
// ==================== COMMENT ====================
router.get("/chapter/:chapterId/comments", commentController.getCommentsByChapter);
router.post("/chapter/comment/new", commentController.addComment);
router.put("/chapter/comment/edit", commentController.editComment);
router.delete("/chapter/comment/:commentId", commentController.deleteComment);
router.post("/chapter/comment/reply", commentController.addReply);
router.put("/chapter/comment/reply/edit", commentController.editReply);
router.delete("/chapter/comment/reply/:replyId", commentController.deleteReply);
// ==================== FOLLOW ====================
router.get("/library", authMiddleware, apiController.getLibraryStories);
router.get('/story/follow-status/:storyId', authMiddleware, apiController.getFollowStatus);
router.post('/story/follow', authMiddleware, apiController.toggleFollow);
// ==================== SEARCH ====================
router.get('/stories/search', apiController.searchStories);
router.get('/stories/category', apiController.getStoriesByCategory);

// ==================== USER ====================
router.get('/logout', apiController.logout);
router.post('/register', apiController.register);
router.post('/login', apiController.login);
router.get('/user/account-info', authMiddleware, apiController.getAccountInfo);


module.exports = router;
