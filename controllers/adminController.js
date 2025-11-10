const User = require('../models/User');
const Story = require('../models/Story');
const Chapter = require('../models/Chapter');
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
      .select('username email role status created_at')
      .sort({ created_at: -1 })
      .lean();

    // Thêm total_stories cho mỗi user
    for (let u of users) {
      u.total_stories = await Story.countDocuments({ userId: u._id });
    }

    res.json({ users, currentPage: page, totalPages, totalUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi lấy users' });
  }
};

// Lấy user theo ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.total_stories = await Story.countDocuments({ userId: user._id });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// Cập nhật role/status user
const updateUser = async (req, res) => {
  try {
    const update = {};
    if (req.body.role) update.role = req.body.role;
    if (req.body.status) update.status = req.body.status;

    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No fields provided' });

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User updated successfully' });
  } catch {
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// Chỉ cập nhật status (block/unblock)
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'banned'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    // Chặn admin tự khóa
    if (req.session.user._id === req.params.id && status !== 'active')
      return res.status(403).json({ error: 'Admin không thể tự khóa tài khoản của mình' });

    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: `User status changed to ${status}` });
  } catch {
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// Xóa user + stories + chapters
const deleteUser = async (req, res) => {
  const userId = req.params.id;
  if (req.session.user._id === userId)
    return res.status(403).json({ error: 'Admin không thể tự xóa tài khoản của mình' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(userId);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'User not found' });
    }

    const stories = await Story.find({ userId });
    const storyIds = stories.map(s => s._id);

    await Chapter.deleteMany({ storyId: { $in: storyIds } }).session(session);
    await Story.deleteMany({ userId }).session(session);
    await User.deleteOne({ _id: userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Lỗi server khi xóa user' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser
};
