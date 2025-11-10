const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true },
    title: { type: String, required: true },
    chapter_number: { type: Number, required: true },
    content: { type: String, required: true },
    control: { type: Number, default: 0 }, 
    views: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    votedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// 🧠 Tự động set số chương khi thêm mới
chapterSchema.pre("save", async function (next) {
  if (this.isNew) {
    const Chapter = mongoose.model("Chapter");
    const maxChapter = await Chapter.findOne({ storyId: this.storyId })
      .sort({ chapter_number: -1 })
      .select("chapter_number");
    this.chapter_number = maxChapter ? maxChapter.chapter_number + 1 : 1;
  }
  next();
});

// 🧹 Dồn lại số thứ tự sau khi xóa
chapterSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const Chapter = mongoose.model("Chapter");
    const chapters = await Chapter.find({ storyId: doc.storyId }).sort({ chapter_number: 1 });
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].chapter_number !== i + 1) {
        chapters[i].chapter_number = i + 1;
        await chapters[i].save();
      }
    }
  }
});

const Chapter = mongoose.model("Chapter", chapterSchema);
module.exports = Chapter;
