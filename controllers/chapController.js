const Story = require("../models/Story");
const Chapter = require("../models/Chapter");
const ChapterView = require("../models/ChapterView");
const ChapterVote = require("../models/ChapterVote");
const ReadingProgress = require("../models/ReadingProgress");
const mongoose = require("mongoose");

const chapController = {

  // ==================== CHAPTER ====================
  getChaptersByStory: async (req, res) => {
    try {
      const storyId = req.params.id;
      const chapters = await Chapter.find({ storyId }).sort({ chapter_number: 1 });
      res.status(200).json({ success: true, chapters });
    } catch (err) {
      console.error("❌ getChaptersByStory:", err);
      res.status(500).json({ success: false, error: "Database error" });
    }
  },

createChapter: async (req, res) => {
  try {
    const { storyId, title, content } = req.body;
    if (!storyId || !title || !content)
      return res.status(400).json({ error: "Thiếu dữ liệu đầu vào!" });

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ error: "Không tìm thấy truyện!" });
    if (story.status === "completed")
      return res.status(403).json({ error: "Truyện đã hoàn thành, không thể thêm chương!" });

    // Lấy số chapter_number lớn nhất hiện có (nếu muốn)
    const lastChapter = await Chapter.findOne({ storyId }).sort({ chapter_number: -1 }).lean();
    const nextNumber = lastChapter ? lastChapter.chapter_number + 1 : 1;

    const newChapter = new Chapter({ storyId, title, content, chapter_number: nextNumber });
    await newChapter.save();

    return res.status(201).json({ success: true, chapter: newChapter });

  } catch (err) {
    console.error("addChapter:", err);
    res.status(500).json({ success: false, error: "Lỗi khi thêm chương" });
  }
},

  updateChapter: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, chapter_number } = req.body;
      await Chapter.findByIdAndUpdate(id, {
        title,
        content,
        chapter_number,
      });
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("updateChapter:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  updateChapterControl: async (req, res) => {
    try {
      const { id } = req.params;
      const { control } = req.body;

      await Chapter.findByIdAndUpdate(id, { control });
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("updateChapterControl:", err);
      res.status(500).json({ success: false, error: "Database error" });
    }
  },

  deleteChapter: async (req, res) => {
    try {
      const { id } = req.params;

      const chapterToDelete = await Chapter.findById(id);
      if (!chapterToDelete) {
        return res.status(404).json({ success: false, message: "Không tìm thấy chương" });
      }

      const { storyId, chapter_number } = chapterToDelete;

      await Chapter.findByIdAndDelete(id);

      await Chapter.updateMany(
        { storyId, chapter_number: { $gt: chapter_number } },
        { $inc: { chapter_number: -1 } }
      );

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("deleteChapter:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  getChapter: async (req, res) => {
    try {
      const { id } = req.params;
      const chapter = await Chapter.findById(id);
      if (!chapter) return res.status(404).end();
      res.status(200).json(chapter);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },

  getMaxPageChapter: async (req, res) => {
    try {
      const { storyId } = req.query;
      const lastChapter = await Chapter.find({ storyId })
        .sort({ chapter_number: -1 })
        .limit(1);
      const maxChapter = lastChapter[0]?.chapter_number || 0;
      res.status(200).json({ maxChapter });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },

  // Cập nhật lại thứ tự chương (drag & drop)
  reorderChapters: async (req, res) => {
    try {
      const { storyId, newOrder } = req.body; 
      // newOrder là mảng [{chapterId, chapter_number}, ...]

      if (!storyId || !Array.isArray(newOrder))
        return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });

      for (const item of newOrder) {
        await Chapter.findByIdAndUpdate(item.chapterId, {
          chapter_number: item.chapter_number,
        });
      }

      res.json({ success: true, message: "Đã cập nhật thứ tự chương" });
    } catch (err) {
      console.error("reorderChapters:", err);
      res.status(500).json({ success: false, error: "Lỗi khi cập nhật thứ tự chương" });
    }
  },

  // ==================== VIEW & VOTE ====================
  addChapterView: async (req, res) => {
    try {
      const { chapterId } = req.body;
      const userId = req.session.user ? req.session.user._id : null;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      if (!chapterId) return res.status(400).json({ error: "Thiếu chapterId" });

      // Tạo record view mới (tính mọi lần đọc)
      await ChapterView.create({
        user_id: userId,
        ip_address: ip,
        chapter_id: chapterId,
      });

      // Cập nhật số view tổng cho Chapter
      const totalViews = await ChapterView.countDocuments({ chapter_id: chapterId });
      await Chapter.findByIdAndUpdate(chapterId, { views: totalViews });

      res.status(200).json({ success: true, views: totalViews });
    } catch (err) {
      console.error("addChapterView:", err);
      res.status(500).json({ error: "Lỗi server khi ghi lượt xem" });
    }
  },

  // 📊 Lấy tổng lượt xem 1 chapter
  getChapterViews: async (req, res) => {
    try {
      const { chapterId } = req.params;
      const count = await ChapterView.countDocuments({ chapter_id: chapterId });
      res.status(200).json({ views: count });
    } catch (err) {
      console.error("getChapterViews:", err);
      res.status(500).json({ error: "Không thể lấy số lượt xem" });
    }
  },

  // 📊 Lấy tổng lượt xem tất cả chapter của 1 story
  getStoryViews: async (req, res) => {
    try {
      const { storyId } = req.params;
      const chapters = await Chapter.find({ storyId }).select("_id");
      const chapterIds = chapters.map(ch => ch._id);
      const totalViews = await ChapterView.countDocuments({ chapter_id: { $in: chapterIds } });
      res.status(200).json({ total_views: totalViews });
    } catch (err) {
      console.error("getStoryViews:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

 // === TOGGLE VOTE ===
  toggleVote: async (req, res) => {
    try {
      const { chapterId } = req.body;
      const userId = req.session.user ? req.session.user._id : null;

      console.log("🔍 vote request:", { userId, chapterId });

      if (!userId) return res.status(401).json({ error: "Bạn cần đăng nhập để vote." });
      if (!chapterId) return res.status(400).json({ error: "Thiếu ID chương." });

      const chapterExists = await Chapter.findById(chapterId);
      if (!chapterExists) return res.status(404).json({ error: "Chương không tồn tại." });

      const existingVote = await ChapterVote.findOne({ userId, chapterId });

      if (existingVote) {
        await ChapterVote.deleteOne({ _id: existingVote._id });
        const totalVotes = await ChapterVote.countDocuments({ chapterId });
        await Chapter.findByIdAndUpdate(chapterId, { votes: totalVotes });
        return res.json({ message: "Đã bỏ vote", voted: false, totalVotes });
      } else {
        await ChapterVote.create({ userId, chapterId });
        const totalVotes = await ChapterVote.countDocuments({ chapterId });
        await Chapter.findByIdAndUpdate(chapterId, { votes: totalVotes });
        return res.json({ message: "Vote thành công!", voted: true, totalVotes });
      }
    } catch (err) {
      console.error("toggleVote error:", err);
      return res.status(500).json({ error: "Lỗi server khi xử lý vote." });
    }
  },

  // === KIỂM TRA VOTE CỦA USER ===
  getUserVoteStatus: async (req, res) => {
    try {
      const userId = req.session.user ? (req.session.user._id || req.session.user._id) : null;
      const { chapterId } = req.params;

      if (!userId) return res.status(200).json({ voted: false });
      if (!chapterId) return res.status(400).json({ error: "Thiếu chapterId." });

      const existing = await ChapterVote.findOne({ userId, chapterId });
      res.status(200).json({ voted: !!existing });
    } catch (err) {
      console.error("getUserVoteStatus:", err);
      res.status(500).json({ error: "Không thể kiểm tra vote." });
    }
  },

  // === LẤY TỔNG VOTE CHƯƠNG ===
  getChapterVotes: async (req, res) => {
    try {
      const { chapterId } = req.params;
      const totalVotes = await ChapterVote.countDocuments({ chapterId });
      res.status(200).json({ total_votes: totalVotes });
    } catch (err) {
      console.error("getChapterVotes:", err);
      res.status(500).json({ error: "Không thể lấy tổng vote." });
    }
  },

    // ===================== TỔNG VOTE CỦA TRUYỆN =====================
    getTotalStoryVotes: async (req, res) => {
    try {
        const { storyId } = req.params;
        if (!storyId) return res.status(400).json({ error: "Thiếu storyId" });

        // Ép kiểu storyId về ObjectId để match trong Mongo
        const storyObjectId = new mongoose.Types.ObjectId(storyId);

        // Lấy tất cả chương thuộc truyện
        const chapters = await Chapter.find({ storyId: storyObjectId }).select("_id").lean();
        if (!chapters.length) return res.json({ total_votes: 0 });

        const chapterIds = chapters.map(ch => ch._id);

        // Đếm tổng vote từ ChapterVote
        const totalVotes = await ChapterVote.countDocuments({ chapterId: { $in: chapterIds } });

        return res.json({ total_votes: totalVotes });
    } catch (err) {
        console.error("getTotalStoryVotes:", err);
        return res.status(500).json({ error: "Lỗi server khi lấy tổng vote." });
    }
    },

    // ✅ Đếm chapter đã đăng (control = 1)
    getPublishedChapterCount: async (req, res) => {
    try {
        const { storyId } = req.params;
        const count = await Chapter.countDocuments({ storyId, control: 1 });
        res.status(200).json({ total_chapters: count });
    } catch (err) {
        console.error("getPublishedChapterCount:", err);
        res.status(500).json({ error: "Lỗi server" });
    }
    },

    // ✅ Đếm cả đã đăng & bản thảo
    getAllChapterCount: async (req, res) => {
    try {
        const { storyId } = req.params;
        const published = await Chapter.countDocuments({ storyId, control: 1 });
        const draft = await Chapter.countDocuments({ storyId, control: 0 });

        res.status(200).json({
        published,
        draft,
        total: published + draft
        });
    } catch (err) {
        console.error("getAllChapterCount:", err);
        res.status(500).json({ error: "Lỗi server" });
    }
    },

  updateLastRead: async (req, res) => {
    try {
      if (!req.session.user)
        return res.status(401).json({ success: false });

      const { storyId, chapterId } = req.body;

      await ReadingProgress.findOneAndUpdate(
        { userId: req.session.user._id, storyId },
        { chapterId, lastRead: Date.now() },
        { upsert: true }
      );

      res.json({ success: true });
    } catch (err) {
      console.error("updateLastRead error:", err);
      res.json({ success: false });
    }
  },

  getContinueChapter: async (req, res) => {
    try {
      if (!req.session.user)
        return res.status(200).json({ loggedIn: false, chapterId: null });

      const { storyId } = req.params;

      const progress = await ReadingProgress.findOne({
        userId: req.session.user._id,
        storyId
      });

      res.json({
        loggedIn: true,
        chapterId: progress ? progress.chapterId : null
      });
    } catch (err) {
      console.error("getContinueChapter error:", err);
      res.json({ loggedIn: true, chapterId: null });
    }
  },

};

module.exports = chapController;
