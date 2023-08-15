const express = require('express');
const router = express.Router();

const e = require('../errors');

const { isLoggedIn } = require('../auth/middlewares');


const Joi = require('joi');

const Exchange = require('../models/Exchange');
const { Client, UnitSystem } = require("@googlemaps/google-maps-services-js");
const Bid = require('../models/Bid');
const Contract = require('../models/Contract');


const postSchema = Joi.object({
  origin: Joi.string().trim().min(3).max(596).required(),
  destination: Joi.string().trim().min(3).max(596).required(),
  distance: Joi.number().min(0).max(36000).required(),
  geometry: Joi.object({
    origin: Joi.object({
      lat: Joi.number().min(-91).max(91).required(),
      lng: Joi.number().min(-91).max(91).required(),
    }),
    destination: Joi.object({
      lat: Joi.number().min(0).max(36000).required(),
      lng: Joi.number().min(0).max(36000).required(),
    })
  }),
  details: Joi.string().trim().max(596).allow(''),
  budget: Joi.number().min(0).max(1000000).allow(null),
  valability: Joi.string().valid().trim().valid('1days', '3days', '7days', '14days', '30days').required(),
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

const bidSchema = Joi.object({
  postId: Joi.string().trim().min(6).max(596).required(),
  price: Joi.number().min(0).max(1000000).required(),
  valability: Joi.string().valid().trim().valid('1days', '3days', '7days', '14days', '30days').required()
});

const bidNegotiateSchema = Joi.object({
  price: Joi.number().min(0).max(1000000).required()
});

const contractSchema = Joi.object({
  pickup: Joi.date().required(),
  delivery: Joi.date().required()
});

const contractNegotiateSchema = Joi.object({
  price: Joi.number().min(0).max(1000000).required(),
  transportationDate: {
    pickup: Joi.date().required(),
    delivery: Joi.date().required()
  }
});

/**
  * @desc    get exchange
  * @route   GET /exchange
*/
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
  } catch( err ) { e.respondError500(res, next) }
});


/**
  * @desc    search freight
  * @route   GET /exchange/search/:s
*/
router.get('/exchange/search/:s', isLoggedIn, async (req, res, next) => {
  var regex = new RegExp('' + decodeURIComponent(req.params.s) + '', "i");

  await Exchange.find({$or: [ {origin: regex},{destination: regex} ] })
    .sort({ createdAt: -1 })
    .limit(7)
    .lean()
    .then((result) => res.json(result))
    .catch((err) => e.respondError404(res, next));
});


/**
  * @desc    get the nearest freights to user
  * @route   GET /exchange/nearby
*/
router.get('/exchange/nearby', isLoggedIn, async (req, res, next) => {
  const reqUserGeoLocation = JSON.parse(req.get('geoLocation'));
  const nearbyRange = JSON.parse(req.get('nearbyRange')) ?? 250;

  async function get25ClosestTo(target) {
    let exchange = await Exchange.find(
      {
        geometry: { $exists: true },
        createdAt: { $gte: new Date().setDate(new Date().getDate() - 30) },
      },
      "geometry origin"
    )
      .sort({ createdAt: -1 })
      .limit(3000)
      .lean()
      .then((freights) => freights);

    exchange.forEach((freight, i) => {
      let distance =
        Math.abs(target.lat - freight.geometry.origin.lat) +
        Math.abs(target.lng - freight.geometry.origin.lng);

      exchange[i] = {
        distance,
        geometry: freight.geometry.origin,
        originName: freight.origin, _id: freight._id
      };
    });
    exchange.sort((a,b) => a.distance-b.distance);
    exchange.splice(0, exchange.length-26);

    return exchange;
  }

  async function calculateDistance(origin, destinations) {
    let destinations_geometry = [];
    destinations.forEach(el => destinations_geometry.push(el.geometry));

    const client = new Client();
    return client.distancematrix({
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY,
        origins: [origin],
        destinations: destinations_geometry,
        units: UnitSystem.metric,
      }
    })
    .then(result => {
      let distances = [];

      result.data.rows[0].elements.forEach((el, i) => {
        let distance_km = Math.round(el.distance.value / 1000);

        if(distance_km < nearbyRange) distances.push({
          distance: distance_km,
          duration: el.duration.text,
          name: result.data.destination_addresses[i]
        })
      });

      return distances;
    })
  }

  async function getNearbyFreights(freights, distancesToTarget) {
    let queryIds = [];

    distancesToTarget.forEach((result, i) => {
      if(result.name.includes(freights[i].originName)) {
        queryIds.push(freights[i]._id);
      }
    });

    return await Exchange.find({ _id: { $in: queryIds } }).then(
      (exchange) => exchange
    );
  }

  function sortNearbyFreights(freights, distancesToTarget) {
    let sortedFreights = [];

    distancesToTarget.sort((a, b) => a.distance - b.distance);
    distancesToTarget.forEach((result) => {
      for (let i = 0; i < freights.length; i++) {
        const freight = freights[i];

        if (result.name.includes(freight.origin)) sortedFreights.push(freight);
      }
    });

    return sortedFreights;
  }

  try {
    const freights = await get25ClosestTo(reqUserGeoLocation);
    const distancesToTarget = await calculateDistance(reqUserGeoLocation, freights)

    const nearbyFreights = await getNearbyFreights(freights, distancesToTarget);
    const sortedNearbyFreights = sortNearbyFreights(nearbyFreights, distancesToTarget);

    return res.json(sortedNearbyFreights);
  } catch {
    return e.respondError404(res, next);
  }
})


