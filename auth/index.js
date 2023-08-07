const { isLoggedIn } = require('./middlewares');
const e = require('../errors');

const express = require('express'),
      router = express.Router(),
      ManagementClient  = require('auth0').ManagementClient,
      Joi = require('joi');

const auth0 = new ManagementClient ({
  domain: process.env.DOMAIN,
  clientId: process.env.CLIENTID,
  clientSecret: process.env.CLIENTSECRET,
  scope: 'update:users'
});

const userSchema = Joi.object({
  name: Joi.string().trim().min(3).max(26).required()
});

const userSubscriptionSchema = Joi.object({
  type: Joi.string().trim().required().valid('shipper', 'carrier', 'forwarder', 'logistic')
});

// any route in here is pre-pended with /auth
router.get('/', (req, res) => {
  res.json({
    message:  '🔐'
  });
});


// Connect to the Auth0 Management API
auth0.getAccessToken().then(() => {
  console.log('Auth0 Management API accessed succesfully')

  /**
   * @desc    change User subscription
   * @route   POST /subscription
  */
  router.post('/subscription', isLoggedIn, async (req, res, next) => {
    const result = userSubscriptionSchema.validate(req.body);

    if(result.error === undefined) {
      await auth0.updateUser({ id: req.auth.sub }, { app_metadata: { subscription: req.body.type } })
        .then(response => res.json({ state: 'changed' }))
        .catch(err => e.respondError500(res, next));
    } else return e.respondError422(res, next);
  });

  /**
   * @desc  resend verification email
   * @route   POST /verification-email
  */
  router.get('/verification-email', isLoggedIn, async (req, res, next) => {
    await auth0.sendEmailVerification({ "user_id": req.auth.sub})
      .then(response => res.json({ "status": "pending" }))
      .catch(err => e.respondError500(res, next));
  });

  /**
   * @desc    update User through the Auth0 Management API
   * @route   POST /saveProfile
  */
  router.post('/saveProfile', isLoggedIn, async (req, res, next) => {
    const result = userSchema.validate(req.body);

    if(result.error === undefined) {
      await auth0.updateUser({ id: req.auth.sub }, { name: req.body.name })
        .then(response => res.json({ state: 'changed' }))
        .catch(err => e.respondError500(res, next));
    } else return e.respondError422(res, next);
  });
});

/**
 * @desc    update User's app_metadata.company through the Auth0 Management API
*/
async function addEmployeeMetadata(company_id, employee_userId) {
  return await auth0.updateUser({ id: employee_userId }, { app_metadata: { company: company_id } })
    .then((response) => response.app_metadata.company ? { state: 'added' } : null)
    .catch(err => err);
}

/**
 * @desc    search users by email through the Auth0 Management API
*/
async function searchUsers(email) {
  return await auth0.getUsers({ 'q': `email: *${email}*` } )
    .then((response) => {
      let users = [];
      response.forEach(element => {
        let user = {
          userId: element.user_id,
          email: element.email,
          picture: element.picture,
          name: element.name
        }
        users.push(user);
      });

      return users;
    })
    .catch(err => err);
}

module.exports = {
  router, addEmployeeMetadata, searchUsers
}