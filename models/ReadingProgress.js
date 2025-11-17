const mongoose = require("mongoose");

const readingProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true },
  lastRead: { type: Date, default: Date.now },
}, { timestamps: true });

readingProgressSchema.index({ userId: 1, storyId: 1 }, { unique: true });

module.exports = mongoose.model("ReadingProgress", readingProgressSchema);
