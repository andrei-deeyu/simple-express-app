const express = require('express');
const router = express.Router();

const exchange = require('./exchange');

router.use(exchange);

module.exports = router