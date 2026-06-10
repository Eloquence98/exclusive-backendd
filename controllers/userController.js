const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const { logger } = require('../utils/logger');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400,
      ),
    );
  }

  // 2) Filter out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
// Do not update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

// Guest user middleware
exports.createGuestUser = catchAsync(async (req, res, next) => {
  if (req.user) return next();

  if (!req.body.guestInfo) {
    return next(new AppError('Guest information required', 400));
  }

  // Check for ANY user with this email (guest OR regular)
  const existingUser = await User.findOne({
    email: req.body.guestInfo.email,
  });

  if (existingUser) {
    if (existingUser.isGuest) {
      // Reuse existing guest
      req.user = existingUser;
    } else {
      // Regular user exists - they should login instead
      return next(
        new AppError(
          'An account with this email already exists. Please login instead.',
          400,
        ),
      );
    }
  } else {
    // Create new guest user
    const newUser = await User.create({
      email: req.body.guestInfo.email,
      name: req.body.guestInfo.name,
      isGuest: true,
    });
    req.user = newUser;
  }

  next();
});

// Convert guest to registered user
exports.convertGuestToUser = async (email, userData) => {
  try {
    // Validate input
    if (!email || !userData) {
      throw new AppError('Email and user data are required', 400);
    }

    // First find the guest user and clone the query
    const query = User.findOne({ email, isGuest: true });
    const guestUser = await query.clone();

    if (!guestUser) {
      return null;
    }

    // Validate required fields for conversion
    if (!userData.password || !userData.passwordConfirm) {
      throw new AppError(
        'Password and password confirmation are required',
        400,
      );
    }

    if (userData.password !== userData.passwordConfirm) {
      throw new AppError('Passwords do not match', 400);
    }

    try {
      // Update guest user to registered user
      guestUser.isGuest = false;
      guestUser.name = userData.name;
      guestUser.password = userData.password;
      guestUser.passwordConfirm = userData.passwordConfirm;

      await guestUser.save();
      return guestUser;
    } catch (saveError) {
      // If save fails, log error and rethrow
      logger.error('Error during user conversion:', {
        error: saveError.message,
        stack: saveError.stack,
        userId: guestUser._id,
      });
      throw saveError;
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || 'Error converting guest user', 500);
  }
};
