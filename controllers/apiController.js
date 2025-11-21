const bcrypt = require("bcrypt");
const Story = require("../models/Story");
const Chapter = require("../models/Chapter");
const Follow = require("../models/Follow");
const User = require("../models/User");
const mongoose = require("mongoose");
const nodemailer = require('nodemailer');
const crypto = require('crypto'); 


const _fetchUserProfileData = async (targetId, currentUserId) => {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return { success: false, message: "User ID không hợp lệ" };
    }

    const user = await User.findById(targetId)
        .select("-password")
        .populate("followers", "username avatar") 
        .populate("following", "username avatar"); 

    if (!user) {
        return { success: false, message: "Không tìm thấy user" };
    }

    let isFollowing = false;
    if (currentUserId && String(currentUserId) !== String(user._id)) {
        const me = await User.findById(currentUserId);
        if (me) { 
            isFollowing = me.following.includes(user._id);
        }
    }

    return {
        success: true,
        user,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing
    };
};

const apiController = {
  _fetchUserProfileData: _fetchUserProfileData,

  // ==================== STORY ====================
getStories: async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    let stories = await Story.find({ 
      control: true,
      visibility: "public"
    })

      .populate("userId", "username email")
      .lean(); 

    stories.sort((a, b) => {
      const dateA = new Date(a.latestChapter?.updatedAt || a.updatedAt || a.createdAt);
      const dateB = new Date(b.latestChapter?.updatedAt || b.updatedAt || b.createdAt);
      return dateB - dateA;
    });

    const total = stories.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedStories = stories.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      stories: paginatedStories,
      total,
      totalPages,
      currentPage: page
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
      if (story.visibility === "hidden") {
        if (!req.session.user || req.session.user._id.toString() !== story.userId.toString()) {
          return res.status(403).json({ error: "Truyện này đang ẩn" });
        }
      }

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

      const { title, description, category, status, control, visibility } = req.body;
      const thumbnail = req.file ? `/images/${req.file.filename}` : null;

      const storyData = {
        title,
        description,
        category,
        thumbnail,
        status: status || "writing",
        control: Number(control) || 0,
        visibility: visibility || "public",
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

      const stories = await Story.find({
        userId: req.session.user._id,
        visibility: "public"   // chỉ truyện công khai
      }).populate("userId", "username email");

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
      const stories = await Story.find({
        title: { $regex: title, $options: "i" },
        control: 1,
        visibility: "public"
      });
      res.status(200).json(stories);
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  },

  //Lấy truyện theo thể loại
  getStoriesByCategory: async (req, res) => {
    try {
      const { category } = req.query;
      if (!category) {
        return res.status(400).json({ error: "Thiếu category" });
      }

      const stories = await Story.find({
        category: { $regex: category, $options: "i" },
        control: 1,
        visibility: "public"
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
  register: async (req, res) => {
    try {
      const { username, email, password, phone } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc." });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: "Email đã được sử dụng." });
      }

      const newUser = new User({
        username,
        email,
        password,
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

      if (user.status === 'banned' || user.status === 'blocked') { 
          return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' });
      }
      if (user.status === 'inactive') {
          return res.status(403).json({ error: 'Tài khoản của bạn chưa được kích hoạt hoặc đã bị vô hiệu hóa.' });
      }

      req.session.user = {
        _id: user._id,
        username: user.username,
        role: user.role,
        avatar: user.avatar
      };

      req.session.save(err => {
        if (err) {
          console.error("Lỗi lưu session:", err);
          return res.status(500).json({ error: "Không thể tạo session đăng nhập." });
        }

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

        res.clearCookie('storyhaven.sid', { path: '/' });

        if (userRole === 'admin') {
          return res.redirect('/login');
        } else {
          return res.redirect('/');
        }
      });
    } catch (error) {
      console.error("❌ Lỗi ngoài ý muốn khi logout:", error);
  
      res.redirect('/');
    }
  },

// ==================== USER AUTH / PASSWORD RESET ====================
  forgotPassword: async (req, res) => { 
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Vui lòng nhập email.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ message: 'Nếu email của bạn tồn tại, một liên kết đặt lại mật khẩu đã được gửi.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000*24; // Hạn trong 24h
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const resetURL = `http://${req.headers.host}/reset-password/${resetToken}`;

        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Đặt lại mật khẩu StoryHaven của bạn',
            html: `<p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản StoryHaven của mình.</p>
                   <p>Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu:</p>
                   <a href="${resetURL}">${resetURL}</a>
                   <p>Liên kết này sẽ hết hạn trong 1 giờ.</p>
                   <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.</p>`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.' });

    } catch (err) {
        console.error('Lỗi trong forgotPassword:', err);
        res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống khi gửi email đặt lại mật khẩu.' });
    }
  }, 

  resetPassword: async (req, res) => { 
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ error: 'Vui lòng nhập mật khẩu mới.' });
    }

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Mật khẩu của bạn đã được cập nhật thành công.' });

    } catch (err) {
        console.error('Lỗi trong resetPassword:', err);
        res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống khi đặt lại mật khẩu.' });
    }
  },

  //Lấy thông tin tài khoản
  getAccountInfo: async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Bạn chưa đăng nhập" });
      }
      const user = await User.findById(req.session.user._id)
                               .select("-password")
                               .populate('following', 'username avatar') 
                               .populate('followers', 'username avatar'); 
      if (!user) {
        return res.status(404).json({ error: "Không tìm thấy người dùng" });
      }
      res.json({
        ...user.toObject(),
        followingCount: user.following.length,
        followersCount: user.followers.length
      });
    } catch(err) {
      console.error("getAccountInfo error:", err); 
      res.status(500).json({ error: "Server error" });
    }
  },

  getUserProfile: async (req, res) => {
    try {
      const { userId } = req.params;
      const targetId = userId || req.session.user?._id; 
      const currentUserId = req.session.user?._id;     

      if (!targetId) {
        return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
      }

      const result = await _fetchUserProfileData(targetId, currentUserId);

      if (!result.success) {
        return res.status(result.message === "Không tìm thấy user" ? 404 : 400).json(result);
      }

      res.json({
        success: true,
        profileUser: result.user,  
        currentUser: req.session.user, 
        followersCount: result.followersCount,
        followingCount: result.followingCount,
        isFollowing: result.isFollowing
      });

    } catch (err) {
      console.error("getUserProfile API error:", err);
      res.status(500).json({ success: false, message: "Lỗi server" });
    }
  },

  getStoriesByUser: async (req, res) => {
    try {
      let targetUserId = req.params.userId;

      console.log("=== DEBUG getStoriesByUser ===");
      console.log("Request Params ID:", req.params.userId);

      if (!targetUserId || targetUserId === 'undefined' || targetUserId === 'null') {
          console.log("Lỗi: Không tìm thấy User ID hợp lệ trên URL");
          return res.status(400).json({ error: "User ID invalid" });
      }

      targetUserId = String(targetUserId);
      const loggedInUserId = req.session.user ? String(req.session.user._id) : null;

      const filter = { 
          $or: [
              { userId: targetUserId }, 
              { author: targetUserId }
          ] 
      };

      if (loggedInUserId !== targetUserId) {
          filter.control = 1; 
      }

      console.log("Filter Query:", JSON.stringify(filter)); 

      const stories = await Story.find(filter).lean();
      console.log("Số lượng truyện tìm thấy:", stories.length);

      const storiesWithLatest = await Promise.all(stories.map(async story => {
        const latestChapter = await Chapter.findOne({ storyId: story._id })
                                          .sort({ updatedAt: -1 })
                                          .lean();

        const derivedStatus = (story.control === 1) ? 'published' : 'draft';

        return { 
            ...story, 
            status: story.status || derivedStatus,
            latestChapter: latestChapter || null 
        };
      }));

      res.json(storiesWithLatest);

    } catch (err) {
      console.error("Lỗi getStoriesByUser:", err);
      res.status(500).json({ error: "Lỗi server khi lấy truyện" });
    }
  },

  toggleUserFollow: async (req, res) => {
    try {
      const { userId } = req.params; 
      const currentUserId = req.session.user?._id; 

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
        currentUser.following.pull(userToFollow._id);
        userToFollow.followers.pull(currentUser._id);
        await currentUser.save();
        await userToFollow.save();
        return res.json({ success: true, followed: false, message: "Đã bỏ theo dõi." });
      } else {
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

  getFollowingUsers: async (req, res) => {
    try {
        const { userId } = req.params; 
        const loggedInUserId = req.session.user?._id; 

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "ID người dùng không hợp lệ." });
        }

        const user = await User.findById(userId)
                               .populate('following', 'username avatar followers following') 
                               .lean(); 

        if (!user) {
            return res.status(404).json({ error: "Không tìm thấy người dùng." });
        }

        let followingList = user.following;

        if (loggedInUserId && followingList && followingList.length > 0) {
            const loggedInUserObj = await User.findById(loggedInUserId).select("following").lean(); 
            if (loggedInUserObj) {
                const loggedInUserFollowingIds = loggedInUserObj.following.map(f => f.toString());

                followingList = followingList.map(followedUser => {
                    const isFollowingThisUser = loggedInUserFollowingIds.includes(followedUser._id.toString());
                    return {
                        ...followedUser,
                        isFollowing: isFollowingThisUser
                    };
                });
            }
        }

        res.json({ success: true, following: followingList });
    } catch (err) {
        console.error("getFollowingUsers error:", err);
        res.status(500).json({ error: "Lỗi server khi lấy danh sách đang theo dõi." });
    }
  },

  getFollowersUsers: async (req, res) => {
      try {
          const { userId } = req.params; 
          const loggedInUserId = req.session.user?._id; 

          if (!mongoose.Types.ObjectId.isValid(userId)) {
              return res.status(400).json({ error: "ID người dùng không hợp lệ." });
          }

          const user = await User.findById(userId)
                                .populate('followers', 'username avatar followers following') 
                                .lean();

          if (!user) {
              return res.status(404).json({ error: "Không tìm thấy người dùng." });
          }

          let followersList = user.followers;

          if (loggedInUserId && followersList && followersList.length > 0) {
              if (loggedInUserObj) {
                  const loggedInUserFollowingIds = loggedInUserObj.following.map(f => f.toString());

                  followersList = followersList.map(followerUser => {
                      const isFollowingThisUser = loggedInUserFollowingIds.includes(followerUser._id.toString());
                      return {
                          ...followerUser,
                          isFollowing: isFollowingThisUser 
                      };
                  });
              }
          }

          res.json({ success: true, followers: followersList });
      } catch (err) {
          console.error("getFollowersUsers error:", err);
          res.status(500).json({ error: "Lỗi server khi lấy danh sách người theo dõi." });
      }
  },

  updateUserProfile: async (req, res) => {
      try {
          if (!req.session.user) {
              return res.status(401).json({ error: "Chưa đăng nhập" });
          }

          const userId = req.session.user._id;

          const currentUser = await User.findById(userId);
          if (!currentUser) {
              return res.status(404).json({ error: "Không tìm thấy user" });
          }

          const { name, email, phone, description } = req.body;

          let avatarPath = currentUser.avatar;

          if (req.file) {
              avatarPath = "/images/" + req.file.filename;
          }

          const updateData = {
              username: name || currentUser.username,
              email: email || currentUser.email,
              phonenumber: phone || currentUser.phonenumber,
              description: description || currentUser.description,
              avatar: avatarPath
          };

          const updatedUser = await User.findByIdAndUpdate(
              userId,
              updateData,
              { new: true, runValidators: true }
          );

          req.session.user.username = updatedUser.username;
          req.session.user.avatar = updatedUser.avatar;

          res.json({
              success: true,
              message: "Cập nhật thành công!",
              user: updatedUser
          });

      } catch (err) {
          console.error("Error in updateUserProfile:", err);
          res.status(500).json({
              error: "Lỗi server: " + err.message
          });
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
      if (!req.session.user) 
        return res.status(401).json({ message: "Chưa đăng nhập" });

      const list = await Follow.find({ userId: req.session.user._id })
        .sort({ lastRead: -1 })
        .populate("storyId")
        .lean();

      const filtered = list
        .filter(item => 
          item.storyId &&
          item.storyId.control === 1 &&
          item.storyId.visibility === "public"
        )
        .map(item => ({
          ...item.storyId,
          lastRead: item.lastRead
        }));

      res.json(filtered);

    } catch (err) {
      console.error("getLibrary:", err);
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

  getStoryFollowers: async (req, res) => {
    try {
      const { storyId } = req.params;
      const count = await Follow.countDocuments({ storyId });
      res.json({ total_follow: count });
    } catch (err) {
      res.status(500).json({ error: "Lỗi server" });
    }
  },

  getRecommendedStories: async (req, res) => {
    try {
      const { storyId } = req.params;

      const currentStory = await Story.findById(storyId);
      if (!currentStory) return res.json([]);

      let categories = currentStory.category || "";
      if (typeof categories === "string")
        categories = categories.split(",").map(c => c.trim());

      const stories = await Story.find({
        _id: { $ne: storyId },
        visibility: "public",
        control: 1
      });

      const scored = stories.map(st => {
        let stCats = st.category || "";
        if (typeof stCats === "string")
          stCats = stCats.split(",").map(c => c.trim());

        const matchCount = stCats.filter(c => categories.includes(c)).length;

        return { story: st, matchs: matchCount };
      });

      const filtered = scored.filter(s => s.matchs >= 2);

      const result = filtered
        .sort((a, b) => b.matchs - a.matchs)
        .slice(0, 4)
        .map(s => s.story);

      res.json(result);
    } catch (err) {
      console.error("getRecommendedStories:", err);
      res.status(500).json({ error: "Lỗi server" });
    }
  },
};

module.exports = apiController;
