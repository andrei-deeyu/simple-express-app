const mongoose = require('mongoose')

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
  createdAt: {
    $type: Date,
    required: true
  }
}, { typeKey: '$type' });

module.exports = mongoose.model('Bid', Bid);