/**
  * @desc    post freight
  * @route   POST /exchange
*/
router.post('/exchange', isLoggedIn, async (req, res, next) => {
  const userId = req.auth.sub.split('auth0|')[1];
  const userSubscription = req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'app_metadata'].subscription
  const userSession = JSON.parse(req.get('userSession'));

  const result = postSchema.validate(req.body)

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
        phoneNumber: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'app_metadata'].phoneNumber,
        picture: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'picture'],
        name: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'name']
      },
      createdAt: Date.now()
    }

    await Exchange.create(newPost)
      .then(( result ) => {
        result.__v = undefined;

        require('../index').broadcast_except(userId, userSession, result);

        return res.json(result)
      })
      .catch((err) => { return e.respondError500(res, next) });
  } else {
    return e.respondError422(res, next, result.error.message)
  }
});


/**
  * @desc    get freight's data
  * @route   GET /exchange/post/:postId
*/
router.get('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  let postId = req.params.postId;

  await Exchange.findOne({ _id: postId })
  .then(( result ) => res.json(result))
  .catch(() => e.respondError404(res, next));
});


/**
  * @desc   remove freight
  * @route  DELETE /exchange/post/:postId
*/
router.delete('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];
  const userSession = JSON.parse(req.get('userSession'));

  let postId = req.params.postId;

  async function hasPermission() {
    return await Exchange.findOne({ _id: postId })
    .then(( result ) => reqUserId == result.fromUser.userId ? true : false)
    .catch(() => e.respondError404(res, next));
  }

  if(await hasPermission()) {
    await Exchange.findOneAndRemove({ _id: postId })
    .then(() => {
      let message = { removed: postId };
      require('../index').broadcast_except(reqUserId, userSession, message);

      return res.json({})
    })
    .catch((err) => { return e.respondError500(res, next) });
  } else return e.respondError403(res, next);
})


/**
  * @desc   like freight
  * @route  PATCH /exchange/post/:postId
*/
router.patch('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  const userId = req.auth.sub.split('auth0|')[1];
  const userSession = JSON.parse(req.get('userSession'));

  let postId = req.params.postId;

  await Exchange.findOneAndUpdate({ _id: postId }, { isLiked: req.body.isLiked })
  .then(() => {
    let message = { liked: postId, eventValue: req.body.isLiked };
    require('../index').broadcast_except(userId, userSession, message);

    return res.json({})
  })
  .catch((err) => { return e.respondError500(res, next) });
})


