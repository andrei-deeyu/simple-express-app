const Joi = require('joi');

const bidSchema = Joi.object({
  postId: Joi.string().trim().min(6).max(596).required(),
  price: Joi.number().min(0).max(1000000).required(),
  valability: Joi.string().valid().trim().valid('1days', '3days', '7days', '14days', '30days').required()
});

module.exports = bidSchema;