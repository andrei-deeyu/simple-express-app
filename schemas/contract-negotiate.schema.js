const Joi = require('joi');

const contractNegotiateSchema = Joi.object({
  price: Joi.number().min(0).max(1000000).required(),
  transportationDate: {
    pickup: Joi.date().required(),
    delivery: Joi.date().required()
  }
});

module.exports = contractNegotiateSchema;