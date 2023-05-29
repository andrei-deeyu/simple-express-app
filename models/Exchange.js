const mongoose = require('mongoose')

const Exchange = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
  },

  title: {
    type: String,
    required: true
  },

  body: {
    type: String,
    required: false
  },

  isLiked: {
    type: Boolean,
    required: false
  },

  createdAt: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model('Exchange', Exchange);