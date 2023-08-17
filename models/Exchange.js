const mongoose = require('mongoose');
const User = require('./User');

const Exchange = new mongoose.Schema({
  origin: {
    $type: String,
    unique: false,
    required: true,
  },
  destination: {
    $type: String,
    unique: false,
    required: true,
  },
  distance: {
    $type: Number,
    unique: false,
    required: true,
  },
  geometry: {
    $type: Object,
    origin: {
      $type: Object,
      lat: {
        $type: String,
        unique: false,
        required: true
      },
      lng: {
        $type: String,
        unique: false,
        required: true
      }
    },
    destination: {
      $type: Object,
      lat: {
        $type: String,
        unique: false,
        required: true
      },
      lng: {
        $type: String,
        unique: false,
        required: true
      }
    }
  },
  details: {
    $type: String,
    unique: false,
    required: false,
  },
  budget: {
    $type: Number,
    unique: false,
    required: false
  },
  payment_deadline: {
    $type: String,
    unique: false,
    enum: ['1days', '14days', '30days', '60days', '90days'],
    required: true,
  },
  valability: {
    $type: String,
    unique: false,
    enum: ['1days', '3days', '7days', '14days', '30days'],
    required: true,
  },
  pallet: {
    type: {
      $type: String,
      unique: false,
      enum: ['europallet', 'industrialpallet', 'other', ''],
      required: false,
    },
    number: {
      $type: Number,
      unique: false,
      required: false,
    },
  },
  size: {
    tonnage: {
      $type: Number,
      required: true,
      unique: false
    },
    volume: {
      $type: Number,
      unique: false,
      required: false,
    },
    height: {
      $type: Number,
      unique: false,
      required: false,
    },
    width: {
      $type: Number,
      unique: false,
      required: false,
    },
    length: {
      $type: Number,
      unique: false,
      required: false,
    },
  },
  truck: {
    regime: {
      $type: String,
      unique: false,
      enum: [ 'LTL', 'FTL', 'ANY' ],
      required: true
    },
    type: {
      $type: Array,
      type: {
        $type: String,
        unique: false,
        enum: ['duba', 'decopertat', 'basculanta', 'transport auto', 'prelata', 'agabaritic', 'container'],
        required: false,
      }
    },
    features: {
      $type: Array,
      features: {
        $type: String,
        unique: false,
        enum: ['walkingfloor', 'ADR', 'FRIGO', 'izoterm', 'lift', 'MEGAtrailer'],
        required: false,
      }
    },
  },
  fromUser: User.obj,
  isLiked: {
    $type: Boolean,
    required: false
  },

  createdAt: {
    $type: Date,
    required: true
  }
}, { typeKey: '$type' });

module.exports = mongoose.model('Exchange', Exchange);