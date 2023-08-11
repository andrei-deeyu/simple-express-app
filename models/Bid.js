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
  valability: {
    $type: String,
    unique: false,
    enum: ['1days', '3days', '7days', '14days', '30days'],
    required: true,
  },
  // transportationDate: {
  //   pickup: {
  //     $type: Date,
  //     unique: false,
  //     required: true
  //   },
  //   delivery: {
  //     $type: Date,
  //     unique: false,
  //     required: true
  //   }
  // },
  fromUser: {
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
  createdAt: {
    $type: Date,
    required: true
  }
}, { typeKey: '$type' });

module.exports = mongoose.model('Bid', Bid);