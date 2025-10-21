const mongoose = require('mongoose')

const adminSchema = new mongoose.Schema({
    email: {
        type:String,
        required: true,

    },
    
    password: {
        type: String,
        required : true,
    }
    ,
    role: {
        type: String,
        enum: ['developer', 'uploader'],
        default: 'developer'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('admin', adminSchema);