/**
  * @desc    get bids for specific freight post
  * @route   GET /exchange/:postId/bids
*/
router.get('/exchange/:postId/bids', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];
  //const userSession = JSON.parse(req.get('userSession'));

  let postId = req.params.postId;

  async function isAuthor() {
    return await Exchange.findOne({ _id: postId })
    .then(( result ) => reqUserId == result.fromUser.userId ? true : false)
    .catch(() => e.respondError404(res, next));
  }

  async function bidScoreboard(reqUserBid) {
    return await Bid.find({ postId: postId })
    .sort({ price: 1 })
    .then(bids => {
      bids.sort((a, b) => a.price - b.price)

      let lowestBid = bids[0];
      let reqUserBidPosition = bids.findIndex(i => i.fromUser.userId == reqUserBid.fromUser.userId) + 1;

      return { lowestBid, reqUserBidPosition }
    });
  }

  if(await isAuthor()) {
    await Bid.find({ postId: postId })
    .then((bids) => res.json(bids) )
    .catch(() => e.respondError500(res, next));
  } else {
    await Bid.find({postId: postId, 'fromUser.userId': reqUserId})
    .then(async (reqUserBid) => {
      if(reqUserBid[0]) {
        let result = [
          reqUserBid[0],
          await bidScoreboard(reqUserBid[0])
        ]
        return res.json( result );
      }
      return res.json([])
    })
  }
});


/**
  * @desc    create/update bid offer
  * @route   PUT /exchange/:postId/bid
*/
router.put('/exchange/:postId/bid', isLoggedIn, async (req, res, next) => {
  const userId = req.auth.sub.split('auth0|')[1];
  const userSubscription = req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'app_metadata'].subscription
  const shipper_userId = JSON.parse(req.get('shipper_userId'));

  req.body.postId = req.params.postId;

  const result = bidSchema.validate(req.body)

  if((userSubscription === 'carrier' || userSubscription === 'logistic') && result.error == null) {
    let newBid = {
      ...req.body,
      fromUser: {
        userId: userId,
        email: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'email'],
        phoneNumber: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'app_metadata'].phoneNumber,
        picture: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'picture'],
        name: req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'name']
      },
      createdAt: Date.now()
    }

    async function bidScoreboard(reqUserBid) {
      return await Bid.find({ postId: req.body.postId })
      .sort({ price: 1 })
      .then(bids => {
        bids.sort((a, b) => a.price - b.price)

        let lowestBid = bids[0];
        let reqUserBidPosition = bids.findIndex(i => i.fromUser.userId == reqUserBid.fromUser.userId) + 1;

        return { lowestBid, reqUserBidPosition }
      });
    }

    await Bid.findOneAndUpdate({ 'postId': req.body.postId, 'fromUser.userId': userId }, newBid, { upsert: true, new: true })
      .then(async ( result ) => {
        //result.__v = undefined;

        /**
         * @broadcast_all the lowest bid
         * @broadcast_to_shipper_sessions the result
         */
        let lowestBid = (await bidScoreboard(result)).lowestBid;
        require('../index').broadcast_all(lowestBid);

        if(shipper_userId) { // it comes from optional HTTP headers
          require('../index').broadcast_toAllUserSessions(shipper_userId, result)
        }

        let response = [
          result,
          await bidScoreboard(result)
        ]
        return res.json( response );
      })
      .catch((err) => {
        console.log(err);
        return e.respondError500(res, next)
      })
  } else {
    return e.respondError422(res, next, result?.error?.message ?? '')
  }
});


