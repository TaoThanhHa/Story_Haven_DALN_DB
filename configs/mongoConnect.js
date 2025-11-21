const mongoose = require("mongoose");

const connectMongoDB = async () => {
  try {
    const uri = "mongodb://127.0.0.1:27017/story_haven"; 
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

connectMongoDB();

module.exports = mongoose;
