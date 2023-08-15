const mongoose = require('mongoose');
const User = require('./User');

const Contract = new mongoose.Schema({
  freight_data: {
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
    }
  },
  shipper: User.obj,
  consignee: User.obj,
  price: {
    $type: Number,
    unique: false,
    required: false
  },
  transportationDate: {
    // required: false,
    pickup: {
      $type: Date,
      unique: false,
      required: false
    },
    delivery: {
      $type: Date,
      unique: false,
      required: false
    }
  },
  status: {
    $type: String,
    unique: false,
    required: true,
  },
  createdAt: {
    $type: Date,
    required: true
  }
}, { typeKey: '$type' });

module.exports = mongoose.model('Contract', Contract);