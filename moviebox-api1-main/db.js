const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/moviezone';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

// --- Schemas ---

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isPremium: { type: Boolean, default: false },
}, { timestamps: true });

const adSchema = new mongoose.Schema({
    title: String,
    imageUrl: String,
    linkUrl: String,
    active: { type: Boolean, default: true },
}, { timestamps: true });

const contentSchema = new mongoose.Schema({
    featured: { type: Array, default: [] },
}, { timestamps: true });

const settingsSchema = new mongoose.Schema({
    siteName: { type: String, default: 'MovieZone' },
    maintenanceMode: { type: Boolean, default: false },
    premiumPrice: { type: Number, default: 1000 },
}, { timestamps: true });

const analyticsSchema = new mongoose.Schema({
    revenue: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Ad = mongoose.model('Ad', adSchema);
const Content = mongoose.model('Content', contentSchema);
const Settings = mongoose.model('Settings', settingsSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = { connectDB, User, Ad, Content, Settings, Analytics };
