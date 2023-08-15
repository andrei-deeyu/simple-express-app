const mongoose = require('mongoose')

const User = new mongoose.Schema({
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
}, { typeKey: '$type' });

module.exports = User;