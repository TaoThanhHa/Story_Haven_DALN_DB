const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportedCommentSchema = new Schema({
    commentId: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        required: true
    },
    reporterId: {
        type: Schema.Types.ObjectId,
        ref: 'User', 
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
    timestamps: true 
});

const ReportedComment = mongoose.model('ReportedComment', reportedCommentSchema);

module.exports = ReportedComment;