const Joi = require('joi');

const contractSchema = Joi.object({
  pickup: Joi.date().required(),
  delivery: Joi.date().required()
});

module.exports = contractSchema;