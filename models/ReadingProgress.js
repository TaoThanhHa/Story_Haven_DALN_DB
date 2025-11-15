// models/ReadingProgress.js
const mongoose = require("mongoose");

const ReadingProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true },
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ReadingProgress", ReadingProgressSchema);
