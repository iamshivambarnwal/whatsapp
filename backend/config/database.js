'use strict';

const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp_saas';

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,   // Fail fast if MongoDB not available
      socketTimeoutMS: 10000,           // 10s socket timeout
    });

    console.log('✅ MongoDB connected successfully');
    console.log(`📁 Database: whatsapp_saas`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected — running in degraded mode (no DB logging)');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.warn('⚠️  MongoDB not available — running in degraded mode (no DB logging)');
    console.warn('   MongoDB error:', error.message);
    console.warn('   WhatsApp queue and worker will continue to function.');
    console.warn('   Start MongoDB to enable full logging and message persistence.');
    // Do NOT exit — let the server run so BullMQ queue+worker still work
  }
};

module.exports = connectDB;
