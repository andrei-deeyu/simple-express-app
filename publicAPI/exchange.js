const express = require('express');
const router = express.Router();
const Exchange = require('../models/Exchange');
const Bid = require('../models/Bid');
const e = require('../helpers/errors.helper');
const validateSchema = require('../helpers/validateSchema.helper');
const postFastSchema = require('../schemas/post-fast.schema');
const registerSchema = require('../schemas/register.schema');
const FastUser = require('../models/FastUser');

/**
  * @desc    post register
  * @route   POST /register
*/
router.post('/register', validateSchema(registerSchema), async (req, res, next) => {
  try {
    const newUser = {
      ...req.body,
      createdAt: Date.now()
    }

    const result = await FastUser.create(newUser);

    return res.json({ status: 'success'});
  } catch (error) {
    console.log(error)
    return e.respondError500(res, next);
  }
});

/**
  * @desc    post freight fast
  * @route   POST /exchange-fast
*/
router.post('/exchange-fast', validateSchema(postFastSchema), async (req, res, next) => {
  try {
    const userSession  = JSON.parse(req.get('userSession'));

    if ((req.body.pallet.type && !req.body.pallet.number) ||
        (req.body.pallet.number > 0 && !req.body.pallet.type)) {
      let error = new Error('Both pallet type and number must be present, or neither.');
      res.status(422);
      return next(error);
    }

    const { contactData } = req.body;
    const { email, phoneNumber, name } = contactData;

    let newPost = {
      ...req.body,
      fromUser: {
        userId: 'fastRegister',
        email: email,
        phoneNumber: phoneNumber,
        picture: 'f',
        name: name
      },
      createdAt: Date.now()
    }

    const result = await Exchange.create(newPost);

    result.__v = undefined;

    require('../index').broadcast_except('', userSession, result);

    return res.json(result)
  } catch (err) {
    return e.respondError500(res, next);
  }
});

/**
  * @desc    get the latest 3 exchange data
  * @route   GET /exchange
*/
router.get('/exchange', async (req, res, next) => {
  try {
    let result = await Exchange.find({})
    .sort({ createdAt: -1 })
    .skip(0)
    .limit(3)
      .populate()
      .lean();

    return res.json(result);
  } catch( err ) {
    console.log(err)
    return e.respondError500(res, next) }
});

/**
  * @desc    get post data
  * @route   GET /exchange/post/:postId
*/
router.get('/exchange/post/:postId', async (req, res, next) => {
  let postId = req.params.postId;

  await Exchange.findOne({ _id: postId })
  .then(( result ) => res.json(result))
  .catch(( err ) => e.respondError404(res, next));
});


/**
  * @desc    get anonymous bids for specific freight post
  * @route   GET /exchange/:postId/bids
*/
router.get('/exchange/:postId/bids', async (req, res, next) => {
  let postId = req.params.postId;

  await Bid.find({ postId: postId })
    .then((bids) => {
      bids.forEach(el => {
        el.fromUser = {
          userId: '',
          email: 'xx@gmail.com',
          phoneNumber: 0o700000000,
          picture: 'https://cdn2.iconfinder.com/data/icons/gaming-and-beyond-part-2-1/80/User_gray-512.png', // change this!
          name: 'Anonymous User'
        }
      });
      console.log(bids)
      return res.json(bids);
    })
    .catch(() => e.respondError500(res, next));
});

module.exports = router