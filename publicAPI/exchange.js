const express = require('express');
const router = express.Router();
const Exchange = require('../models/Exchange');

const e = require('../errors');

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


module.exports = router