const express = require('express');
const router = express.Router();

const e = require('../helpers/errors.helper');
const { isLoggedIn } = require('../auth/middlewares');

const Exchange = require('../models/Exchange');
const Bid = require('../models/Bid');

const bidSchema = require('../schemas/bid.schema');
const bidNegotiateSchema = require('../schemas/bid-negotiate.schema');

const validateSchema = require('../helpers/validateSchema.helper');


/**
  * @desc    get bids for specific freight post
  * @route   GET /exchange/:postId/bids
*/
router.get('/exchange/:postId/bids', isLoggedIn, async (req, res, next) => {
  try {
    const reqUserId = req.auth.sub.split('auth0|')[1];
    const postId = req.params.postId;

    async function isAuthor() {
      try {
        const result = await Exchange.findOne({ _id: postId });
        return reqUserId == result.fromUser.userId;
      } catch {
        return false;
      }
    }

    async function bidScoreboard(reqUserBid) {
      try {
        const bids = await Bid.find({ postId }).sort({ price: 1 });
        bids.sort((a, b) => a.price - b.price);

        const lowestBid = bids[0];
        const reqUserBidPosition = bids.findIndex((i) =>
          i.fromUser.userId == reqUserBid.fromUser.userId
        ) + 1;

        return { lowestBid, reqUserBidPosition };
      } catch (err) {
        throw err;
      }
    }

    const author = await isAuthor();

    if (author) {
      const bids = await Bid.find({ postId });
      return res.json(bids);
    } else {
      const reqUserBid = await Bid.find({ postId, 'fromUser.userId': reqUserId });

      if (reqUserBid[0]) {
        const result = [
          reqUserBid[0],
          await bidScoreboard(reqUserBid[0]),
        ];
        return res.json(result);
      }

      return res.json([]);
    }
  } catch {
    return e.respondError500(res, next);
  }
});


/**
  * @desc    create/update bid offer
  * @route   PUT /exchange/:postId/bid
*/
router.put('/exchange/:postId/bid', isLoggedIn, async (req, res, next) => {
  try {
    const userId = req.auth.sub.split('auth0|')[1];
    const userSubscription = req.auth[process.env.ACCESS_TOKEN_NAMESPACE + 'app_metadata'].subscription
    const shipperUserId = JSON.parse(req.get('shipper_userId'));
    const postId = req.params.postId;

    const schema = bidSchema.validate({...req.body, postId })

    if(!(userSubscription === 'carrier' || userSubscription === 'logistic')) {
      return e.respondError403(res, next);
    }
    if(schema.error !== undefined) {
      return e.respondError422(res, next, schema.error.message);
    }

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
      try {
        const bids = await Bid.find({ postId }).sort({ price: 1 });
        bids.sort((a, b) => a.price - b.price);

        const lowestBid = bids[0];
        const reqUserBidPosition = bids.findIndex((i) =>
          i.fromUser.userId == reqUserBid.fromUser.userId
        ) + 1;

        return { lowestBid, reqUserBidPosition };
      } catch (err) {
        throw err;
      }
    }

    const result = await Bid.findOneAndUpdate(
      { 'postId': postId, 'fromUser.userId': userId },
      newBid,
      { upsert: true, new: true }
    );

    let lowestBid = (await bidScoreboard(result)).lowestBid;
    require('../index').broadcast_all(lowestBid);

    if (shipperUserId) {
      require('../index').broadcast_toAllUserSessions(shipperUserId, result);
    }

    const response = [
      result,
      await bidScoreboard(result)
    ];

    return res.json(response);
  } catch {
    return e.respondError500(res, next);
  }
});


/**
  * @desc    negotiate bid offer
  * @route   PATCH /exchange/:postId/:bidId/negotiate
*/
router.patch('/exchange/:postId/:bidId/negotiate', isLoggedIn, validateSchema(bidNegotiateSchema), async (req, res, next) => {
  try {
    const reqUserId = req.auth.sub.split('auth0|')[1];
    const bidId = req.params.bidId;
    const postId = req.params.postId;

    async function checkPermission(reqUserId, postId) {
      const exchange = await Exchange.findOne({ _id: postId });
      return reqUserId === exchange.fromUser.userId;
    }

    async function getLowestBid(postId) {
      const bids = await Bid.find({ postId }).sort({ price: 1 });
      bids.sort((a, b) => a.price - b.price);
      return bids[0];
    }

    const hasPermission = await checkPermission(reqUserId, postId);
    if (!hasPermission) {
      return e.respondError403(res, next);
    }

    const updatedBid = await Bid.findOneAndUpdate(
      { _id: bidId },
      { ...req.body },
      { new: true }
    );
      /**
      * @broadcast_to_consignee that his offer has been changed, this.result
      * @broadcast_all whose lowest bid now
      */
    const consignee_userId = updatedBid.fromUser.userId;
    const lowestBid = await getLowestBid(postId);

    require('../index').broadcast_toAllUserSessions(consignee_userId, updatedBid);
    require('../index').broadcast_all(lowestBid);

    return res.json( result );
  } catch {
    return e.respondError500(res, next);
  }
});


/**
  * @desc   remove bid
  * @route  DELETE /exchange/:bidId/bids
*/
router.delete('/exchange/:bidId/bid', isLoggedIn, async (req, res, next) => {
  try {
    const reqUserId = req.auth.sub.split('auth0|')[1];
    const userSession = JSON.parse(req.get('userSession'));
    const bidId = req.params.bidId;

    async function checkPermission(bidId, reqUserId) {
      const bid = await Bid.findOne({ _id: bidId });
      return reqUserId == bid.fromUser.userId;
    }

    async function getLowestBid(postId) {
      const bids = await Bid.find({ postId }).sort({ price: 1 });
      bids.sort((a, b) => a.price - b.price);
      return bids[0];
    }

    const hasPermission = await checkPermission(bidId, reqUserId);
    if (!hasPermission) {
      return e.respondError403(res, next);
    }

    const removedBid = await Bid.findOneAndRemove({ _id: bidId });
      /**
       * @broadcast_except_reqUser that a bid has been removed
       * @broadcast_all whose lowest bid now
       */
    const message = { removedBid: bidId, postId: removedBid.postId };
    const lowestBid = await getLowestBid(removedBid.postId);

    require('../index').broadcast_except(reqUserId, userSession, message);
    require('../index').broadcast_all(lowestBid)

    return res.json({})
  } catch {
    return e.respondError500(res, next);
  }
});


module.exports = router;