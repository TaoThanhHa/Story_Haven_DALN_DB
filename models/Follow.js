const mongoose = require("../configs/mongoConnect");

const followSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  story_id: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true },
  created_at: { type: Date, default: Date.now },
});

followSchema.index({ user_id: 1, story_id: 1 }, { unique: true });

module.exports = mongoose.model("Follow", followSchema);
