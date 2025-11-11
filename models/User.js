const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// 🧱 Định nghĩa Schema tương đương bảng `users` trong MySQL
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    maxlength: 100
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phonenumber: {
    type: String,
    default: '',
    maxlength: 20
  },
  role: {
    type: String,
    enum: ['user', 'author', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  },
  avatar: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  // BỔ SUNG HAI TRƯỜNG MỚI NÀY
  following: [{ // Danh sách những người dùng mà user này đang theo dõi
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{ // Danh sách những người dùng đang theo dõi user này
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  versionKey: false,
  collection: 'users'
});

// 🔐 Tự động mã hoá mật khẩu khi lưu
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🧩 So sánh mật khẩu
userSchema.methods.comparePassword = async function (passwordInput) {
  return bcrypt.compare(passwordInput, this.password);
};

module.exports = mongoose.model('User', userSchema);
