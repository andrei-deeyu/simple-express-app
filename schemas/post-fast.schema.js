const Joi = require('joi');

const postFastSchema = Joi.object({
  contactData: Joi.object({
    email: Joi.string().trim().min(1).max(596).required(),
    phoneNumber: Joi.string().trim().min(1).max(596).required(),
    name: Joi.string().trim().min(0).max(596).required(),
  }),
  origin: Joi.string().trim().min(3).max(596).required(),
  destination: Joi.string().trim().min(3).max(596).required(),
  distance: Joi.number().min(0).max(36000).required(),
  geometry: Joi.object({
    origin: Joi.object({
      lat: Joi.number().min(-91).max(91).required(),
      lng: Joi.number().min(-91).max(91).required(),
    }),
    destination: Joi.object({
      lat: Joi.number().min(-91).max(91).required(),
      lng: Joi.number().min(-91).max(91).required(),
    })
  }),
  details: Joi.string().trim().max(596).allow(''),
  budget: Joi.number().min(0).max(1000000).allow(null),
  payment_deadline: Joi.string().valid().trim().valid('1days', '14days', '30days', '60days', '90days').required(),
  valability: Joi.string().valid().trim().valid('1days', '3days', '7days', '14days', '30days').required(),
  pallet: {
    type: Joi.string().valid().trim().valid('europallet', 'industrialpallet', 'other', ''),
    number: Joi.number().min(0).max(17000).allow(null),
  },
  size: {
    tonnage: Joi.number().min(0).max(17000).required(), // required
    volume: Joi.number().min(0).max(30000).allow(null),
    height: Joi.number().min(0).max(2000).allow(null),
    width: Joi.number().min(0).max(2000).allow(null),
    length: Joi.number().min(0).max(2000).allow(null),
  },
  truck: {
    regime: Joi.string().valid().trim().valid('LTL', 'FTL', 'ANY').required(), // required
    type: Joi.array().items(Joi.string().valid().trim().valid('duba', 'decopertat', 'basculanta', 'transport auto', 'prelata', 'agabaritic', 'container')).max(3),
    features: Joi.array().items(Joi.string().valid().trim().valid('walkingfloor', 'ADR', 'FRIGO', 'izoterm', 'lift', 'MEGAtrailer')),
  }
});

module.exports = postFastSchema;