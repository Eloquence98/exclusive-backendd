const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const authIdentitySchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    providerAccountId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your Name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  isGuest: {
    type: Boolean,
    default: false,
    select: false,
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: function () {
      return this.isNew && this.authIdentities.length === 0;
    },
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: function () {
      return this.isNew && this.authIdentities.length === 0;
    },
    validate: {
      validator: function (el) {
        return !this.password || el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  authIdentities: {
    type: [authIdentitySchema],
    default: [],
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.index(
  {
    'authIdentities.provider': 1,
    'authIdentities.providerAccountId': 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false, // removes __v
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;

    return ret;
  },
});

userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function (next) {
  if (!this.password || !this.isModified('password') || this.isNew) {
    return next();
  }

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  if (!userPassword) return false; // Google/OAuth users have no password
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Static method to handle guest to registered user conversion
userSchema.statics.convertGuestToUser = async function (email, userData) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find guest user
    const guestUser = await this.findOne({ email, isGuest: true }).session(
      session,
    );

    if (!guestUser) {
      // No guest user found, just return null
      await session.abortTransaction();
      return null;
    }

    // Update guest user to registered user
    guestUser.isGuest = false;
    guestUser.name = userData.name;
    guestUser.password = userData.password;
    guestUser.passwordConfirm = userData.passwordConfirm;
    await guestUser.save({ session });

    await session.commitTransaction();
    return guestUser;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const User = mongoose.model('User', userSchema);
module.exports = User;
