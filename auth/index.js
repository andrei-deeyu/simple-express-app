const { isLoggedIn } = require('./middlewares');

const express = require('express'),
      router = express.Router(),
      fetch = require('node-fetch'),
      ManagementClient  = require('auth0').ManagementClient,
      Joi = require('joi');

const auth0 = new ManagementClient ({
  domain: process.env.DOMAIN,
  clientId: process.env.CLIENTID,
  clientSecret: process.env.CLIENTSECRET,
  scope: 'update:users'
});

const userSchema = Joi.object({
  name: Joi.string().trim().min(3).max(15).required()
});

function respondError500(res, next) {
  res.status(500);
  const error = new Error('Something happened! Try again.');
  next(error);
}

function respondError422(res, next, message) {
  res.status(422);
  const error = new Error(message ?? 'Bad input');
  next(error);
}

function respondError404(res, next) {
  res.status(404);
  const error = new Error('Not found');
  next(error);
}


// any route in here is pre-pended with /auth
router.get('/', (req, res) => {
  res.json({
    message:  '🔐'
  });
});


// Connect to the Auth0 Management API
auth0.getAccessToken().then((management_access_token) => {
  console.log(management_access_token)

  // @desc  resend verification email
  // @route   POST /verification-email
  router.get('/verification-email', isLoggedIn, async (req, res, next) => {
    await auth0.sendEmailVerification({ "user_id": req.auth.sub})
      .then(response => res.json({ "status": "pending" }))
      .catch(err => respondError500(res, next));
  });

  // @desc    update User through the Auth0 Management API
  // @route   POST /saveProfile
  router.post('/saveProfile', isLoggedIn, async (req, res, next) => {
    const result = userSchema.validate(req.body);

    if(result.error === undefined) {
      await auth0.updateUser({ id: req.auth.sub }, { name: req.body.name })
        .then(response => res.json({ state: 'changed' }))
        .catch(err => respondError500(res, next));
    } else return respondError422(res, next);
  });
});

module.exports = router;