const User = require('../models/User'); 
const Story = require('../models/Story'); 
const Chapter = require('../models/Chapter'); 
const Comment = require('../models/Comment'); 
const ReportedComment = require('../models/ReportedComment'); 
const mongoose = require('mongoose'); 

// ================= USERS =================
const getUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (status) filter.status = status;

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('username email role status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const usersWithStoriesCount = await Promise.all(users.map(async (u) => {
      const total_stories = await Story.countDocuments({ userId: u._id });
      return { ...u, total_stories };
    }));

    res.json({ users: usersWithStoriesCount, currentPage: page, totalPages, totalUsers });
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy users' });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('Fetching user with ID:', userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'ID người dùng không hợp lệ.' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    user.total_stories = await Story.countDocuments({ userId: user._id });
    res.json(user);
  } catch (err) {
    console.error('Error getting user by ID:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy chi tiết người dùng.' });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'ID người dùng không hợp lệ.' });
    }

    const update = {};
    if (role) update.role = role;
    if (status) update.status = status;

    if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'Không có trường nào được cung cấp để cập nhật.' });
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true }); // runValidators để chạy các validator đã định nghĩa trong schema
    if (!user) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    res.json({ message: 'Cập nhật người dùng thành công.' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật người dùng.' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'ID người dùng không hợp lệ.' });
    }

    const validStatuses = ['active', 'inactive', 'banned']; 
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Trạng thái không hợp lệ. Phải là "active", "inactive" hoặc "banned".' });
    }

    if (req.session.user && req.session.user._id.toString() === userId && status !== 'active') {
      return res.status(403).json({ error: 'Admin không thể tự khóa tài khoản của mình.' });
    }

    const user = await User.findByIdAndUpdate(userId, { status }, { new: true, runValidators: true });
    if (!user) {
        return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    res.json({ message: `Trạng thái người dùng đã thay đổi thành ${status}.` });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái người dùng.' });
  }
};

