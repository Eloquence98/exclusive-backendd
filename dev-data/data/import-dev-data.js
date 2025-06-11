/* eslint-disable no-console */
/**
 * Development data import/delete script.
 * This is a development-only tool, console statements are intentionally kept for direct feedback.
 */

const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

// This script is for development only, so always use development environment
// Load environment config
const envPath = path.join(
  __dirname,
  `../../.env.${process.env.NODE_ENV || 'development'}`,
);
dotenv.config({ path: envPath });

const { MONGODB_URI } = process.env;

mongoose
  .connect(MONGODB_URI, {
    dbName: process.env.DB_NAME,
  })
  .then(() => {
    console.log('DB connection successful!');
  });

// READ JSON FILES
const products = JSON.parse(
  fs.readFileSync(`${__dirname}/products.json`, 'utf-8'),
);
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);

// IMPORT DATA INTO DATABASE
const importData = async () => {
  try {
    await Product.create(products);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DATABASE
const deleteData = async () => {
  try {
    await Product.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
