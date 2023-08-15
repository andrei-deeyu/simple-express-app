const mongoose = require('mongoose');
const User = require('./User');

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
  admin: User.obj,
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