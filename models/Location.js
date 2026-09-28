const mongoose = require('mongoose');

/**
 * MODEL LAYER - Location Entity
 * One registered user -> Many favorite locations (One-to-Many).
 */
const locationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: 80,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: 80,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

locationSchema.index({ user: 1, city: 1, country: 1 }, { unique: true });

module.exports = mongoose.model('Location', locationSchema);
