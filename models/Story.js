const mongoose = require("../configs/mongoConnect");

const storySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  thumbnail: String,
  views: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  control: { type: Number, default: 0 }, // 0: draft, 1: published
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true }, // ← thêm required để tránh null
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Story", storySchema);
