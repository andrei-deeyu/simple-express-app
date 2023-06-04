const { isLoggedIn } = require('./middlewares');

const express = require('express'),
      router = express.Router(),
      fetch = require('node-fetch'),
      ManagementClient  = require('auth0').ManagementClient ;

const auth0 = new ManagementClient ({
  domain: process.env.DOMAIN,
  clientId: process.env.CLIENTID,
  clientSecret: process.env.CLIENTSECRET,
  scope: 'update:users'
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

//audience: 'https://dev-deeyu.eu.auth0.com/api/v2/'
// Connect to the Auth0 Management API
auth0.getAccessToken().then((management_access_token) => {
  console.log(management_access_token)

  // @desc  resend verification email
  // @route   POST /verification-email
  router.get('/verification-email', isLoggedIn, async (req, res, next) => {
    // let user_email = req.auth[`${process.env.ACCESS_TOKEN_NAMESPACE}email`]
    console.log(req.auth)
    console.log(req.auth.sub)

    await fetch('https://dev-deeyu.eu.auth0.com/api/v2/jobs/verification-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${management_access_token}`,
      },
      body: JSON.stringify({ "user_id": req.auth.sub})
    })
    .then(( res ) => res.json() )
    .then(( response ) => {
      console.log(response)
      if(response.status == "pending") return res.json({ "status": "pending" });
      return respondError500(res, next);
    });
  });
});

module.exports = router;