// configs/mongoConnect.js
const mongoose = require("mongoose");

const connectMongoDB = async () => {
  try {
    const uri = "mongodb://127.0.0.1:27017/story_haven"; 
    
    await mongoose.connect(uri, {
      // các tùy chọn này không còn cần thiết từ Mongoose v7+
      serverSelectionTimeoutMS: 5000, // timeout 5s nếu MongoDB không phản hồi
    });

    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1); // dừng server nếu không kết nối được
  }
};

// Kết nối ngay khi file được gọi
connectMongoDB();

module.exports = mongoose;
