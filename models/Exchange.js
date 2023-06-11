const mongoose = require('mongoose')

const Exchange = new mongoose.Schema({
  details: {
    $type: String,
    unique: false
  },
  budget: {
    $type: Number,
    unique: false,
    required: false
  },
  valability: {
    $type: String,
    unique: false,
    enum: ['1days', '3days', '7days', '14days', '30days']
  },
  pallet: {
    type: {
      $type: String,
      unique: false,
      enum: ['europallet', 'industrialpallet', 'other', ''],
    },
    number: {
      $type: Number,
      unique: false
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
      unique: false
    },
    height: {
      $type: Number,
      unique: false
    },
    width: {
      $type: Number,
      unique: false
    },
    length: {
      $type: Number,
      unique: false,
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
        enum: ['duba', 'decopertat', 'basculanta', 'transport auto', 'prelata', 'agabaritic', 'container']
      }
    },
    features: {
      $type: Array,
      features: {
        $type: String,
        unique: false,
        enum: ['walkingfloor', 'ADR', 'FRIGO', 'izoterm', 'lift', 'MEGAtrailer']
      }
    },
  },
  fromUser: {
    userId: {
      $type: String,
      required: true,
    },
    email: {
      $type: String,
      required: true,
    },
    picture: {
      $type: String,
      required: true,
    },
    name: {
      $type: String,
      required: false,
    },
  },
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