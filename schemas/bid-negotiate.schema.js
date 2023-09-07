const Joi = require('joi');

const bidNegotiateSchema = Joi.object({
  price: Joi.number().min(0).max(1000000).required()
});

module.exports = bidNegotiateSchema;