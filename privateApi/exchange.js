const express = require('express');
const router = express.Router();

const e = require('../helpers/errors.helper');
const { isLoggedIn } = require('../auth/middlewares');

const Exchange = require('../models/Exchange');

const { Client, UnitSystem } = require("@googlemaps/google-maps-services-js");

const postSchema = require('../schemas/post.schema');

const validateSchema = require('../helpers/validateSchema.helper');
const buildExchangeQuery = require('../helpers/buildExchangeQuery.helper');


/**
  * @desc    get exchange
  * @route   GET /exchange
*/
router.get('/exchange', isLoggedIn, async (req, res, next) => {
  try {
    const choosePage = JSON.parse( req.get('choosePage') ) ?? 1;
    const filters = JSON.parse(decodeURIComponent(req.get('filters')) || '{}');

    const perPage = 9;
    const skip = (choosePage-1) * perPage;

    const query = buildExchangeQuery(filters);

    const [result, collectionSize] = await Promise.all([
      Exchange.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate()
        .lean(),
      query.$and?.length > 0
      ? Exchange.countDocuments()
      : Exchange.estimatedDocumentCount()
    ]);

    const pagesToShow = Math.ceil(collectionSize / perPage);

    return res.json({ pagesToShow, pageActive: choosePage, result });
  } catch {
    return e.respondError500(res, next);
  }
});


/**
  * @desc    search freight
  * @route   GET /exchange/search/:s
*/
router.get('/exchange/search/:s', isLoggedIn, async (req, res, next) => {
  const regex = new RegExp(decodeURIComponent(req.params.s), 'i');

  try {
    const result = await Exchange.find({
      $or: [{ origin: regex }, { destination: regex }],
    })
      .sort({ createdAt: -1 })
      .limit(7)
      .lean();

    return res.json(result);
  } catch {
    return e.respondError500(res, next);
  }
});


/**
  * @desc    get the nearest freights to user
  * @route   GET /exchange/nearby
*/
router.get('/exchange/nearby', isLoggedIn, async (req, res, next) => {
  try {
    const reqUserGeoLocation = JSON.parse(req.get('geoLocation'));
    const nearbyRange = JSON.parse(req.get('nearbyRange')) ?? 250;

    async function get25ClosestTo(target) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const freights = await Exchange.find({
        geometry: { $exists: true },
        createdAt: { $gte: thirtyDaysAgo },
      })
        .select('geometry origin')
        .sort({ createdAt: -1 })
        .limit(3000)
        .lean();

      freights.forEach((freight, i) => {
        const distance =
          Math.abs(target.lat - freight.geometry.origin.lat) +
          Math.abs(target.lng - freight.geometry.origin.lng);

        freights[i] = {
          distance,
          geometry: freight.geometry.origin,
          originName: freight.origin,
          _id: freight._id
        };
      });

      freights.sort((a,b) => a.distance-b.distance);
      freights.splice(0, freights.length-25);

      return freights;
    }

    async function calculateDistance(origin, destinations) {
      let destinations_geometry = destinations.map((el) => el.geometry);

      const client = new Client();
      const result = await client.distancematrix({
        params: {
          key: process.env.GOOGLE_MAPS_API_KEY,
          origins: [origin],
          destinations: destinations_geometry,
          units: UnitSystem.metric,
        }
      });

      const distances = result.data.rows[0].elements
        .map((el, i) => {
          const distance_km = Math.round(el.distance.value / 1000);

          if(distance_km < nearbyRange)
            return {
              distance: distance_km,
              duration: el.duration.text,
              name: result.data.destination_addresses[i]
            };
        })
        .filter(Boolean);

      return distances;
    }

    async function getNearbyFreights(freights, distancesToTarget) {
      let queryIds = [];

      distancesToTarget.forEach((result, i) => {
        if(result.name.includes(freights[i].originName)) {
          queryIds.push(freights[i]._id);
        }
      });

      return await Exchange.find({ _id: { $in: queryIds } });
    }

    function sortNearbyFreights(freights, distancesToTarget) {
      distancesToTarget.sort((a, b) => a.distance - b.distance);

      const sortedFreights = freights.filter((freight) =>
        distancesToTarget.some((result) => result.name.includes(freight.origin))
      );

      return sortedFreights;
    }

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
router.post('/exchange', isLoggedIn, validateSchema(postSchema), async (req, res, next) => {
  try {
    const userId = req.auth.sub.split('auth0|')[1];
    const userSubscription = req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'app_metadata'].subscription
    const userSession = JSON.parse(req.get('userSession'));

    if ((req.body.pallet.type && !req.body.pallet.number) ||
        (req.body.pallet.number > 0 && !req.body.pallet.type)) {
      let error = new Error('Both pallet type and number must be present, or neither.');
      res.status(422);
      return next(error);
    }

    if(!(userSubscription === 'shipper' || userSubscription === 'forwarder')) {
      return e.respondError403(res, next);
    }


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

    const result = await Exchange.create(newPost);

    result.__v = undefined;

    require('../index').broadcast_except(userId, userSession, result);

    return res.json(result)
  } catch {
    return e.respondError500(res, next);
  }
});


/**
  * @desc    get freight's data
  * @route   GET /exchange/post/:postId
*/
router.get('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const result = await Exchange.findOne({ _id: postId }).lean();

    return res.json(result);
  } catch {
    return e.respondError404(res, next);
  }
});


/**
  * @desc   remove freight
  * @route  DELETE /exchange/post/:postId
*/
router.delete('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  try {
    const reqUserId = req.auth.sub.split('auth0|')[1];
    const userSession = JSON.parse(req.get('userSession'));
    const postId = req.params.postId;

    const freight = await Exchange.findOne({ _id: postId });

    if( !freight ) {
      return e.respondError404(res, next);
    }

    if( reqUserId !== freight.fromUser.userId ) {
      return e.respondError403(res, next);
    }

    await Exchange.findOneAndRemove({ _id: postId })

    const message = { removed: postId };
    require('../index').broadcast_except(reqUserId, userSession, message);

    return res.json({});
  } catch {
    return e.respondError500(res, next);
  }
})


/**
  * @desc   like freight
  * @route  PATCH /exchange/post/:postId
*/
router.patch('/exchange/post/:postId', isLoggedIn, async (req, res, next) => {
  try {
    const userId = req.auth.sub.split('auth0|')[1];
    const userSession = JSON.parse(req.get('userSession'));
    const postId = req.params.postId;
    const { isLiked } = req.body;

    const updatedFreight = await Exchange.findOneAndUpdate(
      { _id: postId },
      { isLiked },
      { new: true }
    );

    if( !updatedFreight ) {
      return e.respondError404(res, next);
    }

    const message = { liked: postId, eventValue: isLiked };
    require('../index').broadcast_except(userId, userSession, message);

    return res.json({})
  } catch {
    return e.respondError500(res, next)
  }
})


module.exports = router