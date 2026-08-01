/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Product = require('../../models/productModel');

dotenv.config();

const PRODUCTS_PATH = path.join(__dirname, 'products.json');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
  });
  console.log('✅ DB connection successful!');
};

const readProductsFile = () => {
  if (!fs.existsSync(PRODUCTS_PATH)) {
    console.error('❌ products.json not found in dev-data/data/');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
};

const importProducts = async () => {
  try {
    const products = readProductsFile();
    await Product.create(products);
    console.log(`✅ ${products.length} products imported successfully!`);
  } catch (err) {
    console.error('❌ Error importing products:', err.message);
  }
  process.exit();
};

const deleteProducts = async () => {
  try {
    await Product.deleteMany();
    console.log('✅ All products deleted successfully!');
  } catch (err) {
    console.error('❌ Error deleting products:', err.message);
  }
  process.exit();
};

const resetProducts = async () => {
  try {
    console.log('🗑️  Deleting existing products...');
    await Product.deleteMany();
    console.log('✅ Products deleted');

    console.log('📦 Importing products...');
    const products = readProductsFile();
    await Product.create(products);
    console.log(`✅ ${products.length} products imported successfully!`);

    console.log('\n🎉 Products seeded successfully!');
  } catch (err) {
    console.error('❌ Error resetting products:', err.message);
  }
  process.exit();
};

const COMMANDS = {
  '--import': importProducts,
  '--delete': deleteProducts,
  '--reset': resetProducts,
};

const run = async () => {
  const command = process.argv[2];
  const handler = COMMANDS[command];

  if (!handler) {
    console.log('Usage: node seed-products.js [option]');
    console.log('  --import  Import products from products.json');
    console.log('  --delete  Delete all products');
    console.log('  --reset   Delete then re-import products');
    process.exit(1);
  }

  try {
    await connectDB();
    await handler();
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    console.error('\n💡 Troubleshooting:');
    console.error('  1. Check MONGODB_URI in .env is correct');
    console.error('  2. Verify your MongoDB instance is running and reachable');
    process.exit(1);
  }
};

run();
