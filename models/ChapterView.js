const mongoose = require("mongoose");

const chapterViewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  chapter_id: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", required: true },
  ip_address: { type: String }, 
  viewed_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChapterView", chapterViewSchema);
