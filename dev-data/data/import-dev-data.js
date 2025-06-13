/* eslint-disable no-console */
const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

dotenv.config();

// Database connection
mongoose
  .connect(process.env.DEV_DATA_MONGODB_URI, {
    dbName: process.env.DB_NAME,
  })
  .then(() => {
    console.log('DB connection successful!');
  });

// READ JSON FILE
const items = JSON.parse(
  fs.readFileSync(`${__dirname}/products.json`, 'utf-8'),
);
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Product.create(items);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
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
