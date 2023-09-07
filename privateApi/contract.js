const express = require('express');
const router = express.Router();

const e = require('../helpers/errors.helper');
const { isLoggedIn } = require('../auth/middlewares');

const Exchange = require('../models/Exchange');
const Bid = require('../models/Bid');
const Contract = require('../models/Contract');

const contractSchema = require('../schemas/contract.schema');
const contractNegotiateSchema = require('../schemas/contract-negotiate.schema');

const validateSchema = require('../helpers/validateSchema.helper');


/**
  * @desc    get contracts
  * @route   GET /contracts
*/
router.get('/contracts', isLoggedIn, async (req, res, next) => {
  try {
    const reqUserId = req.auth.sub.split('auth0|')[1];
    const result = await Contract.find({
      $or: [
        { 'shipper.userId': reqUserId },
        { 'consignee.userId': reqUserId }
      ]
    })
    .sort({ createdAt: -1 })
      .populate()
      .lean();

    return res.json(result);
  } catch {
    return e.respondError500(res, next);
  }
});


/**
  * @desc    get single contract
  * @route   GET /contracts/:_id
*/
router.get('/contracts/:_id', isLoggedIn, async (req, res, next) => {
  try {
    const reqUserId = req.auth.sub.split('auth0|')[1];
    const contractId = req.params._id;

    let result = await Contract.findOne({
      _id: contractId,
      $or: [
        { 'shipper.userId': reqUserId },
        { 'consignee.userId': reqUserId }
      ]
    })
    .sort({ createdAt: -1 })
      .populate()
      .lean();

    return res.json(result);
  } catch {
    return e.respondError500(res, next)
  }
});


/**
  * @desc   create contract - accept bid
  * @route  POST /exchange/:postId/:bidId/
*/
router.post('/exchange/:postId/:bidId', isLoggedIn, async (req, res, next) => {
  try {
    const reqUserId = req.auth.sub.split('auth0|')[1];
    const userSession = JSON.parse(req.get('userSession'));

    const postId = req.params.postId;
    const bidId = req.params.bidId;

    async function checkPermission(reqUserId, postId) {
      const exchange = await Exchange.findOne({ _id: postId });
      return reqUserId == exchange.fromUser.userId;
    }

    async function createContract(freight, bid) {
      const newContract = {
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
        payment_deadline: freight.payment_deadline,
        status: 'pending_consignee',
        createdAt: Date.now()
      }

      return await Contract.create(newContract);
    }

    const hasPermission = await checkPermission(reqUserId, postId);
    if (!hasPermission) {
      return e.respondError403(res, next);
    }

    const bid = await Bid.findOne({ _id: bidId });
    if (!bid) {
      return e.respondError404(res, next);
    }

    const freight = await Exchange.findOneAndRemove({ _id: postId });
    await Bid.deleteMany({ postId: postId });

    const result = await createContract(freight, bid);
    //result.__v = undefined;

    /**
     * @broadcast_except_reqUser that a post is unavailable
     * @broadcast_to_consignee that he have a new contract
     */
    const message_post_unavailable = { postId: postId, contractCreated: result._id };
    const consignee_userId = bid.fromUser.userId;

    require('../index').broadcast_except(reqUserId, userSession, message_post_unavailable);
    require('../index').broadcast_toAllUserSessions(consignee_userId, result);

    return res.json(result);
  } catch {
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
  let insertUpdates = {
    status: 'confirmed'
  }

  async function checkPermission() {
    const contract = await Contract.findOne({ _id: contractId });

    if( contract.status === 'pending_shipper' && contract.shipper.userId == reqUserId) {
        otherOneParty_userId = contract.consignee.userId
        return true;
    }

    if( contract.status == 'pending_consignee' && contract.consignee.userId == reqUserId) {
      const schema = contractSchema.validate(req.body);
      if(schema.error !== undefined) {
        return e.respondError422(res, next, result.error.message);
      }

      insertUpdates.transportationDate = req.body;
      otherOneParty_userId = contract.shipper.userId
      return true
    };

    return false;
  }

  async function confirmContract() {
    return await Contract.findOneAndUpdate({
      _id: contractId,
      $or: [ { 'shipper.userId': reqUserId }, { 'consignee.userId': reqUserId }  ]
    }, insertUpdates, { new: true })
  }

  try {
    const hasPermission = await checkPermission(contractId, reqUserId);
    if (!hasPermission) {
      return e.respondError403(res, next);
    }

    const result = await confirmContract();
    /**
      * @broadcast_to_the_other_party that a contract has been confirmed, waiting for his aproval
    */
    if(otherOneParty_userId) {
      require('../index').broadcast_toAllUserSessions(otherOneParty_userId, result);
    }

    return res.json(result);
  } catch {
    return e.respondError500(res, next);
  }
})


/**
  * @desc    confirm+negotiate contract's charges
  * @route   PATCH /contracts/:contractId/negotiate
*/
router.patch('/contracts/:contractId/negotiate', isLoggedIn, validateSchema(contractNegotiateSchema), async (req, res, next) => {
  try {
    const reqUserId = req.auth.sub.split('auth0|')[1];
    const contractId = req.params.contractId;
    const result = await Contract.findOneAndUpdate(
      { _id: contractId, 'consignee.userId': reqUserId },
      { ...req.body, status: 'pending_shipper' },
      { new: true }
    );
    result.__v = undefined;

    /**
    * @broadcast_to_shipper a contract's charges have been changed, waiting for his approval
    */
    const shipper_userId = result.shipper.userId;
    require('../index').broadcast_toAllUserSessions(shipper_userId, result);

    return res.json(result);
  } catch {
    return e.respondError500(res, next);
  }
});


module.exports = router;