/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');
const Order = require('../../models/orderModel');

dotenv.config();

// Database configuration
const getDbConfig = () => {
  const options = {
    dbName: process.env.DB_NAME || 'exclusive',
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
  };

  // Priority: MONGODB_URI (localhost) > ME_CONFIG_MONGODB_URL (docker)
  let uri = process.env.MONGODB_URI || process.env.ME_CONFIG_MONGODB_URL;

  // If no URI found, use default localhost
  if (!uri) {
    uri = 'mongodb://localhost:27017';
    console.log(
      '⚠️  No MongoDB URI found, using default: mongodb://localhost:27017',
    );
  }

  return { uri, options };
};

// Connect to database
const { uri, options } = getDbConfig();

console.log(`🔌 Connecting to: ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);

mongoose
  .connect(uri, options)
  .then(() => console.log('✅ DB connection successful!'))
  .catch((err) => {
    console.error('❌ DB connection failed:', err.message);
    console.error('\n💡 Troubleshooting:');
    console.error('  1. Make sure Docker is running: docker-compose up -d');
    console.error('  2. Check if MongoDB is accessible: docker ps');
    console.error('  3. Verify MONGODB_URI in .env points to localhost:27017');
    process.exit(1);
  });

// Read JSON file
const productsPath = path.join(__dirname, 'products.json');

// Import data
const importData = async () => {
  try {
    if (!fs.existsSync(productsPath)) {
      console.log('❌ products.json not found!');
      console.log(
        '📝 Run "npm run seed:generate" first to create product data',
      );
      process.exit(1);
    }

    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

    await Product.create(products);
    console.log('✅ Products successfully loaded!');
    console.log(`📊 Imported ${products.length} products`);
  } catch (err) {
    console.error('❌ Error importing data:', err.message);
  }
  process.exit();
};

// Delete all data
const deleteData = async () => {
  try {
    await Product.deleteMany();
    await Review.deleteMany();
    await Order.deleteMany();
    console.log('✅ Data successfully deleted!');
  } catch (err) {
    console.error('❌ Error deleting data:', err.message);
  }
  process.exit();
};

// Reset data
const resetData = async () => {
  try {
    console.log('🗑️  Deleting existing data...');
    await Product.deleteMany();
    await Review.deleteMany();
    await Order.deleteMany();
    console.log('✅ Existing data deleted');

    if (!fs.existsSync(productsPath)) {
      console.log('\n❌ products.json not found!');
      console.log('📝 Run "npm run seed:fix-images" first');
      process.exit(1);
    }

    console.log('📦 Importing new data...');
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    await Product.create(products);
    console.log('✅ Products successfully loaded!');
    console.log(`📊 Imported ${products.length} products`);

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@exclusive.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin User',
        email: 'admin@exclusive.com',
        password: 'admin1234',
        passwordConfirm: 'admin1234',
        role: 'admin',
      });
      console.log('✅ Admin user created (admin@exclusive.com / admin1234)');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('\n🎉 Database seeded successfully!');
  } catch (err) {
    console.error('❌ Error resetting data:', err.message);
  }
  process.exit();
};

// Parse command line
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
} else if (process.argv[2] === '--reset') {
  resetData();
} else {
  console.log('Please specify an option:');
  console.log('  --import : Import data');
  console.log('  --delete : Delete all data');
  console.log('  --reset  : Delete then import (recommended)');
  process.exit();
}