const deleteUser = async (req, res) => {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID người dùng không hợp lệ.' });
  }

  if (req.session.user && req.session.user._id.toString() === userId) {
    return res.status(403).json({ error: 'Admin không thể tự xóa tài khoản của mình.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const storiesToDelete = await Story.find({ userId: userId });
    const storyIds = storiesToDelete.map(s => s._id);

    await Chapter.deleteMany({ storyId: { $in: storyIds } });
    await Comment.deleteMany({ userId: userId });
    await ReportedComment.deleteMany({
        $or: [
            { reporterUserId: userId },
            { 'comment.userId': userId }
        ]
    });

    await Story.deleteMany({ userId: userId });
    await User.deleteOne({ _id: userId });

    res.json({ message: 'Người dùng và tất cả dữ liệu liên quan đã được xóa thành công.' });
  } catch (err) {
    console.error('Error deleting user and associated data:', err);
    res.status(500).json({ error: 'Lỗi server khi xóa người dùng và dữ liệu liên quan.' });
  }
};


// ================= STORIES =================
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const getStories = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", visibility = "", category = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const andClauses = [];

    if (visibility) {
      andClauses.push({ visibility });
    }

    if (category) {
      const cats = category.split(",").map(c => c.trim()).filter(Boolean);

      if (cats.length) {
        const catOr = cats.map(c => ({
          category: {
            $regex: new RegExp(`(^|,\\s*)${escapeRegex(c)}(,|$)`, "i")
          }
        }));
        andClauses.push({ $or: catOr });
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      const users = await User.find({ username: searchRegex }).select("_id");
      const userIds = users.map(u => u._id);

      const searchOr = [{ title: searchRegex }];
      if (userIds.length) searchOr.push({ userId: { $in: userIds } });

      andClauses.push({ $or: searchOr });
    }

    let query = {};
    if (andClauses.length === 1) query = andClauses[0];
    else if (andClauses.length > 1) query = { $and: andClauses };

    const total = await Story.countDocuments(query);

    const stories = await Story.find(query)
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const storiesWithCounts = await Promise.all(stories.map(async s => {
      const chapterCount = await Chapter.countDocuments({ storyId: s._id });
      return {
        ...s,
        authorUsername: s.userId ? s.userId.username : "N/A",
        chapterCount
      };
    }));

    res.json({
      stories: storiesWithCounts,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("getStories error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const getStoryById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "ID truyện không hợp lệ" });

        const story = await Story.findById(id)
            .populate("userId", "username email")
            .lean();
        if (!story) return res.status(404).json({ error: "Không tìm thấy truyện" });

        const chapters = await Chapter.find({ storyId: story._id })
            .select("chapterNumber title createdAt")
            .sort({ chapterNumber: 1 })
            .lean();

        story.authorUsername = story.userId ? story.userId.username : "N/A";
        story.authorEmail = story.userId ? story.userId.email : "N/A";
        story.chapters = chapters;

        res.json(story);
    } catch (err) {
        console.error("getStoryById error:", err);
        res.status(500).json({ error: "Lỗi server khi lấy chi tiết truyện" });
    }
};

const updateStoryStatus = async (req, res) => {
    try {
        const storyId = req.params.id;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(storyId)) {
            return res.status(400).json({ error: 'ID truyện không hợp lệ.' });
        }

        const validStatuses = ['complete', 'writing', 'blocked', 'approved', 'pending'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ được cung cấp.' });
        }

        const story = await Story.findByIdAndUpdate(storyId, { status }, { new: true, runValidators: true });
        if (!story) {
            return res.status(404).json({ error: 'Không tìm thấy truyện.' });
        }

        res.json({ message: `Trạng thái truyện đã cập nhật thành ${status} thành công.` });
    } catch (err) {
        console.error('Error updating story status:', err);
        res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái truyện.' });
    }
};

const updateStory = async (req, res) => {
    try {
        const { id } = req.params;
        const { visibility } = req.body;

        if (!["public", "hidden"].includes(visibility)) {
            return res.status(400).json({ success: false, message: "Visibility không hợp lệ" });
        }

        const story = await Story.findByIdAndUpdate(id, { visibility }, { new: true });
        if (!story) return res.status(404).json({ success: false, message: "Không tìm thấy truyện" });

        res.json({ success: true, message: "Cập nhật visibility thành công", story });
    } catch (err) {
        console.error("updateStory error:", err);
        res.status(500).json({ success: false, message: "Lỗi server khi cập nhật truyện" });
    }
};

const deleteStory = async (req, res) => {
  const storyId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(storyId))
    return res.status(400).json({ error: "ID truyện không hợp lệ" });

  try {
    const story = await Story.findByIdAndDelete(storyId);
    if (!story) return res.status(404).json({ error: "Không tìm thấy truyện" });

    res.json({ message: "Story đã xóa thành công" });
  } catch (err) {
    console.error("deleteStory error:", err);
    res.status(500).json({ error: "Lỗi server khi xóa story" });
  }
};

const getUniqueStoryCategories = async (req, res) => {
    try {
        let categories = await Story.distinct("category");
        categories = categories.filter(c => c && c.trim() !== "").sort();

        const defaultCategories = [
        ];

        if (categories.length === 0) categories = defaultCategories;

        res.json(categories);
    } catch (err) {
        console.error("getUniqueStoryCategories error:", err);
        res.status(500).json({ error: "Lỗi server khi lấy thể loại" });
    }
};

// ================= COMMENTS =================
const getReportedComments = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', status = 'pending', reason = '' } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const filter = {};
        if (status) filter.status = status;
        if (reason) filter.reportReason = reason;
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: 'comments', 
                    localField: 'commentId',
                    foreignField: '_id',
                    as: 'commentDetails'
                }
            },
            { $unwind: '$commentDetails' }, 
            {
                $lookup: {
                    from: 'users',
                    localField: 'commentDetails.userId',
                    foreignField: '_id',
                    as: 'commentAuthor'
                }
            },
            { $unwind: '$commentAuthor' },
            {
                $lookup: {
                    from: 'users', 
                    localField: 'reporterUserId',
                    foreignField: '_id',
                    as: 'reporterUser'
                }
            },
            { $unwind: '$reporterUser' },
            {
                $lookup: {
                    from: 'chapters', 
                    localField: 'commentDetails.chapterId',
                    foreignField: '_id',
                    as: 'chapterDetails'
                }
            },
            { $unwind: { path: '$chapterDetails', preserveNullAndEmptyArrays: true } }, 
            {
                $lookup: {
                    from: 'stories',
                    localField: 'chapterDetails.storyId',
                    foreignField: '_id',
                    as: 'storyDetails'
                }
            },
            { $unwind: { path: '$storyDetails', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users', 
                    localField: 'commentDetails.targetUserId',
                    foreignField: '_id',
                    as: 'targetUserProfile'
                }
            },
            { $unwind: { path: '$targetUserProfile', preserveNullAndEmptyArrays: true } }, 
        ];

        if (search) {
            pipeline.unshift({
                $match: {
                    $or: [
                        { 'commentDetails.content': { $regex: search, $options: 'i' } },
                        { 'commentAuthor.username': { $regex: search, $options: 'i' } },
                        { 'reporterUser.username': { $regex: search, $options: 'i' } }
                    ]
                }
            });
        }

        const totalReports = await ReportedComment.aggregate([
            ...pipeline.filter(p => !p.$skip && !p.$limit && !p.$sort), 
            { $count: 'total' }
        ]);
        const count = totalReports.length > 0 ? totalReports[0].total : 0;
        const totalPages = Math.ceil(count / limit);

        const reportedComments = await ReportedComment.aggregate([
            ...pipeline,
            { $sort: { reportedAt: -1 } }, 
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
                $project: {
                    _id: 0, 
                    reportId: '$_id',
                    commentId: '$commentDetails._id',
                    reportReason: '$reportReason',
                    reportedAt: '$reportedAt',
                    reportStatus: '$status',
                    adminId: '$adminId',
                    actionTaken: '$actionTaken',
                    processedAt: '$processedAt',
                    commentContent: '$commentDetails.content',
                    commentStatus: '$commentDetails.status',
                    userId: '$commentAuthor._id',
                    commentAuthor: '$commentAuthor.username',
                    reporterUsername: '$reporterUser.username',
                    commentType: {
                        $cond: {
                            if: '$commentDetails.chapterId', then: 'Chapter Comment',
                            else: {
                                $cond: {
                                    if: '$commentDetails.targetUserId', then: 'Profile Comment',
                                    else: 'Unknown'
                                }
                            }
                        }
                    },
                    storyTitle: { $ifNull: ['$storyDetails.title', 'N/A'] },
                    chapterTitle: { $ifNull: ['$chapterDetails.title', 'N/A'] },
                    targetUserProfile: { $ifNull: ['$targetUserProfile.username', 'N/A'] }
                }
            }
        ]);

        res.json({
            reportedComments: reportedComments,
            currentPage: page,
            totalPages: totalPages,
            totalReports: count
        });
    } catch (err) {
        console.error('Error getting reported comments:', err);
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách bình luận bị báo cáo.' });
    }
};

