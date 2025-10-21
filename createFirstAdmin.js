require('dotenv').config(); // load .env first

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./model/adminModel'); // corrected naming

const saltround = 10;

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected...');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const createFirstAdmin = async () => {
    try {
        await connectDB();

        const email = 'admin@example.com';
        const password = 'Admin@123';

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            console.log('Admin already exists. No new admin created.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(password, saltround);

        const newAdmin = new Admin({
            email,
            password: hashedPassword
        });

        await newAdmin.save();
        console.log('First admin created successfully with email:', email);
        process.exit(0);

    } catch (error) {
        console.error('Error creating first admin:', error);
        process.exit(1);
    }
};

createFirstAdmin();
