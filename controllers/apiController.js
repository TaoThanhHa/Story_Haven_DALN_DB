const bcrypt = require("bcrypt");
const Story = require("../models/Story");
const Chapter = require("../models/Chapter");
const Follow = require("../models/Follow");
const User = require("../models/User");
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

      // ✅ Lưu session
      req.session.user = {
        _id: user._id,
        username: user.username,
        role: user.role
      };

      // ✅ BẮT BUỘC LƯU SESSION TRƯỚC KHI RESPONSE
      req.session.save(err => {
        if (err) {
          console.error("Lỗi lưu session:", err);
          return res.status(500).json({ error: "Không thể tạo session đăng nhập." });
        }

        // Phân quyền redirect
        let redirectUrl = "/";
        if (user.role === "admin") redirectUrl = "/admin/dashboard";

        res.json({
          success: true,
          message: "Đăng nhập thành công!",
          role: user.role,
          redirectUrl
        });
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
      // Populate following và followers để có thể đếm số lượng
      const user = await User.findById(req.session.user._id)
                               .select("-password")
                               .populate('following', 'username avatar') // Lấy username và avatar của người đang theo dõi
                               .populate('followers', 'username avatar'); // Lấy username và avatar của người theo dõi mình
      if (!user) {
        return res.status(404).json({ error: "Không tìm thấy người dùng" });
      }
      // Gửi cả số lượng following và followers
      res.json({
        ...user.toObject(), // Chuyển sang object thường để thêm thuộc tính
        followingCount: user.following.length,
        followersCount: user.followers.length
      });
    } catch(err) {
      console.error("getAccountInfo error:", err); // Thêm console.error để dễ debug
      res.status(500).json({ error: "Server error" });
    }
  },

  // FOLLOW USER
  // Lấy thông tin profile của một user bất kỳ (dùng khi xem profile người khác)
  getUserProfile: async (req, res) => {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "ID người dùng không hợp lệ." });
      }

      // Populate following và followers để có thể đếm số lượng
      const userProfile = await User.findById(userId)
                                    .select("-password")
                                    .populate('following', 'username avatar') // Lấy username và avatar của người đang theo dõi
                                    .populate('followers', 'username avatar'); // Lấy username và avatar của người theo dõi mình

      if (!userProfile) {
        return res.status(404).json({ error: "Không tìm thấy người dùng." });
      }

      let isFollowing = false;
      if (req.session.user && req.session.user._id !== userId) { // Nếu có user đăng nhập và không phải profile của chính mình
        const currentUser = await User.findById(req.session.user._id);
        isFollowing = currentUser.following.includes(userProfile._id);
      }

      res.json({
        ...userProfile.toObject(),
        followingCount: userProfile.following.length,
        followersCount: userProfile.followers.length,
        isFollowing: isFollowing // Thêm trạng thái theo dõi từ phía người dùng hiện tại
      });

    } catch (err) {
      console.error("getUserProfile error:", err);
      res.status(500).json({ error: "Lỗi server khi lấy thông tin người dùng." });
    }
  },

  // Theo dõi/Bỏ theo dõi một người dùng
  toggleUserFollow: async (req, res) => {
    try {
      const { userId } = req.params; // ID của người mà ta muốn theo dõi/bỏ theo dõi
      const currentUserId = req.session.user?._id; // ID của người đang thực hiện hành động

      if (!currentUserId) {
        return res.status(401).json({ error: "Bạn cần đăng nhập để thực hiện hành động này." });
      }

      if (currentUserId === userId) {
        return res.status(400).json({ error: "Bạn không thể tự theo dõi chính mình." });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "ID người dùng không hợp lệ." });
      }

      const userToFollow = await User.findById(userId);
      const currentUser = await User.findById(currentUserId);

      if (!userToFollow || !currentUser) {
        return res.status(404).json({ error: "Không tìm thấy người dùng." });
      }

      const isAlreadyFollowing = currentUser.following.includes(userToFollow._id);

      if (isAlreadyFollowing) {
        // Bỏ theo dõi
        currentUser.following.pull(userToFollow._id);
        userToFollow.followers.pull(currentUser._id);
        await currentUser.save();
        await userToFollow.save();
        return res.json({ success: true, followed: false, message: "Đã bỏ theo dõi." });
      } else {
        // Theo dõi
        currentUser.following.push(userToFollow._id);
        userToFollow.followers.push(currentUser._id);
        await currentUser.save();
        await userToFollow.save();
        return res.json({ success: true, followed: true, message: "Đã theo dõi." });
      }

    } catch (err) {
      console.error("toggleUserFollow error:", err);
      res.status(500).json({ error: "Lỗi server khi thực hiện theo dõi/bỏ theo dõi." });
    }
  },

  //  Lấy danh sách những người mà user đang theo dõi
  getFollowingUsers: async (req, res) => {
    try {
      const { userId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "ID người dùng không hợp lệ." });
      }

      const user = await User.findById(userId).populate('following', 'username avatar');
      if (!user) {
        return res.status(404).json({ error: "Không tìm thấy người dùng." });
      }

      res.json({ success: true, following: user.following });
    } catch (err) {
      console.error("getFollowingUsers error:", err);
      res.status(500).json({ error: "Lỗi server khi lấy danh sách đang theo dõi." });
    }
  },

  // Lấy danh sách những người đang theo dõi user
  getFollowersUsers: async (req, res) => {
    try {
      const { userId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "ID người dùng không hợp lệ." });
      }

      const user = await User.findById(userId).populate('followers', 'username avatar');
      if (!user) {
        return res.status(404).json({ error: "Không tìm thấy người dùng." });
      }

      res.json({ success: true, followers: user.followers });
    } catch (err) {
      console.error("getFollowersUsers error:", err);
      res.status(500).json({ error: "Lỗi server khi lấy danh sách người theo dõi." });
    }
  },


 // Update profile
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
    if (!req.session.user) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { storyId } = req.body;
    const userId = req.session.user._id;

    const exists = await Follow.findOne({ userId, storyId });

    if (exists) {
      await exists.deleteOne();
      return res.json({ followed: false });
    }

    await Follow.create({ userId, storyId });
    return res.json({ followed: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
},

getLibrary: async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ message: "Chưa đăng nhập" });

    const list = await Follow.find({ userId: req.session.user._id })
      .sort({ lastRead: -1 })
      .populate("storyId")
      .lean();

    const result = list.map(item => ({
      ...item.storyId,
      lastRead: item.lastRead
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Lỗi server" });
  }
},

checkFollowStatus: async (req, res) => {
  try {
    if (!req.session.user) return res.json({ followed: false });

    const { storyId } = req.params;
    const userId = req.session.user._id;

    const exists = await Follow.findOne({ userId, storyId });
    res.json({ followed: !!exists });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server" });
  }
},

updateLastRead: async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({});

    const { storyId } = req.body;
    await Follow.updateOne(
      { userId: req.session.user._id, storyId },
      { lastRead: Date.now() }
    );
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
},

