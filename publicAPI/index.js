const express = require('express');
const router = express.Router();
const Exchange = require('../models/Exchange');

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


// @desc    get the latest 3 exchange data
// @route   GET /exchange
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
    return respondError500(res, next) }
});

// @desc    get post data
// @route   GET /exchange/post/:postId
router.get('/exchange/post/:postId', async (req, res, next) => {
  let postId = req.params.postId;

  await Exchange.findOne({ _id: postId })
  .then(( result ) => res.json(result))
  .catch(( err ) => respondError404(res, next));
});


module.exports = router