const getReportedCommentById = async (req, res) => {
    try {
        const reportId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ error: 'ID báo cáo không hợp lệ.' });
        }

        const reportedComment = await ReportedComment.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(reportId) } },
            {
                $lookup: {
                    from: 'comments',
                    localField: 'commentId',
                    foreignField: '_id',
                    as: 'commentDetails'
                }
            },
            { $unwind: '$commentDetails' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'commentDetails.userId',
                    foreignField: '_id',
                    as: 'commentAuthor'
                }
            },
            { $unwind: '$commentAuthor' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'reporterUserId',
                    foreignField: '_id',
                    as: 'reporterUser'
                }
            },
            { $unwind: '$reporterUser' },
            {
                $lookup: {
                    from: 'chapters',
                    localField: 'commentDetails.chapterId',
                    foreignField: '_id',
                    as: 'chapterDetails'
                }
            },
            { $unwind: { path: '$chapterDetails', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'stories',
                    localField: 'chapterDetails.storyId',
                    foreignField: '_id',
                    as: 'storyDetails'
                }
            },
            { $unwind: { path: '$storyDetails', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'commentDetails.targetUserId',
                    foreignField: '_id',
                    as: 'targetUserProfile'
                }
            },
            { $unwind: { path: '$targetUserProfile', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'adminId', 
                    foreignField: '_id',
                    as: 'adminUser'
                }
            },
            { $unwind: { path: '$adminUser', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    reportId: '$_id',
                    commentId: '$commentDetails._id',
                    reportReason: '$reportReason',
                    reportedAt: '$reportedAt',
                    reportStatus: '$status',
                    adminId: '$adminId',
                    actionTaken: '$actionTaken',
                    processedAt: '$processedAt',
                    commentContent: '$commentDetails.content',
                    commentCreatedAt: '$commentDetails.createdAt',
                    commentStatus: '$commentDetails.status',
                    parentCommentId: '$commentDetails.parentCommentId',
                    userId: '$commentAuthor._id',
                    commentAuthor: '$commentAuthor.username',
                    commentAuthorEmail: '$commentAuthor.email',
                    reporterUserId: '$reporterUser._id',
                    reporterUsername: '$reporterUser.username',
                    reporterEmail: '$reporterUser.email',
                    commentType: {
                        $cond: {
                            if: '$commentDetails.chapterId', then: 'Chapter Comment',
                            else: {
                                $cond: {
                                    if: '$commentDetails.targetUserId', then: 'Profile Comment',
                                    else: 'Unknown'
                                }
                            }
                        }
                    },
                    storyTitle: { $ifNull: ['$storyDetails.title', 'N/A'] },
                    chapterTitle: { $ifNull: ['$chapterDetails.title', 'N/A'] },
                    targetUserProfile: { $ifNull: ['$targetUserProfile.username', 'N/A'] },
                    adminUsername: { $ifNull: ['$adminUser.username', 'N/A'] }
                }
            }
        ]);

        if (reportedComment.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy báo cáo bình luận.' });
        }
        res.json(reportedComment[0]);
    } catch (err) {
        console.error('Error getting reported comment by ID:', err);
        res.status(500).json({ error: 'Lỗi server khi lấy chi tiết báo cáo bình luận.' });
    }
};

