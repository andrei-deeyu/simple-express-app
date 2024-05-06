const Joi = require('joi');

const SignupLogSchema = Joi.object({
  CTAText: Joi.string(),
  CTAID: Joi.string(),
  userAgent: Joi.string(),
  screenWidth: Joi.number(),
  screenHeight: Joi.number(),
  language: Joi.string(),
  platform: Joi.string(),
});

module.exports = SignupLogSchema;