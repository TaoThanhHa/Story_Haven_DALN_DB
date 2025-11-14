// controllers/adminController.js
const User = require('../models/User'); 
const Story = require('../models/Story'); 
const Chapter = require('../models/Chapter'); 
const Comment = require('../models/Comment'); 
const ReportedComment = require('../models/ReportedComment'); 
const mongoose = require('mongoose'); 

// ================= USERS =================

// Lấy danh sách users với pagination + filter + search
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
      .select('username email role status createdAt') // Changed from created_at to createdAt (Mongoose default)
      .sort({ createdAt: -1 }) // Changed from created_at to createdAt
      .lean();

    // Thêm total_stories cho mỗi user (sử dụng Promise.all để tối ưu)
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

// Lấy user theo ID
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

// Cập nhật role/status user
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

// Chỉ cập nhật status (block/unblock)
const updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'ID người dùng không hợp lệ.' });
    }

    const validStatuses = ['active', 'inactive', 'banned']; // Giả sử các trạng thái này
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Trạng thái không hợp lệ. Phải là "active", "inactive" hoặc "banned".' });
    }

    // Chặn admin tự khóa
    // Lưu ý: req.session.user._id là ObjectId, userId là string từ params
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

// Xóa user + stories + chapters + comments (sử dụng transaction)
const deleteUser = async (req, res) => {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID người dùng không hợp lệ.' });
  }

  // Ngăn admin tự xóa tài khoản của chính mình
  if (req.session.user && req.session.user._id.toString() === userId) {
    return res.status(403).json({ error: 'Admin không thể tự xóa tài khoản của mình.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const storiesToDelete = await Story.find({ userId: userId }).session(session);
    const storyIds = storiesToDelete.map(s => s._id);

    // Xóa tất cả chapters của các truyện của user
    await Chapter.deleteMany({ storyId: { $in: storyIds } }).session(session);
    // Xóa tất cả comments do user này viết
    await Comment.deleteMany({ userId: userId }).session(session);
    // Xóa tất cả reported comments liên quan đến user này (reporter hoặc author của comment)
    await ReportedComment.deleteMany({
        $or: [{ reporterUserId: userId }, { 'comment.userId': userId }] // Giả định schema ReportedComment có comment.userId
    }).session(session);
    // Xóa tất cả stories của user
    await Story.deleteMany({ userId: userId }).session(session);
    // Xóa user
    await User.deleteOne({ _id: userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Người dùng và tất cả dữ liệu liên quan đã được xóa thành công.' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting user and associated data:', err);
    res.status(500).json({ error: 'Lỗi server khi xóa người dùng và dữ liệu liên quan.' });
  }
};

// ================= STORIES =================

// Lấy danh sách truyện với pagination + filter + search
const getStories = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '', status = '', category = '' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
      // Nếu muốn tìm theo username của tác giả, cần join/populate
      // filter.$or.push({ 'userId.username': { $regex: search, $options: 'i' } }); // Cần populate trước
    }
    if (status) filter.status = status;
    if (category) filter.category = category; // Giả sử category là một string đơn hoặc là tìm trong mảng

    const totalStories = await Story.countDocuments(filter);
    const totalPages = Math.ceil(totalStories / limit);

    const stories = await Story.find(filter)
      .populate('userId', 'username') // Lấy username từ bảng User
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }) // Changed from created_at to createdAt
      .lean();

    // Thêm totalChapters và định dạng lại dữ liệu cho frontend
    const formattedStories = await Promise.all(stories.map(async story => {
        const totalChapters = await Chapter.countDocuments({ storyId: story._id });
        return {
            ...story,
            authorUsername: story.userId ? story.userId.username : 'N/A', // Đổi từ authorName sang authorUsername để rõ ràng hơn
            category: Array.isArray(story.category) ? story.category.join(', ') : story.category,
            totalChapters: totalChapters
        };
    }));

    res.json({ stories: formattedStories, currentPage: page, totalPages, totalStories });
  } catch (err) {
    console.error('Error getting stories:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách truyện.' });
  }
};

