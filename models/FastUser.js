const mongoose = require('mongoose')

const FastUser = new mongoose.Schema({
  name: {
    $type: String,
    required: false,
  },
  email: {
    $type: String,
    required: false,
  },
  phoneNumber: {
    $type: Number,
    required: false
  },
  function: {
    $type: String,
    required: false,
  },
  createdAt: {
    $type: Date,
    required: true,
  },
}, { typeKey: '$type' });

module.exports = mongoose.model('FastUser', FastUser);