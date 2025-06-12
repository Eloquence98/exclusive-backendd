/* eslint-disable no-console */
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

// Safety check - never run in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ This script should never run in production!');
  process.exit(1);
}

// Load environment config
const envPath = path.join(__dirname, '../../.env.development');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env.development file');
  process.exit(1);
}

dotenv.config({ path: envPath });

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || process.env.ME_CONFIG_MONGODB_URL,
      {
        dbName: process.env.DB_NAME,
        serverSelectionTimeoutMS: 5000,
      },
    );
    console.log('DB connection successful!');
  } catch (err) {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  }
};

// Data import/delete functions
const importData = async (model, data) => {
  try {
    await model.create(data);
    console.log(`${model.modelName} data imported (${data.length} documents)`);
    return true;
  } catch (err) {
    console.error(`Error importing ${model.modelName}:`, err.message);
    return false;
  }
};

const deleteData = async (model) => {
  try {
    const result = await model.deleteMany();
    console.log(
      `${model.modelName} data deleted (${result.deletedCount} documents)`,
    );
    return true;
  } catch (err) {
    console.error(`Error deleting ${model.modelName}:`, err.message);
    return false;
  }
};

// Main execution
(async () => {
  await connectDB();

  // Read data files
  const data = {
    products: JSON.parse(
      fs.readFileSync(`${__dirname}/products.json`, 'utf-8'),
    ),
    users: JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8')),
    reviews: JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')),
  };

  // Process command
  const command = process.argv[2];
  if (command === '--import') {
    const results = await Promise.all([
      importData(Product, data.products),
      importData(User, data.users),
      importData(Review, data.reviews),
    ]);
    console.log(
      results.every(Boolean)
        ? 'All data imported successfully'
        : 'Some imports failed',
    );
  } else if (command === '--delete') {
    const results = await Promise.all([
      deleteData(Product),
      deleteData(User),
      deleteData(Review),
    ]);
    console.log(
      results.every(Boolean)
        ? 'All data deleted successfully'
        : 'Some deletions failed',
    );
  } else {
    console.log('Usage: npm run data:import|data:delete');
  }

  await mongoose.disconnect();
  process.exit();
})();