/**
  * @desc    negotiate bid offer
  * @route   PATCH /exchange/:postId/:bidId/negotiate
*/
router.patch('/exchange/:postId/:bidId/negotiate', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];
  const bidId = req.params.bidId;
  const postId = req.params.postId;

  const result = bidNegotiateSchema.validate(req.body)

  async function hasPermission() {
    return await Exchange.findOne({ _id: postId })
    .then(( result ) => reqUserId == result.fromUser.userId ? true : false)
    .catch((err) => e.respondError404(res, next));
  }

  async function bidScoreboard() {
    return await Bid.find({ postId: postId })
    .sort({ price: 1 })
    .then(bids => {
      bids.sort((a, b) => a.price - b.price)

      let lowestBid = bids[0];

      return lowestBid;
    });
  }

  if(result.error == null && await hasPermission()) {
    await Bid.findOneAndUpdate({ _id: bidId }, { ...req.body }, { new: true })
      .then(async ( result ) => {
        //result.__v = undefined;

        /**
         * @broadcast_to_consignee that his offer has been changed, this.result
         * @broadcast_all whose lowest bid now
         */
        const consignee_userId = result.fromUser.userId;
        let lowestBid = await bidScoreboard();

        require('../index').broadcast_toAllUserSessions(consignee_userId, result);
        require('../index').broadcast_all(lowestBid);

        return res.json( result );
      })
      .catch((err) => e.respondError500(res, next))
  } else {
    return e.respondError422(res, next, result?.error?.message ?? '')
  }
});


/**
  * @desc   remove bid
  * @route  DELETE /exchange/:bidId/bids
*/
router.delete('/exchange/:bidId/bid', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];
  const userSession = JSON.parse(req.get('userSession'));

  let bidId = req.params.bidId;

  async function hasPermission() {
    return await Bid.findOne({ _id: bidId })
    .then(( result ) => reqUserId == result.fromUser.userId ? true : false)
    .catch(() => e.respondError404(res, next));
  }

  async function bidScoreboard(_postId) {
    return await Bid.find({ postId: _postId })
    .sort({ price: 1 })
    .then(bids => {
      bids.sort((a, b) => a.price - b.price)

      let lowestBid = bids[0];

      return lowestBid;
    });
  }

  if(await hasPermission()) {
    await Bid.findOneAndRemove({ _id: bidId })
    .then(async (result) => {
      /**
       * @broadcast_except_reqUser that a bid has been removed
       * @broadcast_all whose lowest bid now
       */
      let message = { removedBid: bidId, postId: result.postId };
      let lowestBid = await bidScoreboard(result.postId);

      require('../index').broadcast_except(reqUserId, userSession, message);
      require('../index').broadcast_all(lowestBid)

      return res.json({})
    })
    .catch((err) => e.respondError500(res, next));
  } else return e.respondError403(res, next);
})


/**
  * @desc    get contracts
  * @route   GET /contracts
*/
router.get('/contracts', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];

  try {
    let result = await Contract.find({
      $or: [ { 'shipper.userId': reqUserId }, { 'consignee.userId': reqUserId } ]
    })
    .sort({ createdAt: -1 })
      .populate()
      .lean();

    return res.json(result);
  } catch( err ) { e.respondError500(res, next) }
});


/**
  * @desc    get single contract
  * @route   GET /contracts/:_id
*/
router.get('/contracts/:_id', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];
  const contractId = req.params._id;

  try {
    let result = await Contract.findOne({
      _id: contractId,
      $or: [ { 'shipper.userId': reqUserId }, { 'consignee.userId': reqUserId } ]
    })
    .sort({ createdAt: -1 })
      .populate()
      .lean();

    return res.json(result);
  } catch( err ) { e.respondError500(res, next) }
});


