const Joi = require('joi');

const companySchema = Joi.object({
  name: Joi.string().trim().max(596),
  cui: Joi.number().min(0)
})

module.exports = companySchema;