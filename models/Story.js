const mongoose = require("../configs/mongoConnect");

const storySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  thumbnail: String,
  views: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  control: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true }, 
  status: { type: String, enum: ['writing', 'completed'], default: 'writing' },
  visibility: { type: String, enum: ["public", "hidden"],default: "public" },
}, { timestamps: true });

module.exports = mongoose.model("Story", storySchema);
