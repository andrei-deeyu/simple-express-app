const express = require('express');
const router = express.Router();

const e = require('../errors');

const { isLoggedIn } = require('../auth/middlewares');

const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 3000 });

const Joi = require('joi');

const Exchange = require('../models/Exchange');
const { Client, UnitSystem } = require("@googlemaps/google-maps-services-js");


const postSchema = Joi.object({
  origin: Joi.string().trim().min(3).max(596).required(),
  destination: Joi.string().trim().min(3).max(596).required(),
  distance: Joi.number().min(0).max(36000).required(),
  geometry: Joi.object({
    origin: Joi.object({
      lat: Joi.number().min(0).max(36000).required(),
      lng: Joi.number().min(0).max(36000).required(),
    }),
    destination: Joi.object({
      lat: Joi.number().min(0).max(36000).required(),
      lng: Joi.number().min(0).max(36000).required(),
    })
  }),
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

// save connected users in memory
let connectedUsers = [];

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

// @desc    search exchange
// @route   GET /exchange/search/:s
router.get('/exchange/search/:s', isLoggedIn, async (req, res, next) => {
  var regex = new RegExp('' + decodeURIComponent(req.params.s) + '', "i");

  await Exchange.find({$or: [ {origin: regex},{destination: regex} ] })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()
    .then((result) => res.json(result))
    .catch((err) => e.respondError404(res, next));
});

router.get('/exchange/nearby', async (req, res, next) => {
  const reqUserGeoLocation = JSON.parse(req.get('geoLocation'));
  const nearbyRange = JSON.parse(req.get('nearbyRange')) ?? 250;

  let exchange = await Exchange.find({
    geometry: { $exists: true },
    createdAt: { $gte: new Date().setDate(new Date().getDate() - 30) }
  }, 'geometry origin')
  .sort({createdAt: -1}).limit(3000).lean().then((freights) => freights)

  let closest = [];
  function getClosest25FromDB(exchange, target) {
    exchange.forEach((freight) => {
     let distance = Math.abs(target.lat - freight.geometry.origin.lat) + Math.abs(target.lng - freight.geometry.origin.lng)
     closest.push({distance, geometry: freight.geometry.origin, originName: freight.origin, _id: freight._id});
    })
    closest.sort((a,b) => a.distance-b.distance);
    closest.splice(0, closest.length-26);
  }

  async function calculateDistance(origin, closest25) {
    let destinations = [];
    closest25.forEach(el => destinations.push(el.geometry));

    const client = new Client();
    return client.distancematrix({
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY,
        origins: [origin],
        destinations: destinations,
        units: UnitSystem.metric,
      }
    })
    .then(result => {
      let nearbyFreights = [];
      result.data.rows[0].elements.forEach((el, i) => {
        let elDistance = Math.round(el.distance.value/1000);
        if(elDistance < nearbyRange) nearbyFreights.push({
          distance: elDistance,
          duration: el.duration.text,
          name: result.data.destination_addresses[i]
        })
      })
      return nearbyFreights;
    })
  }

  getClosest25FromDB(exchange, reqUserGeoLocation);
  let distanceResults = await calculateDistance(reqUserGeoLocation, closest)
  let queryFreights = [];
  distanceResults.forEach((result, i) => {
    if(result.name.includes(closest[i].originName)) queryFreights.push(closest[i]._id)
  })

  Exchange.find({_id: { $in: queryFreights }}).then(result => {
    let response = [];
    distanceResults.sort((a,b) => a.distance - b.distance);
    distanceResults.forEach(distanceResult => {
      result.forEach(el => {
        if(distanceResult.name.includes(el.origin)) response.push(el);
      })
    })

    return res.json(response);
  })
})

// @desc    get exchange data
// @route   GET /exchange
router.get('/exchange', isLoggedIn, async (req, res, next) => {
  let choosePage;
  let filters = {}; // sanitize them

  if( req.get('choosePage') ) choosePage = JSON.parse( req.get('choosePage') );
  else choosePage = 1;
  if( req.get('filters') ) filters = JSON.parse(decodeURIComponent(req.get('filters')))

  let perPage = 9;
  let n = (choosePage-1) * perPage;

  let queryFilters = { $and: []};

  Object.entries(filters).forEach(el => {
    let key = el[0];
    let value = el[1];

    if((typeof value[0] || typeof value[1]) == 'number' || null) {
      let minValue = { $gte: value[0] };
      let maxValue = { $lte: value[1] };

      if(minValue.$gte) queryFilters.$and.push({ [key]: minValue });
      if(maxValue.$lte) queryFilters.$and.push({ [key]: maxValue });
    } else if(typeof value[0] == 'string') {
      queryFilters.$and.push({ [key]: { $in: value } })
    }
  })

  try {
    let result = await Exchange.find(queryFilters.$and.length > 0 ? queryFilters : null)
    .sort({ createdAt: -1 })
    .skip(n)
    .limit(perPage)
      .populate()
      .lean();

    let collectionSize;
    if(queryFilters.$and.length > 0 ) collectionSize = await Exchange.countDocuments(queryFilters);
    else collectionSize = await Exchange.estimatedDocumentCount();
    let pagesToShow = Math.ceil(collectionSize / perPage)

    return res.json({ pagesToShow, pageActive: choosePage, result });
  } catch( err ) {
    console.log(err)
    return e.respondError500(res, next);
  }
});

// @desc    get post data
// @route   GET /exchange/post/:postId
router.get('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  let postId = req.params.postId;

  await Exchange.findOne({ _id: postId })
  .then(( result ) => res.json(result))
  .catch(() => e.respondError404(res, next));
});