// Lấy truyện theo ID
const getStoryById = async (req, res) => {
  try {
    const storyId = req.params.id; 
    console.log('Fetching story with ID:', storyId);

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
        return res.status(400).json({ error: 'ID truyện không hợp lệ.' });
    }

    const story = await Story.findById(storyId)
      .populate('userId', 'username email') // Lấy username và email từ bảng User
      .lean();

    if (!story) {
        return res.status(404).json({ error: 'Không tìm thấy truyện.' });
    }

    // Lấy thêm danh sách chương
    const chapters = await Chapter.find({ storyId: story._id })
      .select('chapterNumber title createdAt') // Changed from created_at to createdAt
      .sort({ chapterNumber: 1 })
      .lean();

    // Định dạng lại dữ liệu nếu cần
    story.authorUsername = story.userId ? story.userId.username : 'N/A';
    story.authorEmail = story.userId ? story.userId.email : 'N/A';
    // story.category = Array.isArray(story.category) ? story.category.join(', ') : story.category;
    story.chapters = chapters;

    res.json(story);
  } catch (err) {
    console.error('Error getting story by ID:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy chi tiết truyện.' });
  }
};

// Cập nhật trạng thái của truyện (ví dụ: complete/writing, hoặc khóa/mở khóa)
// Hàm này có thể gộp vào updateStory tổng quát hơn
const updateStoryStatus = async (req, res) => {
    try {
        const storyId = req.params.id;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(storyId)) {
            return res.status(400).json({ error: 'ID truyện không hợp lệ.' });
        }

        const validStatuses = ['complete', 'writing', 'blocked', 'approved', 'pending']; // Giả định các trạng thái
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

// HÀM CẬP NHẬT TRUYỆN TỔNG QUÁT (bao gồm status, category, description)
const updateStory = async (req, res) => {
    try {
        const storyId = req.params.id;
        const { category, status, title, description, thumbnail } = req.body; // Thêm các trường bạn muốn admin sửa

        if (!mongoose.Types.ObjectId.isValid(storyId)) {
            return res.status(400).json({ error: 'ID truyện không hợp lệ.' });
        }

        const update = {};
        const validStatuses = ['complete', 'writing', 'blocked', 'approved', 'pending'];

        if (title !== undefined) update.title = title;
        if (description !== undefined) update.description = description;
        if (thumbnail !== undefined) update.thumbnail = thumbnail; // Cẩn thận với việc cập nhật thumbnail, có thể cần xử lý upload file riêng
        if (category !== undefined) {
            // Nếu category có thể là một mảng, frontend nên gửi dưới dạng mảng
            update.category = category;
        }
        if (status !== undefined && validStatuses.includes(status)) {
            update.status = status;
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ error: 'Không có trường nào hợp lệ được cung cấp để cập nhật.' });
        }

        const story = await Story.findByIdAndUpdate(storyId, update, { new: true, runValidators: true });
        if (!story) {
            return res.status(404).json({ error: 'Không tìm thấy truyện.' });
        }

        res.json({ message: 'Cập nhật truyện thành công.', story });
    } catch (err) {
        console.error('Error updating story:', err);
        res.status(500).json({ error: 'Lỗi server khi cập nhật truyện.' });
    }
};


