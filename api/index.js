const express = require('express');
const router = express.Router();

const { isLoggedIn } = require('../auth/middlewares');

const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 3000 });

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


// @desc    get exchange data
// @route   GET /exchange
router.get('/exchange', isLoggedIn, async (req, res, next) => {
  console.log(req.body)
  console.log(req.auth)
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
    console.log(err)
    return respondError500(res, next);
  }
});

// @desc    get post data
// @route   GET /exchange/post/:postId
router.get('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  let postId = req.params.postId;

  await Exchange.findOne({ _id: postId })
  .then(( result ) => res.json(result))
  .catch(( err ) => respondError404(res, next));
});


// @desc   create post
// @route  POST /exchange
router.post('/exchange', isLoggedIn, async (req, res, next) => {
  const result = postSchema.validate(req.body)

  if(result.error == null) {
    let newPost = {
      ...req.body,
      createdAt: Date.now()
    }

    await Exchange.create(newPost)
      .then(( result ) => {
        result.__v = undefined;

        wss.clients.forEach(function each(client, value2) {
          client.send(JSON.stringify( result ))
        });
        return res.json(result)
      })
      .catch(( error ) => respondError500(res, next));
  } else {
    return respondError422(res, next, result.error.message)
  }
});

// @desc   remove post
// @route  DELETE /exchange/post/:postId
router.delete('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  let postId = req.params.postId;

  await Exchange.findOneAndRemove({ _id: postId })
  .then(( result ) => {
    wss.clients.forEach(function each(client, value2) {
      client.send(JSON.stringify({ removed: postId }))
    });
    return res.json({ })
  })
  .catch(( err ) => {
    console.log(err)
    respondError500(res, next)
  });
})


// @desc   like post
// @route  PATCH /exchange/post/:postId
router.patch('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  let postId = req.params.postId;
  await Exchange.findOneAndUpdate({ _id: postId }, { isLiked: req.body.isLiked })
  .then(( result ) => {
    wss.clients.forEach(function each(client, value2) {
      client.send(JSON.stringify({ liked: postId, eventValue: req.body.isLiked }))
    });

    return res.json({})
  })
  .catch(( err ) => respondError500(res, next));
})


module.exports = router