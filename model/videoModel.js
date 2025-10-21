const mongoose = require('mongoose')

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,

    },
    videoFilePath: {
        type: String,//file location
        required : true,
    },

    duration:{
        type: Number,
        required: true,
    },
    order:{
        type: Number,
        required: true,
    },
    isActive:{
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
})

module.exports = mongoose.model('video', videoSchema);