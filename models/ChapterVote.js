const mongoose = require("mongoose");

const ChapterVoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true },
  createdAt: { type: Date, default: Date.now }
});

ChapterVoteSchema.index({ chapterId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("ChapterVote", ChapterVoteSchema);
