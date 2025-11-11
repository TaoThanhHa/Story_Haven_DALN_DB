const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const commentController = require('../controllers/commentController');
const multer = require('multer');
const path = require('path');

// ==================== MULTER CONFIG ====================
const storage = multer.diskStorage({
    destination: path.join(__dirname, '..', 'public', 'images'),
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
router.get('/story/:id/chapters', apiController.getChaptersByStory);
router.post('/chapter/new', authMiddleware, apiController.createChapter);
router.get('/chapter/:id', apiController.getChapter);
router.get('/chapters/max', apiController.getMaxPageChapter);
router.put('/chapter/:id', authMiddleware, apiController.updateChapter);
router.delete('/chapter/:id', authMiddleware, apiController.deleteChapter);
router.put("/chapters/reorder", apiController.reorderChapters);
router.put('/chapter/:id/control', authMiddleware, apiController.updateChapterControl);
router.get("/story/:storyId/chapters/published", apiController.getPublishedChapterCount);
router.get("/story/:storyId/chapters/count", apiController.getAllChapterCount);

// ==================== VIEW ====================
router.post("/chapter/view", apiController.addChapterView);
router.get("/chapter/:chapterId/views", apiController.getChapterViews);
router.get("/story/:storyId/views", apiController.getStoryViews);
// ==================== VOTE ====================
router.post('/chapter/vote', apiController.toggleVote);
router.get("/chapter/:chapterId/votes", apiController.getChapterVotes);
router.get("/chapter/:chapterId/votes/user", apiController.getUserVoteStatus);
router.get('/story/:storyId/votes', apiController.getTotalStoryVotes);
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
router.put('/user/update-profile', authMiddleware, apiController.updateUserProfile);

//FOLLOW USER
router.get('/user/:userId/profile', apiController.getUserProfile); // Lấy profile của user bất kỳ
router.post('/user/:userId/follow', authMiddleware, apiController.toggleUserFollow); // Theo dõi/Bỏ theo dõi user
router.get('/user/:userId/following', apiController.getFollowingUsers); // Lấy danh sách đang theo dõi của user
router.get('/user/:userId/followers', apiController.getFollowersUsers); // Lấy danh sách người theo dõi của user


module.exports = router;
