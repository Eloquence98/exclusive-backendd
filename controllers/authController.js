const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const userController = require('./userController');
const { logger } = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  // Send JWT via cookie
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  // Send response
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  try {
    // EARLY CHECK: If user exists with OAuth (Google) identity, block signup
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser && existingUser.authIdentities.length > 0) {
      return next(
        new AppError(
          'This email is linked to a Google account. Please sign in with Google instead.',
          400,
        ),
      );
    }

    // First try to convert guest user if exists
    const convertedUser = await userController.convertGuestToUser(
      req.body.email,
      {
        name: req.body.name,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
      },
    );

    // If no guest user found, create new user
    const user =
      convertedUser ||
      (await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
      }));

    const url = `${process.env.FRONTEND_URL}/me`;
    await new Email(user, url).sendWelcome();
    logger.info('Welcome email sent successfully', {
      userId: user._id,
      email: user.email,
    });

    createSendToken(user, 201, res);
  } catch (error) {
    // Handle specific errors if needed
    if (error.code === 11000) {
      return next(new AppError('Email already in use.', 400));
    }
    logger.error('Error in signup process:', {
      error: error.message,
      stack: error.stack,
    });
    return next(error);
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide both email and password!', 400));
  }

  // 2) Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // EARLY CHECK: Google-only user trying password login
  if (!user.password) {
    return next(
      new AppError(
        'This account uses Google sign-in. Please sign in with Google.',
        401,
      ),
    );
  }

  // Debug log for password comparison
  const isPasswordCorrect = await user.correctPassword(password, user.password);
  if (!isPasswordCorrect) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.googleLogin = catchAsync(async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new AppError('Google ID token is required.', 400));
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    payload = ticket.getPayload();
  } catch (error) {
    return next(new AppError('Invalid Google authentication.', 401));
  }

  // eslint-disable-next-line camelcase
  const { sub: providerAccountId, email, name, email_verified } = payload;

  // eslint-disable-next-line camelcase
  if (!email || !providerAccountId || !email_verified) {
    return next(new AppError('Google account information is invalid.', 401));
  }

  let user = await User.findOne({
    authIdentities: {
      $elemMatch: {
        provider: 'google',
        providerAccountId,
      },
    },
  });

  // User has never logged in with Google before
  if (!user) {
    user = await User.findOne({ email });

    // Existing account found, attach Google login
    if (user) {
      user.authIdentities.push({
        provider: 'google',
        providerAccountId,
      });

      await user.save();
    } else {
      // Completely new user
      user = await User.create({
        name,
        email,
        authIdentities: [
          {
            provider: 'google',
            providerAccountId,
          },
        ],
      });
    }
  }

  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 800),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1) Get token, check if it's there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );

  // 2) Verification Token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401),
    );
  }

  // 4) Check if user changed password after the JWT was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  // Grant access to PROTECTED route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.protectOptional = catchAsync(async (req, res, next) => {
  if (req.headers.authorization || req.cookies.jwt) {
    return exports.protect(req, res, next);
  }
  next(); // Continue as guest
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles is an array, e.g., ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // EARLY CHECK: Google-only user has no password to reset
  if (user.authIdentities.length > 0 && !user.password) {
    return next(
      new AppError(
        'This account uses Google sign-in. Password reset is not available. Please sign in with Google.',
        400,
      ),
    );
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    logger.info('Password reset email sent successfully', {
      userId: user._id,
      email: user.email,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    logger.error('Failed to send password reset email:', {
      userId: user._id,
      email: user.email,
      error: err.message,
      stack: err.stack,
    });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // EARLY CHECK: Google-only user has no password to reset
  if (user.authIdentities.length > 0 && !user.password) {
    return next(
      new AppError(
        'This account uses Google sign-in. Password reset is not available.',
        400,
      ),
    );
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // EARLY CHECK: Google-only user has no password to update
  if (!user.password) {
    return next(
      new AppError(
        'This account uses Google sign-in. Password update is not available.',
        400,
      ),
    );
  }

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }
  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