// @desc   create post
// @route  POST /exchange
router.post('/exchange', isLoggedIn, async (req, res, next) => {
  const userId = req.auth.sub.split('auth0|')[1];
  const userSubscription = req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'app_metadata'].subscription
  const userSession = JSON.parse(req.get('userSession'));
  const reqUserSocketClient = connectedUsers[userId]?.[userSession];

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

  if((userSubscription === 'shipper' || userSubscription === 'forwarder') && result.error == null) {
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
      .catch((err) => e.respondError500(res, next));
  } else {
    return e.respondError422(res, next, result.error.message)
  }
});

// @desc   remove post
// @route  DELETE /exchange/post/:postId
router.delete('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];
  const userSession = JSON.parse(req.get('userSession'));
  const reqUserSocketClient = connectedUsers[reqUserId]?.[userSession];

  let postId = req.params.postId;

  async function hasPermission() {
    return await Exchange.findOne({ _id: postId })
    .then(( result ) => reqUserId == result.fromUser.userId ? true : false)
    .catch(() => e.respondError404(res, next));
  }

  if(await hasPermission()) {
    await Exchange.findOneAndRemove({ _id: postId })
    .then(() => {
      wss.clients.forEach((client) => {
        if( client !== reqUserSocketClient )
          client.send(JSON.stringify({ removed: postId }))
      });
      return res.json({})
    })
    .catch(() => e.respondError500(res, next));
  }
  return e.respondError403(res, next);
})


// @desc   like post
// @route  PATCH /exchange/post/:postId
router.patch('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  const userId = req.auth.sub.split('auth0|')[1];
  const userSession = JSON.parse(req.get('userSession'));
  const reqUserSocketClient = connectedUsers[userId]?.[userSession];

  let postId = req.params.postId;

  await Exchange.findOneAndUpdate({ _id: postId }, { isLiked: req.body.isLiked })
  .then(() => {
    wss.clients.forEach((client) => {
      if( client !== reqUserSocketClient )
        client.send(JSON.stringify({ liked: postId, eventValue: req.body.isLiked }))
    });

    return res.json({})
  })
  .catch(() => e.respondError500(res, next));
})


module.exports = router