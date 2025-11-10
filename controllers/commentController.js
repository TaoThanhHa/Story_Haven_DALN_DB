const Comment = require("../models/Comment");

const commentController = {

  // ==================== GET COMMENTS ====================
  getCommentsByChapter: async (req, res) => {
    try {
      const { chapterId } = req.params;
      const comments = await Comment.find({ chapterId })
        .populate("userId", "username avatar _id")
        .populate("replies.userId", "username avatar _id")
        .sort({ createdAt: 1 });

      res.status(200).json({ success: true, comments });
    } catch (err) {
      console.error("getCommentsByChapter:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  // ==================== ADD COMMENT ====================
  addComment: async (req, res) => {
    try {
      const { chapterId, content } = req.body;
      if (!chapterId || !content)
        return res.status(400).json({ error: "chapterId và content không được để trống" });

      const userId = req.session.user._id;

      const comment = new Comment({ chapterId, userId, content });
      await comment.save();

      const populatedComment = await comment.populate("userId", "username avatar _id");
      res.status(200).json({ success: true, comment: populatedComment });
    } catch (err) {
      console.error("addComment:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  // ==================== ADD REPLY ====================
  addReply: async (req, res) => {
    try {
      const { commentId, content } = req.body;
      if (!content) return res.status(400).json({ error: "Content không được để trống" });

      const userId = req.session.user._id;
      const comment = await Comment.findById(commentId);
      if (!comment) return res.status(404).json({ error: "Comment không tồn tại" });

      comment.replies.push({ userId, content });
      await comment.save();

      const reply = comment.replies[comment.replies.length - 1];
      await reply.populate("userId", "username avatar _id");
      res.status(200).json({ success: true, reply });
    } catch (err) {
      console.error("addReply:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  // ==================== EDIT COMMENT ====================
  editComment: async (req, res) => {
    try {
      const { commentId, content } = req.body;
      const userId = req.session.user._id;

      const comment = await Comment.findById(commentId);
      if (!comment) return res.status(404).json({ error: "Comment không tồn tại" });
      if (comment.userId.toString() !== userId) return res.status(403).json({ error: "Không có quyền" });

      comment.content = content;
      await comment.save();

      res.status(200).json({ success: true, comment });
    } catch (err) {
      console.error("editComment:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  // ==================== DELETE COMMENT ====================
  deleteComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.session.user._id;

      const comment = await Comment.findById(commentId);
      if (!comment) return res.status(404).json({ error: "Comment không tồn tại" });
      if (comment.userId.toString() !== userId) return res.status(403).json({ error: "Không có quyền" });

      await Comment.findByIdAndDelete(commentId);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("deleteComment:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  // ==================== EDIT REPLY ====================
  editReply: async (req, res) => {
    try {
      const { replyId, content } = req.body;
      const userId = req.session.user._id;

      const comment = await Comment.findOne({ "replies._id": replyId });
      if (!comment) return res.status(404).json({ error: "Reply không tồn tại" });

      const reply = comment.replies.id(replyId);
      if (reply.userId.toString() !== userId) return res.status(403).json({ error: "Không có quyền" });

      reply.content = content;
      await comment.save();

      res.status(200).json({ success: true, reply });
    } catch (err) {
      console.error("editReply:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  // ==================== DELETE REPLY ====================
  deleteReply: async (req, res) => {
    try {
      const { replyId } = req.params;
      const userId = req.session.user._id;

      const comment = await Comment.findOne({ "replies._id": replyId });
      if (!comment) return res.status(404).json({ error: "Reply không tồn tại" });

      const reply = comment.replies.id(replyId);
      if (!reply) return res.status(403).json({ error: "Không có quyền" });

      comment.replies.pull(replyId);
      await comment.save();

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("deleteReply:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

};

module.exports = commentController;