const updateReportedCommentStatus = async (req, res) => {
    try {
        const reportId = req.params.id;
        const { status, actionTaken } = req.body; 
        const adminId = req.session.user._id; 

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ error: 'ID báo cáo không hợp lệ.' });
        }

        const validStatuses = ['pending', 'reviewed', 'dismissed', 'action_taken'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ được cung cấp.' });
        }

        const updatedReport = await ReportedComment.findByIdAndUpdate(
            reportId,
            { status, actionTaken, adminId, processedAt: new Date() }, 
            { new: true, runValidators: true }
        );

        if (!updatedReport) {
            return res.status(404).json({ error: 'Không tìm thấy báo cáo bình luận.' });
        }
        res.json({ message: 'Trạng thái báo cáo bình luận đã cập nhật thành công.' });
    } catch (err) {
        console.error('Error updating reported comment status:', err);
        res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái báo cáo bình luận.' });
    }
};

const updateCommentStatus = async (req, res) => {
    try {
        const commentId = req.params.id;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ error: 'ID bình luận không hợp lệ.' });
        }

        const validStatuses = ['active', 'hidden', 'deleted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Trạng thái bình luận không hợp lệ được cung cấp.' });
        }

        const comment = await Comment.findByIdAndUpdate(commentId, { status }, { new: true, runValidators: true });
        if (!comment) {
            return res.status(404).json({ error: 'Không tìm thấy bình luận.' });
        }
        res.json({ message: `Trạng thái bình luận đã thay đổi thành ${status} thành công.` });
    } catch (err) {
        console.error('Error updating comment status:', err);
        res.status(500).json({ error: 'Lỗi server khi cập nhật trạng thái bình luận.' });
    }
};

