const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const adminSchema = require('./model/adminModel');
const connectDB = require('./db/connectDB');
const saltround = 10;

const createFirstAdmin = async () => {
    try {
        await connectDB();
        const email = 'admin@example.com';
        const password = 'Admin@123';
        const existingAdmin = await adminSchema.findOne({ email });

        if (existingAdmin) {
            console.log('Admin already exists. No new admin created.');
            process.exit(0);
        }
        const hashedPassword = await bcrypt.hash(password, saltround);
        const newAdmin = new adminSchema({
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
