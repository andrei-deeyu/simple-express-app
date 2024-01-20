const express = require('express');
const router = express.Router();
const e = require('../helpers/errors.helper');
const SignupLogSchema = require('../schemas/signupLog.schema');

const SignupLog = require('../models/SignupLog');

/**
  * @desc    create signupLog
  * @route   POST /signupLog
*/
router.use(express.json());

router.post('/signupLog', async (req, res, next) => {
  const result = SignupLogSchema.validate(req.body)

  if(result.error == null) {
    let newSignupLog = {
      ...req.body,
      createdAt: Date.now()
    }

    return await SignupLog.create(newSignupLog)
      .then(( result ) => {
        return res.json({ state: 'logged' });
      })
      .catch((err) => {
        return res.json({ state: 'not_logged' })
      });
  } else {
    // hack attempt
    return res.json({ state: 'nope' });
  }
});

router.get('/signupLog', async (req, res, next) => {
  res.json({ state: 'cool' });
})

module.exports = router