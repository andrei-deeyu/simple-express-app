const mongoose = require('mongoose')

const SignupLog = new mongoose.Schema({
  CTAText: {
    $type: String,
    required: false
  },
  userAgent: {
    $type: String,
    required: false,
  },
  screenWidth: {
    $type: Number,
    required: false,
  },
  screenHeight: {
    $type: Number,
    required: false,
  },
  language: {
    $type: String,
    required: false,
  },
  platform: {
    $type: String,
    required: false,
  },
}, { typeKey: '$type' });

module.exports = mongoose.model('SignupLog', SignupLog);