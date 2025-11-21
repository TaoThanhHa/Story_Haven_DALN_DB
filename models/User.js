const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
    enum: ['active', 'inactive', 'banned', 'blocked'],
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
  following: [{ 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{ 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  versionKey: false,
  collection: 'users'
});

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

userSchema.methods.comparePassword = async function (passwordInput) {
  return bcrypt.compare(passwordInput, this.password);
};

module.exports = mongoose.model('User', userSchema);
