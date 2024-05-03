const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(0).max(596),
  email: Joi.string().trim().min(0).max(596),
  phoneNumber: Joi.string().trim().min(0).max(596),
  function: Joi.string().trim().min(0).max(596),
});

module.exports = registerSchema;