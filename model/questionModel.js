const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'video',
        required: true,
    },

    questionText: {
        type: String,
        required: true,
    },

    options: {
        type: [{
            text: {
                type: String,
                required: true
            },
            isCorrect: {
                type: Boolean,
                required: true
            }
        }],
        required: true,
    },

    showAt: {
        type: String,
        enum: ['end', 'during'],
        required: true
    }
})

module.exports = mongoose.model('question', questionSchema);