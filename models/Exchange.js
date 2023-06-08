const mongoose = require('mongoose')

const Exchange = new mongoose.Schema({
  fromUser: {
    userId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    picture: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: false,
    },
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