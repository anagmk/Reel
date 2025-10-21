const mongoose = require('mongoose');

const userResponseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    selectedOption: {
        type: Number,
        min: 0,
        max: 3,
        required: true
    },
    isCorrect: {
        type: Boolean,
        required: true
    },
    answeredAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for faster queries and uniqueness
userResponseSchema.index({ userId: 1, videoId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('UserResponse', userResponseSchema);