// ===== LẤY TỔNG NGƯỜI FOLLOW 1 TRUYỆN =====
getStoryFollowers: async (req, res) => {
  try {
    const { storyId } = req.params;
    const count = await Follow.countDocuments({ storyId });
    res.json({ total_follow: count });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server" });
  }
},

// ===== LẤY 4 TRUYỆN GỢI Ý TRÙNG ÍT NHẤT 2 THỂ LOẠI =====
getRecommendedStories: async (req, res) => {
  try {
    const { storyId } = req.params;

    const currentStory = await Story.findById(storyId);
    if (!currentStory) return res.json([]);

    let categories = currentStory.category || "";
    if (typeof categories === "string") categories = categories.split(",").map(c => c.trim());

    const stories = await Story.find({ _id: { $ne: storyId } });

    const scored = stories.map(st => {
      let stCats = st.category || "";
      if (typeof stCats === "string") stCats = stCats.split(",").map(c => c.trim());

      // Đếm số thể loại trùng
      const matchCount = stCats.filter(c => categories.includes(c)).length;

      return { story: st, matchs: matchCount };
    });

    // Chỉ lấy truyện trùng >= 2 thể loại
    const filtered = scored.filter(s => s.matchs >= 2);

    // Lấy 4 cái cao nhất
    const result = filtered
      .sort((a, b) => b.matchs - a.matchs)
      .slice(0, 4)
      .map(s => s.story);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Lỗi server" });
  }
},

};

module.exports = apiController;