/**
  * @desc   create contract - accept bid
  * @route  POST /exchange/:postId/:bidId/
*/
router.post('/exchange/:postId/:bidId', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];
  const userSession = JSON.parse(req.get('userSession'));

  let postId = req.params.postId;
  let bidId = req.params.bidId;

  async function hasPermission() {
    return await Exchange.findOne({ _id: postId })
    .then(( result ) => reqUserId == result.fromUser.userId ? true : false)
    .catch(() => e.respondError404(res, next));
  }

  async function removePost() {
    return await Exchange.findOneAndRemove({ _id: postId })
    .then((post) => {
      return post;
    });
  }

  async function removePostBids() {
    return await Bid.deleteMany({ postId: postId });
  }

  async function getBid() {
    return await Bid.findOne({ _id: bidId })
    .then((bid) => bid);
  }

  async function createContract(freight, bid) {
    let newContract = {
      freight_data: {
        origin: freight.origin,
        destination: freight.destination,
        distance: freight.distance,
        geometry: freight.geometry,
        details: freight.details,
        pallet: freight.pallet,
        size: freight.size
      },
      shipper: freight.fromUser,
      consignee: bid.fromUser,
      price: bid.price,
      status: 'pending_consignee',
      createdAt: Date.now()
    }

    return await Contract.create(newContract)
      .then(( result ) => {
        result.__v = undefined;

        /**
         * @broadcast_except_reqUser that a post is unavailable
         * @broadcast_to_consignee that he have a new contract
         */
        const message_post_unavailable = { postId: postId, contractCreated: result._id };
        const consignee_userId = bid.fromUser.userId;
        require('../index').broadcast_except(reqUserId, userSession, message_post_unavailable);
        require('../index').broadcast_toAllUserSessions(consignee_userId, result);

        return result;
    })
  }

  try {
    if(await hasPermission()) {
      let freight;
      let bid;

      await removePost().then(_freight => freight = _freight);
      await getBid().then(_bid => bid = _bid);
      await removePostBids();

      await createContract(freight, bid).then(result => res.json(result));
    } else return e.respondError403(res, next);
  } catch(err) {
    return e.respondError500(res, next);
  }
})


/**
  * @desc   confirm(accept) contract
  * @route  PATCH /contracts/:contractId/sign
*/
router.patch('/contracts/:contractId/confirm', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];
  const contractId = req.params.contractId;

  let otherOneParty_userId;

  const schema = contractSchema.validate(req.body);
  let insertUpdates = {
    status: 'confirmed'
  }

  async function hasPermission() {
    return await Contract.findOne({ _id: contractId })
    .then(( result ) => {
      if( result.status == 'pending_shipper' &&
          result.shipper.userId == reqUserId) {
            otherOneParty_userId = result.consignee.userId
            return true;
          }

      if( result.status == 'pending_consignee' &&
          result.consignee.userId == reqUserId &&
          schema.error == null) {
            insertUpdates.transportationDate = req.body;
            otherOneParty_userId = result.shipper.userId
            return true
        };

      return false;
    })
    .catch(() => e.respondError403(res, next));
  }

  async function confirmContract() {
    return await Contract.findOneAndUpdate({
      _id: contractId,
      $or: [ { 'shipper.userId': reqUserId }, { 'consignee.userId': reqUserId }  ]
    }, insertUpdates, { new: true })
      .then(( result ) => {
        /**
         * @broadcast_to_the_other_party that a contract has been confirmed, waiting for his aproval
         */
        if(otherOneParty_userId) {
          require('../index').broadcast_toAllUserSessions(otherOneParty_userId, result);
        }

        return result;
    })
  }

  try {
    if(await hasPermission()) {
      await confirmContract()
        .then(result => res.json(result));
    } else {
      return e.respondError500(res, next)
    }
  } catch(err) {
    return e.respondError500(res, next);
  }
})


/**
  * @desc    confirm+negotiate contract's charges
  * @route   PATCH /contracts/:contractId/negotiate
*/
router.patch('/contracts/:contractId/negotiate', isLoggedIn, async (req, res, next) => {
  const reqUserId = req.auth.sub.split('auth0|')[1];
  const contractId = req.params.contractId;

  const schema = contractNegotiateSchema.validate(req.body);

  if(schema.error == null) {
    await Contract.findOneAndUpdate(
    { _id: contractId, 'consignee.userId': reqUserId},
    { ...req.body, status: 'pending_shipper' }, { new: true })
      .then(async ( result ) => {
        //result.__v = undefined;

        /**
         * @broadcast_to_shipper a contract's charges has been changed, waiting for his aproval
         */
        const shipper_userId = result.shipper.userId;
        require('../index').broadcast_toAllUserSessions(shipper_userId, result);


        return res.json( result );
      })
      .catch((err) => e.respondError500(res, next))
  } else {
    return e.respondError422(res, next, schema?.error?.message ?? '')
  }
});


module.exports = router