const express = require('express');
const router = express.Router();
const Exchange = require('../models/Exchange');
const Bid = require('../models/Bid');
const e = require('../helpers/errors.helper');

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