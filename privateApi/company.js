const express = require('express');
const router = express.Router();

const e = require('../errors');
const { addEmployeeMetadata, searchUsers } = require('../auth/index');

const { isLoggedIn } = require('../auth/middlewares');

const Joi = require('joi');

const Company = require('../models/Company');
const companySchema = Joi.object({
  name: Joi.string().trim().max(596),
  cui: Joi.number().min(0)
})


// @desc    get all users by email
// @route   GET /searchusers
router.get('/searchusers/:s', isLoggedIn, async (req, res, next) => {
  searchUsers(req.params.s)
  .then(response => res.json(response))
  .catch(() => e.respondError404(res, next));
});

// @desc    get the company user administrates
// @route   GET /company
router.get('/company', isLoggedIn, async (req, res, next) => {
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

// @desc add employee to the company
// @route POST /company/addemployee
router.post('/company/addemployee', isLoggedIn, async (req, res, next) => {
  const req_userid = req.auth.sub.split('auth0|')[1];
  const new_employee = req.body.new_employee;
  const company_id = req.body.company_id;

  async function hasPermission() {
    return await Company.findOne({ _id: company_id })
    .then(( result ) => req_userid == result.admin.userId ? true : false)
    .catch(() => e.respondError404(res, next));
  }

  async function addEmployeeToDB() {
    return await Company.updateOne({ _id: company_id },
      { $addToSet: { employees: new_employee } }
    );
  }

  if(await hasPermission() == true) {
    await addEmployeeToDB();
    return await addEmployeeMetadata(company_id, new_employee.userId)
        .then((_response) => res.json(_response))
        .catch(err => {
          console.log(err)
          return e.respondError500(res, next)
        });
  }
  return e.respondError403(res, next)
})

module.exports = router