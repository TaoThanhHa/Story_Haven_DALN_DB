const mongoose = require("mongoose");

const FollowSchema = new mongoose.Schema({
  userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
  storyId: {type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true},
  lastRead: {type: Date,default: Date.now}
});

FollowSchema.index({ userId: 1, storyId: 1 }, { unique: true });

module.exports = mongoose.model("Follow", FollowSchema);
