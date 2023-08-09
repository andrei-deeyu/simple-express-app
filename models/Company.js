const mongoose = require('mongoose')

const Company = new mongoose.Schema({
  name: {
    $type: String,
    unique: false,
    required: true,
  },
  cui: {
    $type: Number,
    unique: true,
    required: true
  },
  admin: {
    userId: {
      $type: String,
      required: true,
    },
    email: {
      $type: String,
      required: true,
    },
    phoneNumber: {
      $type: Number,
      required: true
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
  employees: {
    $type: Array,
    employee: {
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
    }
  },
  createdAt: {
    $type: Date,
    required: true
  }
}, { typeKey: '$type' });

module.exports = mongoose.model('Company', Company);