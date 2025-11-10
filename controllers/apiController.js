const bcrypt = require("bcrypt");
const Story = require("../models/Story");
const Chapter = require("../models/Chapter");
const ChapterView = require("../models/ChapterView");
const Follow = require("../models/Follow");
const User = require("../models/User");
const ChapterVote = require("../models/ChapterVote");
const mongoose = require("mongoose");

const apiController = {

  // ==================== STORY ====================
  getStories: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;  // Trang hiện tại
      const limit = 12;                            // Mỗi trang 12 truyện
      const skip = (page - 1) * limit;

      const [stories, total] = await Promise.all([
        Story.find({ control: true })
          .populate("userId", "username email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Story.countDocuments({ control: true })
      ]);

      res.status(200).json({
        success: true,
        stories,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("getStories:", err);
      res.status(500).json({ error: "Không thể tải danh sách truyện" });
    }
  },

  getStory: async (req, res) => {
    try {
      const storyId = req.params.id;

      if (!storyId || !mongoose.Types.ObjectId.isValid(storyId)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      const story = await Story.findById(storyId).populate("userId", "username email");
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      const chapters = await Chapter.find({ storyId: story._id })
        .sort({ chapter_number: 1 })
        .lean();

      res.status(200).json({
        success: true,
        story,
        chapters,
      });
    } catch (err) {
      console.error("getStory error:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  createStory: async (req, res) => {
    try {
      if (!req.session.user)
        return res.status(401).json({ error: "Unauthorized" });

      const { title, description, category, status, control } = req.body;
      const thumbnail = req.file ? `/images/${req.file.filename}` : null;

      const storyData = {
        title,
        description,
        category,
        thumbnail,
        status: status || "writing",
        control: Number(control) || 0,
        userId: req.session.user._id,
        username: req.session.user.username,
      };

      const newStory = await Story.create(storyData);
      res.status(200).json({ success: true, storyId: newStory._id });
    } catch (err) {
      console.error("createStory:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  updateThumnail: async (req, res) => {
    try {
      const storyId = req.params.id;
      const thumbnail = req.file ? `/images/${req.file.filename}` : null;
      await Story.findByIdAndUpdate(storyId, { thumbnail });
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },

  deleteStory: async (req, res) => {
    try {
      const storyId = req.params.id;
      await Story.findByIdAndDelete(storyId);
      await Chapter.deleteMany({ storyId });
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("deleteStory:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  updateStoryControl: async (req, res) => {
    try {
      const { id } = req.params;
      const { control } = req.body;
      if (control === undefined)
        return res.status(400).json({ error: "Thiếu control" });
      await Story.findByIdAndUpdate(id, { control });
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("updateStoryControl:", err);
      res.status(500).json({ error: "Lỗi máy chủ" });
    }
  },

  updateStory: async (req, res) => {
    try {
      const { id } = req.params;
      const story = await Story.findByIdAndUpdate(id, req.body, { new: true });
      if (!story) return res.status(404).json({ success: false, message: "Không tìm thấy truyện!" });
      res.status(200).json({ success: true, story });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật truyện!" });
    }
  },

  getAllStoryByUserId: async (req, res) => {
    try {
      if (!req.session.user)
        return res.status(401).json({ error: "Unauthorized" });
      const stories = await Story.find({ userId: req.session.user._id })
        .populate("userId", "username email");
      res.status(200).json(stories);
    } catch (err) {
      console.error("getAllStoryByUserId:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  searchStories: async (req, res) => {
    try {
      const { title } = req.query;
      if (!title) return res.status(400).json({ error: "Thiếu từ khóa" });
      const stories = await Story.find({ title: { $regex: title, $options: "i" } });
      res.status(200).json(stories);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },

  // 📚 Lấy truyện theo thể loại
  getStoriesByCategory: async (req, res) => {
    try {
      const { category } = req.query;
      if (!category) {
        return res.status(400).json({ error: "Thiếu category" });
      }

      // ✅ Tìm truyện có chứa thể loại đó trong chuỗi category
      const stories = await Story.find({
        category: { $regex: category, $options: "i" },
        control: 1,
      })
        .populate("userId", "username email")
        .sort({ createdAt: -1 });


      if (!stories || stories.length === 0) {
        return res.status(200).json([]);
      }

      res.status(200).json(stories);
    } catch (err) {
      console.error("getStoriesByCategory:", err);
      res.status(500).json({ error: "Không thể tải danh sách truyện theo thể loại" });
    }
  },

  // ==================== CHAPTER ====================
  getChaptersByStory: async (req, res) => {
    try {
      const storyId = req.params.id;
      const chapters = await Chapter.find({ storyId }).sort({ chapter_number: 1 });
      res.status(200).json({ success: true, chapters });
    } catch (err) {
      console.error("❌ getChaptersByStory:", err);
      res.status(500).json({ success: false, error: "Database error" });
    }
  },

  createChapter: async (req, res) => {
  try {
    const { storyId, title, content } = req.body;

    // Lấy số chương lớn nhất hiện có
    const lastChapter = await Chapter.findOne({ storyId })
      .sort({ chapter_number: -1 })
      .lean();

    const nextNumber = lastChapter ? lastChapter.chapter_number + 1 : 1;

    const newChapter = new Chapter({
      storyId,
      title,
      content,
      chapter_number: nextNumber,
    });

    await newChapter.save();

    res.status(201).json({ success: true, chapter: newChapter });
  } catch (err) {
    console.error("addChapter:", err);
    res.status(500).json({ success: false, error: "Lỗi khi thêm chương" });
  }
  },

  updateChapter: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, chapter_number } = req.body;
      await Chapter.findByIdAndUpdate(id, {
        title,
        content,
        chapter_number,
      });
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("updateChapter:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  updateChapterControl: async (req, res) => {
    try {
      const { id } = req.params;
      const { control } = req.body;

      await Chapter.findByIdAndUpdate(id, { control });
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("updateChapterControl:", err);
      res.status(500).json({ success: false, error: "Database error" });
    }
  },

  deleteChapter: async (req, res) => {
    try {
      const { id } = req.params;

      const chapterToDelete = await Chapter.findById(id);
      if (!chapterToDelete) {
        return res.status(404).json({ success: false, message: "Không tìm thấy chương" });
      }

      const { storyId, chapter_number } = chapterToDelete;

      await Chapter.findByIdAndDelete(id);

      await Chapter.updateMany(
        { storyId, chapter_number: { $gt: chapter_number } },
        { $inc: { chapter_number: -1 } }
      );

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("deleteChapter:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  getChapter: async (req, res) => {
    try {
      const { id } = req.params;
      const chapter = await Chapter.findById(id);
      if (!chapter) return res.status(404).end();
      res.status(200).json(chapter);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },

  getMaxPageChapter: async (req, res) => {
    try {
      const { storyId } = req.query;
      const lastChapter = await Chapter.find({ storyId })
        .sort({ chapter_number: -1 })
        .limit(1);
      const maxChapter = lastChapter[0]?.chapter_number || 0;
      res.status(200).json({ maxChapter });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },

  // Cập nhật lại thứ tự chương (drag & drop)
  reorderChapters: async (req, res) => {
    try {
      const { storyId, newOrder } = req.body; 
      // newOrder là mảng [{chapterId, chapter_number}, ...]

      if (!storyId || !Array.isArray(newOrder))
        return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });

      for (const item of newOrder) {
        await Chapter.findByIdAndUpdate(item.chapterId, {
          chapter_number: item.chapter_number,
        });
      }

      res.json({ success: true, message: "Đã cập nhật thứ tự chương" });
    } catch (err) {
      console.error("reorderChapters:", err);
      res.status(500).json({ success: false, error: "Lỗi khi cập nhật thứ tự chương" });
    }
  },


  // ==================== USER ====================
  // ✅ Đăng nhập
  register: async (req, res) => {
    try {
      const { username, email, password, phone } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc." });
      }

      // Kiểm tra email đã tồn tại
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: "Email đã được sử dụng." });
      }

      const newUser = new User({
        username,
        email,
        password, // password sẽ được hash tự động bởi pre('save')
        phonenumber: phone
      });

      await newUser.save();

      res.status(201).json({
        success: true,
        message: "Đăng ký thành công! Vui lòng đăng nhập."
      });

    } catch (err) {
      console.error("Error during registration:", err);
      res.status(500).json({ error: "Lỗi server khi đăng ký." });
    }
  },

  // ===== LOGIN =====
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Vui lòng điền đầy đủ email và mật khẩu." });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác." });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: "Email hoặc mật khẩu không chính xác." });
      }

      // Lưu session
      req.session.user = {
        _id: user._id,
        username: user.username,
        role: user.role
      };

      // Phân quyền redirect
      let redirectUrl = "/";
      if (user.role === "admin") redirectUrl = "/admin/dashboard";

      res.json({
        success: true,
        message: "Đăng nhập thành công!",
        role: user.role,
        redirectUrl
      });

    } catch (err) {
      console.error("Error during login:", err);
      res.status(500).json({ error: "Lỗi server khi đăng nhập." });
    }
  },

logout: (req, res) => {
  try {
    const userRole = req.session?.user?.role || 'user';

    req.session.destroy(err => {
      if (err) {
        console.error("❌ Lỗi khi đăng xuất:", err);
        return res.status(500).send("Logout thất bại.");
      }

      // Xóa cookie session
      res.clearCookie('storyhaven.sid', { path: '/' });

      // Redirect tùy vai trò
      if (userRole === 'admin') {
        // Admin → về login admin
        return res.redirect('/login');
      } else {
        // User → về trang login user
        return res.redirect('/');
      }
    });
  } catch (error) {
    console.error("❌ Lỗi ngoài ý muốn khi logout:", error);
    // fallback redirect
    res.redirect('/');
  }
},


  // ✅ Lấy thông tin tài khoản
  getAccountInfo: async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Bạn chưa đăng nhập" });
      }

      const user = await User.findById(req.session.user._id).select("-password");
      if (!user) {
        return res.status(404).json({ error: "Không tìm thấy người dùng" });
      }

      res.json(user);
    } catch {
      res.status(500).json({ error: "Server error" });
    }
  },


 // ✅ Update profile
  updateUserProfile: async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Chưa đăng nhập" });
      }

      const { username, email, phone, avatar, description } = req.body;

      const updated = await User.findByIdAndUpdate(
        req.session.user._id,
        {
          username,
          email,
          phonenumber: phone,
          avatar,
          description
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ error: "Không tìm thấy user" });
      }

      // Cập nhật tên mới trong session
      req.session.user.username = updated.username;

      res.json({ success: true, message: "Cập nhật thành công!" });

    } catch (err) {
      res.status(500).json({ error: "Lỗi server" });
    }
  },


  // ==================== FOLLOW ====================
  toggleFollow: async (req, res) => {
    try {
      const { storyId } = req.body;
      const userId = req.session.user?._id;
      if (!userId) return res.status(401).json({ error: "Bạn cần đăng nhập" });

      const existing = await Follow.findOne({ user_id: userId, story_id: storyId });
      if (existing) {
        await Follow.deleteOne({ _id: existing._id });
        return res.status(200).json({ followed: false });
      } else {
        await Follow.create({ user_id: userId, story_id: storyId });
        return res.status(200).json({ followed: true });
      }
    } catch (err) {
      console.error("toggleFollow:", err);
      res.status(500).json({ error: "Lỗi máy chủ" });
    }
  },

  getLibraryStories: async (req, res) => {
    try {
      const userId = req.session.user?._id;
      if (!userId) return res.status(401).json({ error: "Bạn cần đăng nhập" });

      const follows = await Follow.find({ user_id: userId })
      .populate({
        path: "story_id",
        populate: { path: "userId", select: "username" }
      });
      const stories = follows.map(f => f.story_id);
      res.status(200).json(stories);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },

  getFollowStatus: async (req, res) => {
    try {
      const userId = req.session.user?._id;
      const { storyId } = req.params;
      if (!userId) return res.json({ followed: false });

      const exist = await Follow.findOne({ user_id: userId, story_id: storyId });
      res.status(200).json({ followed: !!exist });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },

  // ==================== VIEW & VOTE ====================
  addChapterView: async (req, res) => {
    try {
      const { chapterId } = req.body;
      const userId = req.session.user ? req.session.user._id : null;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      if (!chapterId) return res.status(400).json({ error: "Thiếu chapterId" });

      // Tạo record view mới (tính mọi lần đọc)
      await ChapterView.create({
        user_id: userId,
        ip_address: ip,
        chapter_id: chapterId,
      });

      // Cập nhật số view tổng cho Chapter
      const totalViews = await ChapterView.countDocuments({ chapter_id: chapterId });
      await Chapter.findByIdAndUpdate(chapterId, { views: totalViews });

      res.status(200).json({ success: true, views: totalViews });
    } catch (err) {
      console.error("addChapterView:", err);
      res.status(500).json({ error: "Lỗi server khi ghi lượt xem" });
    }
  },

  // 📊 Lấy tổng lượt xem 1 chapter
  getChapterViews: async (req, res) => {
    try {
      const { chapterId } = req.params;
      const count = await ChapterView.countDocuments({ chapter_id: chapterId });
      res.status(200).json({ views: count });
    } catch (err) {
      console.error("getChapterViews:", err);
      res.status(500).json({ error: "Không thể lấy số lượt xem" });
    }
  },

  // 📊 Lấy tổng lượt xem tất cả chapter của 1 story
  getStoryViews: async (req, res) => {
    try {
      const { storyId } = req.params;
      const chapters = await Chapter.find({ storyId }).select("_id");
      const chapterIds = chapters.map(ch => ch._id);
      const totalViews = await ChapterView.countDocuments({ chapter_id: { $in: chapterIds } });
      res.status(200).json({ total_views: totalViews });
    } catch (err) {
      console.error("getStoryViews:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },

 // === TOGGLE VOTE ===
  toggleVote: async (req, res) => {
    try {
      const { chapterId } = req.body;
      const userId = req.session.user ? req.session.user._id : null;

      console.log("🔍 vote request:", { userId, chapterId });

      if (!userId) return res.status(401).json({ error: "Bạn cần đăng nhập để vote." });
      if (!chapterId) return res.status(400).json({ error: "Thiếu ID chương." });

      const chapterExists = await Chapter.findById(chapterId);
      if (!chapterExists) return res.status(404).json({ error: "Chương không tồn tại." });

      const existingVote = await ChapterVote.findOne({ userId, chapterId });

      if (existingVote) {
        await ChapterVote.deleteOne({ _id: existingVote._id });
        const totalVotes = await ChapterVote.countDocuments({ chapterId });
        await Chapter.findByIdAndUpdate(chapterId, { votes: totalVotes });
        return res.json({ message: "Đã bỏ vote", voted: false, totalVotes });
      } else {
        await ChapterVote.create({ userId, chapterId });
        const totalVotes = await ChapterVote.countDocuments({ chapterId });
        await Chapter.findByIdAndUpdate(chapterId, { votes: totalVotes });
        return res.json({ message: "Vote thành công!", voted: true, totalVotes });
      }
    } catch (err) {
      console.error("toggleVote error:", err);
      return res.status(500).json({ error: "Lỗi server khi xử lý vote." });
    }
  },

  // === KIỂM TRA VOTE CỦA USER ===
  getUserVoteStatus: async (req, res) => {
    try {
      const userId = req.session.user ? (req.session.user._id || req.session.user._id) : null;
      const { chapterId } = req.params;

      if (!userId) return res.status(200).json({ voted: false });
      if (!chapterId) return res.status(400).json({ error: "Thiếu chapterId." });

      const existing = await ChapterVote.findOne({ userId, chapterId });
      res.status(200).json({ voted: !!existing });
    } catch (err) {
      console.error("getUserVoteStatus:", err);
      res.status(500).json({ error: "Không thể kiểm tra vote." });
    }
  },

  // === LẤY TỔNG VOTE CHƯƠNG ===
  getChapterVotes: async (req, res) => {
    try {
      const { chapterId } = req.params;
      const totalVotes = await ChapterVote.countDocuments({ chapterId });
      res.status(200).json({ total_votes: totalVotes });
    } catch (err) {
      console.error("getChapterVotes:", err);
      res.status(500).json({ error: "Không thể lấy tổng vote." });
    }
  },

// ===================== TỔNG VOTE CỦA TRUYỆN =====================
getTotalStoryVotes: async (req, res) => {
  try {
    const { storyId } = req.params;
    if (!storyId) return res.status(400).json({ error: "Thiếu storyId" });

    // Ép kiểu storyId về ObjectId để match trong Mongo
    const storyObjectId = new mongoose.Types.ObjectId(storyId);

    // Lấy tất cả chương thuộc truyện
    const chapters = await Chapter.find({ storyId: storyObjectId }).select("_id").lean();
    if (!chapters.length) return res.json({ total_votes: 0 });

    const chapterIds = chapters.map(ch => ch._id);

    // Đếm tổng vote từ ChapterVote
    const totalVotes = await ChapterVote.countDocuments({ chapterId: { $in: chapterIds } });

    return res.json({ total_votes: totalVotes });
  } catch (err) {
    console.error("getTotalStoryVotes:", err);
    return res.status(500).json({ error: "Lỗi server khi lấy tổng vote." });
  }
},

// ✅ Đếm chapter đã đăng (control = 1)
getPublishedChapterCount: async (req, res) => {
  try {
    const { storyId } = req.params;
    const count = await Chapter.countDocuments({ storyId, control: 1 });
    res.status(200).json({ total_chapters: count });
  } catch (err) {
    console.error("getPublishedChapterCount:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
},

// ✅ Đếm cả đã đăng & bản thảo
getAllChapterCount: async (req, res) => {
  try {
    const { storyId } = req.params;
    const published = await Chapter.countDocuments({ storyId, control: 1 });
    const draft = await Chapter.countDocuments({ storyId, control: 0 });

    res.status(200).json({
      published,
      draft,
      total: published + draft
    });
  } catch (err) {
    console.error("getAllChapterCount:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
},

};

module.exports = apiController;
