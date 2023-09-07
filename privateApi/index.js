const express = require('express');
const router = express.Router();

const company = require('./company');
const exchange = require('./exchange');
const bids = require('./bids');
const contract = require('./contract');

router.use(company);
router.use(exchange);
router.use(bids);
router.use(contract);


module.exports = router