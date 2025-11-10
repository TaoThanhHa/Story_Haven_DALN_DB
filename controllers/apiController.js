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
};

module.exports = apiController;
