const express = require('express');
const router = express.Router();

const exchange = require('./exchange');
const company = require('./company');

router.use(exchange);
router.use(company);

module.exports = router