const deleteComment = async (req, res) => {
    const commentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ error: 'ID bình luận không hợp lệ.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const comment = await Comment.findById(commentId).session(session);
        if (!comment) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Không tìm thấy bình luận.' });
        }

        await ReportedComment.deleteMany({ commentId: commentId }).session(session);
        await Comment.deleteOne({ _id: commentId }).session(session); 

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Bình luận và tất cả báo cáo liên quan đã được xóa thành công.' });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error deleting comment and associated reports:', err);
        res.status(500).json({ error: 'Lỗi server khi xóa bình luận và báo cáo liên quan.' });
    }
};

const deleteReportedComment = async (req, res) => {
    try {
        const reportId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ error: 'ID báo cáo không hợp lệ.' });
        }

        const deletedReport = await ReportedComment.deleteOne({ _id: reportId });
        if (deletedReport.deletedCount === 0) {
            return res.status(404).json({ error: 'Không tìm thấy báo cáo bình luận.' });
        }
        res.json({ message: 'Báo cáo bình luận đã được xóa thành công.' });
    } catch (err) {
        console.error('Error deleting reported comment:', err);
        res.status(500).json({ error: 'Lỗi server khi xóa báo cáo bình luận.' });
    }
};

// ================= DASHBOARD STATS =================
const getDashboardStats = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
            totalUsers,
            totalStories,
            totalCommentsData,
            pendingStories,
            pendingReports,
            newStoriesLast7Days,
            storyCategories
        ] = await Promise.all([
            User.countDocuments(),      
            Story.countDocuments(),  
            Comment.aggregate([
        {
            $project: {
                totalInThisDoc: { 
                    $add: [ 1, { $size: { $ifNull: ["$replies", []] } } ] 
                }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$totalInThisDoc" }
            }
        }
    ]),
            Story.countDocuments({ status: 'pending' }), 
            ReportedComment.countDocuments({ status: 'pending' }), 
            
            Story.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            Story.aggregate([
                { $unwind: "$category" },
                { $match: { category: { $ne: null, $ne: '' } } },
                {
                    $group: {
                        _id: "$category",
                        count: { $sum: 1 }
                    }
                },
                { $project: { _id: 0, category: "$_id", count: 1 } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        const totalComments = totalCommentsData.length > 0 ? totalCommentsData[0].total : 0;
        
        res.json({
            totalUsers,
            totalStories,
            totalComments,
            pendingStories,
            pendingReports,
            newStoriesLast7Days, 
            storyCategories,
            adminActivities: [] 
        });

    } catch (err) {
        console.error('Lỗi khi lấy dữ liệu Dashboard:', err);
        res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu Dashboard.' });
    }
};

module.exports = {
    getUsers,
    getUserById,
    updateUser,
    updateUserStatus,
    deleteUser,

    // Cho truyện
    getStories,
    getStoryById,
    updateStoryStatus, 
    updateStory,
    deleteStory,

    // Cho thể loại
    getUniqueStoryCategories,

    // Cho bình luận và báo cáo
    getReportedComments,
    getReportedCommentById,
    updateReportedCommentStatus,
    updateCommentStatus,
    deleteComment,
    deleteReportedComment,

    // Cho Dashboard
    getDashboardStats,
};