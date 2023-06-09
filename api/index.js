const express = require('express');
const router = express.Router();

const { isLoggedIn } = require('../auth/middlewares');

const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 3000 });

const Joi = require('joi');

const Exchange = require('../models/Exchange');

const postSchema = Joi.object({
  details: Joi.string().trim().max(596).allow(''),
  budget: Joi.number().min(0).max(1000000).allow(null),
  valability: Joi.string().valid().trim().valid('1days', '3days', '7days', '14days', '30days'),
  pallet: {
    type: Joi.string().valid().trim().valid('europallet', 'industrialpallet', 'other', ''),
    number: Joi.number().min(0).max(17000).allow(null),
  },
  size: {
    tonnage: Joi.number().min(0).max(17000).required(), // required
    volume: Joi.number().min(0).max(30000).allow(null),
    height: Joi.number().min(0).max(2000).allow(null),
    width: Joi.number().min(0).max(2000).allow(null),
    length: Joi.number().min(0).max(2000).allow(null),
  },
  truck: {
    regime: Joi.string().valid().trim().valid('LTL', 'FTL', 'ANY').required(), // required
    type: Joi.array().items(Joi.string().valid().trim().valid('duba', 'decopertat', 'basculanta', 'transport auto', 'prelata', 'agabaritic', 'container')).max(3),
    features: Joi.array().items(Joi.string().valid().trim().valid('walkingfloor', 'ADR', 'FRIGO', 'izoterm', 'lift', 'MEGAtrailer')),
  }
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

// save connected users in memory
let connectedUsers = [

];

wss.on('connection', (socket, request) => {
  const params = request.url?.split('?')[1].split('/');
  const userId = params[0];
  const userSession = params[1];

  connectedUsers[userId] = {
    ...connectedUsers[userId],
    [userSession]: socket
  }

  socket.on('close', () => delete connectedUsers[userId][userSession])
})

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
  .catch(() => respondError404(res, next));
});


// @desc   create post
// @route  POST /exchange
router.post('/exchange', isLoggedIn, async (req, res, next) => {
  const userId = req.auth.sub.split('auth0|')[1];
  const userSession = JSON.parse(req.get('userSession'));
  const reqUserSocketClient = connectedUsers[userId][userSession];

  const result = postSchema.validate(req.body)
console.log(req.body)
  // both palletName && palletNumber must be present, or neither
  if( req.body.pallet.type && !req.body.pallet.number) {
    let error = new Error('Ai introdus doar tipul paletului, nu si numarul acestora')
    res.status(422);
    return next(error);
  } else if( req.body.pallet.number > 0 && !req.body.pallet.type ) {
    let error = new Error('Ai introdus doar numarul de paleti, nu si tipul acestora')
    res.status(422);
    return next(error);
  }

  if(result.error == null) {
    let newPost = {
      ...req.body,
      fromUser: {
        userId: userId,
        email: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'email'],
        picture: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'picture'],
        name: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'name']
      },
      createdAt: Date.now()
    }

    await Exchange.create(newPost)
      .then(( result ) => {
        result.__v = undefined;

        wss.clients.forEach((client) => {
          if( client !== reqUserSocketClient ) client.send(JSON.stringify( result ))
        });

        return res.json(result)
      })
      .catch((err) => console.log(err));
  } else {
    return respondError422(res, next, result.error.message)
  }
});

// @desc   remove post
// @route  DELETE /exchange/post/:postId
router.delete('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  const userId = req.auth.sub.split('auth0|')[1];
  const userSession = JSON.parse(req.get('userSession'));
  const reqUserSocketClient = connectedUsers[userId][userSession];

  let postId = req.params.postId;

  await Exchange.findOneAndRemove({ _id: postId })
  .then(() => {
    wss.clients.forEach((client) => {
      if( client !== reqUserSocketClient )
        client.send(JSON.stringify({ removed: postId }))
    });
    return res.json({})
  })
  .catch(() => respondError500(res, next));
})


// @desc   like post
// @route  PATCH /exchange/post/:postId
router.patch('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  const userId = req.auth.sub.split('auth0|')[1];
  const userSession = JSON.parse(req.get('userSession'));
  const reqUserSocketClient = connectedUsers[userId][userSession];

  let postId = req.params.postId;

  await Exchange.findOneAndUpdate({ _id: postId }, { isLiked: req.body.isLiked })
  .then(() => {
    wss.clients.forEach((client) => {
      if( client !== reqUserSocketClient )
        client.send(JSON.stringify({ liked: postId, eventValue: req.body.isLiked }))
    });

    return res.json({})
  })
  .catch(() => respondError500(res, next));
})


module.exports = router