const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportedCommentSchema = new Schema({
    commentId: {
        type: Schema.Types.ObjectId,
        ref: 'Comment', // Tham chiếu đến model Comment nếu có
        required: true
    },
    reporterId: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Tham chiếu đến model User nếu có
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    reportDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true // Tự động thêm createdAt và updatedAt
});

const ReportedComment = mongoose.model('ReportedComment', reportedCommentSchema);

module.exports = ReportedComment;