// Xóa truyện (và các chương của nó, và các comments liên quan đến các chương đó)
const deleteStory = async (req, res) => {
  const storyId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({ error: 'ID truyện không hợp lệ.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const story = await Story.findById(storyId).session(session);
    if (!story) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Không tìm thấy truyện.' });
    }

    // Xóa tất cả comments thuộc về các chương của truyện này
    const chaptersInStory = await Chapter.find({ storyId: storyId }).session(session).select('_id');
    const chapterIds = chaptersInStory.map(ch => ch._id);
    await Comment.deleteMany({ chapterId: { $in: chapterIds } }).session(session);
    // Xóa tất cả báo cáo bình luận liên quan đến các comments này
    await ReportedComment.deleteMany({ 'commentId': { $in: chapterIds } }).session(session); // Giả định ReportedComment có commentId trỏ đến Comment
    // Xóa tất cả chapters của truyện
    await Chapter.deleteMany({ storyId: storyId }).session(session);
    // Xóa truyện
    await Story.deleteOne({ _id: storyId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Truyện và tất cả các chương, bình luận liên quan đã được xóa thành công.' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting story and associated data:', err);
    res.status(500).json({ error: 'Lỗi server khi xóa truyện và dữ liệu liên quan.' });
  }
};

// Lấy danh sách các thể loại độc đáo từ bảng stories (MongoDB Aggregate)
const getUniqueStoryCategories = async (req, res) => {
    try {
        const categories = await Story.distinct('category'); // Lấy tất cả các giá trị độc nhất của trường 'category'
        // Nếu category là một mảng, distinct sẽ trả về các giá trị riêng lẻ trong mảng
        // Nếu category là một string, nó sẽ trả về các giá trị string độc nhất
        res.json(categories.filter(c => c !== null && c !== '').sort()); // Lọc null/rỗng và sắp xếp
    } catch (err) {
        console.error('Error getting unique story categories:', err);
        res.status(500).json({ error: 'Lỗi server khi lấy các thể loại độc đáo.' });
    }
};

// ================= COMMENTS =================

// Hàm lấy danh sách các bình luận bị báo cáo
const getReportedComments = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', status = 'pending', reason = '' } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const filter = {};
        if (status) filter.status = status;
        if (reason) filter.reportReason = reason; // Giả sử trường là reportReason

        // Pipeline cho aggregate để tìm kiếm và join
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: 'comments', // Tên collection của Comments
                    localField: 'commentId',
                    foreignField: '_id',
                    as: 'commentDetails'
                }
            },
            { $unwind: '$commentDetails' }, // Đảm bảo commentDetails là một đối tượng
            {
                $lookup: {
                    from: 'users', // Tên collection của Users
                    localField: 'commentDetails.userId',
                    foreignField: '_id',
                    as: 'commentAuthor'
                }
            },
            { $unwind: '$commentAuthor' },
            {
                $lookup: {
                    from: 'users', // Tên collection của Users
                    localField: 'reporterUserId', // Giả sử có trường này
                    foreignField: '_id',
                    as: 'reporterUser'
                }
            },
            { $unwind: '$reporterUser' },
            // Populate thêm chapter và story nếu cần
            {
                $lookup: {
                    from: 'chapters', // Tên collection của Chapters
                    localField: 'commentDetails.chapterId',
                    foreignField: '_id',
                    as: 'chapterDetails'
                }
            },
            { $unwind: { path: '$chapterDetails', preserveNullAndEmptyArrays: true } }, // Có thể không có chapterId
            {
                $lookup: {
                    from: 'stories', // Tên collection của Stories
                    localField: 'chapterDetails.storyId',
                    foreignField: '_id',
                    as: 'storyDetails'
                }
            },
            { $unwind: { path: '$storyDetails', preserveNullAndEmptyArrays: true } }, // Có thể không có storyId
            {
                $lookup: {
                    from: 'users', // Tên collection của Users
                    localField: 'commentDetails.targetUserId',
                    foreignField: '_id',
                    as: 'targetUserProfile'
                }
            },
            { $unwind: { path: '$targetUserProfile', preserveNullAndEmptyArrays: true } }, // Có thể không có targetUserId
        ];

        if (search) {
            pipeline.unshift({ // Thêm $match vào đầu pipeline
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
            ...pipeline.filter(p => !p.$skip && !p.$limit && !p.$sort), // Lọc bỏ skip/limit/sort
            { $count: 'total' }
        ]);
        const count = totalReports.length > 0 ? totalReports[0].total : 0;
        const totalPages = Math.ceil(count / limit);

        const reportedComments = await ReportedComment.aggregate([
            ...pipeline,
            { $sort: { reportedAt: -1 } }, // Changed from reported_at to reportedAt
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
                $project: {
                    _id: 0, // Không trả về _id của reportedComment
                    reportId: '$_id',
                    commentId: '$commentDetails._id',
                    reportReason: '$reportReason',
                    reportedAt: '$reportedAt',
                    reportStatus: '$status', // Status của reportedComment
                    adminId: '$adminId',
                    actionTaken: '$actionTaken',
                    processedAt: '$processedAt',
                    commentContent: '$commentDetails.content',
                    commentStatus: '$commentDetails.status', // Status của comment
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

// Hàm lấy chi tiết một bình luận bị báo cáo theo ID báo cáo
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
                    localField: 'adminId', // Admin xử lý báo cáo
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
                    commentCreatedAt: '$commentDetails.createdAt', // Changed from created_at
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

// Hàm cập nhật trạng thái của báo cáo bình luận
const updateReportedCommentStatus = async (req, res) => {
    try {
        const reportId = req.params.id;
        const { status, actionTaken } = req.body; // Changed action_taken to actionTaken
        const adminId = req.session.user._id; // Lấy ID admin từ session (ObjectId)

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return res.status(400).json({ error: 'ID báo cáo không hợp lệ.' });
        }

        const validStatuses = ['pending', 'reviewed', 'dismissed', 'action_taken'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ được cung cấp.' });
        }

        const updatedReport = await ReportedComment.findByIdAndUpdate(
            reportId,
            { status, actionTaken, adminId, processedAt: new Date() }, // Changed processed_at to processedAt, admin_id to adminId
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

// Hàm cập nhật trạng thái của bình luận gốc (ẩn/hiển thị/xóa logic)
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

// Hàm xóa bình luận gốc (và các báo cáo liên quan)
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

        await ReportedComment.deleteMany({ commentId: commentId }).session(session); // Xóa tất cả báo cáo của bình luận này
        await Comment.deleteOne({ _id: commentId }).session(session); // Xóa bình luận gốc

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

// Hàm xóa một báo cáo cụ thể (giữ nguyên bình luận gốc)
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
        // Tổng số người dùng
        const totalUsers = await User.countDocuments();
        // Tổng số truyện
        const totalStories = await Story.countDocuments();
        // Tổng số bình luận (từ model Comment)
        const totalComments = await Comment.countDocuments();

        // Số truyện đang chờ duyệt (giả sử có trường status = 'pending' trong Story model)
        const pendingStories = await Story.countDocuments({ status: 'pending' });
        // Số bình luận bị báo cáo đang chờ xử lý (từ model ReportedComment)
        const pendingReports = await ReportedComment.countDocuments({ status: 'pending' }); // Giả sử status trong ReportedComment

        // Truyện mới trong 7 ngày qua
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newStoriesLast7Days = await Story.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // --- Bổ sung log để kiểm tra cấu trúc ---
        console.log('Raw newStoriesLast7Days from aggregation:', newStoriesLast7Days);
        console.log('Type of newStoriesLast7Days:', typeof newStoriesLast7Days);
        if (Array.isArray(newStoriesLast7Days)) {
            console.log('Is newStoriesLast7Days an array?', true);
            newStoriesLast7Days.forEach((item, index) => {
                console.log(`Item ${index}:`, item);
            });
        }

        // Thống kê thể loại truyện (Giả sử category có thể là một mảng hoặc một string)
        const storyCategories = await Story.aggregate([
            { $unwind: "$category" }, // Nếu 'category' là một mảng, unwind nó. Nếu không, bỏ qua dòng này.
            { $match: { category: { $ne: null, $ne: '' } } }, // Lọc các category rỗng hoặc null
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            },
            { $project: { _id: 0, category: "$_id", count: 1 } },
            { $sort: { count: -1 } },
            { $limit: 10 } // Giới hạn top 10 thể loại
        ]);

        res.json({
            totalUsers,
            totalStories,
            totalComments,
            pendingStories,
            pendingReports,
            newStoriesLast7Days,
            storyCategories,
            adminActivities: [] // Tạm thời rỗng 
        });
    } catch (err) {
        console.error('Lỗi khi lấy dữ liệu Dashboard:', err);
        res.status(500).json({ error: 'Lỗi server khi lấy dữ liệu Dashboard.' });
    }
};


// === EXPORT CÁC HÀM ===
module.exports = {
    // Cho người dùng
    getUsers,
    getUserById,
    updateUser,
    updateUserStatus,
    deleteUser,

    // Cho truyện
    getStories,
    getStoryById,
    updateStoryStatus, // Giữ lại nếu muốn có API cập nhật trạng thái riêng
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