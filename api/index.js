const express = require('express');
const router = express.Router();

const Joi = require('joi');

const Exchange = require('../models/Exchange');

const postSchema = Joi.object({
  userId: Joi.number(),
  title: Joi.string().trim().min(3).max(256).required(),
  body: Joi.string().trim().max(596).allow('')
});

function respondError500(res, next) {
  res.status(500);
  const error = new Error('Something happened! Try again.');
  next(error);
}


// @desc    get exchange data
// @route   GET /exchange
router.get('/exchange', async (req, res, next) => {
  let choosePage;

  if( req.get('choosePage') ) choosePage = JSON.parse( req.get('choosePage') );
  else choosePage = 1;

  let perPage = 9;
  let n = (choosePage-1) * perPage;


  try {
    let result = await Exchange.find({})
    .sort({ createdAt: -1 })
    .skip(n)
    .limit(perPage)
      .populate()
      .lean();

    let collectionSize = await Exchange.estimatedDocumentCount();
    let pagesToShow = Math.ceil(collectionSize / perPage)

    return res.json({ pagesToShow, pageActive: choosePage, result });
  } catch( err ) {
    return respondError500(res, next);
  }
});

// @desc    get post data
// @route   GET /exchange/post/:postId
router.get('/exchange/post/:postId', async (req, res, next) => {
  let postId = req.params.postId;

  await Exchange.findOne({ _id: postId })
  .then(( result ) => res.json(result))
  .catch(( err ) => respondError500(res, next));
})


// @desc   create post
// @route  POST /exchange
router.post('/exchange', async (req, res, next) => {
  const result = postSchema.validate(req.body)

  if(result.error == null) {
    let newPost = {
      ...req.body,
      createdAt: Date.now()
    }

    await Exchange.create(newPost)
      .then(( result ) => {
        result.__v = undefined;
        return res.json(result)
      })
      .catch(( error ) => respondError500(res, next));
  } else {
    const error = new Error(result.error);
    res.status(422);
    return next(error);
  }
});

// @desc   remove post
// @route  DELETE /exchange/post/:postId
router.delete('/exchange/post/:postId', async (req, res, next) => {
  let postId = req.params.postId;

  await Exchange.findOneAndRemove({ _id: postId })
  .then(( result ) => res.json({ }))
  .catch(( err ) => respondError500(res, next));
})


// @desc   like post
// @route  PATCH /exchange/post/:postId
router.patch('/exchange/post/:postId', async (req, res, next) => {
  let postId = req.params.postId;
  await Exchange.findOneAndUpdate({ _id: postId }, { isLiked: req.body.isLiked })
  .then(( result ) => res.json({}) )
  .catch(( err ) => respondError500(res, next));
})


module.exports = router