const express = require('express');
const router = express.Router();

const e = require('../errors');

const { isLoggedIn } = require('../auth/middlewares');

const Joi = require('joi');

const Company = require('../models/Company');
const companySchema = Joi.object({
  name: Joi.string().trim().max(596),
  cui: Joi.number().min(0)
})


// @desc    get company data
// @route   GET /company
router.get('/company', isLoggedIn, async (req, res, next) => {
  // const userId = req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'app_metadata'];
  const userId = req.auth.sub.split('auth0|')[1];
  await Company.findOne({ 'admin.userId':  userId })
  .then(( result ) => res.json(result))
  .catch(() => e.respondError404(res, next));
});


// @desc   create company
// @route  POST /company
router.post('/company', isLoggedIn, async (req, res, next) => {
  const userId = req.auth.sub.split('auth0|')[1];
  console.log('got')
  console.log(req.body)
  const result = companySchema.validate(req.body)

  if(result.error == null) {
    let newCompany = {
      ...req.body,
      admin: {
        userId: userId,
        email: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'email'],
        picture: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'picture'],
        name: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'name']
      },
      createdAt: Date.now()
    }

    await Company.create(newCompany)
      .then(( result ) => {
        result.__v = undefined;
        return res.json(result)
      })
      .catch((err) => {
        if( err.code === 11000 ) return e.respondError422(res, next, "Company already exists")
        return e.respondError422(res, next)
      });
  } else {
    console.log(result.error.message)
    return e.respondError422(res, next, result.error.message)
  }
});

module.exports = router