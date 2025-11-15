// routes/reading.js
const express = require("express");
const router = express.Router();
const ReadingProgress = require("../models/ReadingProgress");

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
};

router.get('/', (req, res) => res.render('index'));
// Lưu hoặc cập nhật tiến độ
router.post("/save", authMiddleware, async (req, res) => {
    const { storyId, chapterId } = req.body;
    try {
        const progress = await ReadingProgress.findOneAndUpdate(
            { userId: req.user._id, storyId },
            { chapterId, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json({ success: true, progress });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Không thể lưu tiến độ" });
    }
});

// Lấy chương gần nhất người dùng đọc
router.get("/:storyId", authMiddleware, async (req, res) => {
    try {
        const progress = await ReadingProgress.findOne({
            userId: req.user._id,
            storyId: req.params.storyId
        });
        res.json({ chapterId: progress?.chapterId || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Không thể lấy tiến độ đọc" });
    }
});

module.exports = router;
