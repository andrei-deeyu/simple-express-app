const mongoose = require('mongoose');
const User = require('./User');

const Bid = new mongoose.Schema({
  postId: {
    $type: String,
    required: true,
    unique: false
  },
  price: {
    $type: Number,
    unique: false,
    required: false
  },
  valability: {
    $type: String,
    unique: false,
    enum: ['1days', '3days', '7days', '14days', '30days'],
    required: true,
  },
  fromUser: User.obj,
  createdAt: {
    $type: Date,
    required: true
  }
}, { typeKey: '$type' });

module.exports = mongoose.model('Bid', Bid);