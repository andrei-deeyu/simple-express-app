const express = require('express');
const router = express.Router();

const exchange = require('./exchange');
const signupLog = require('./signupLog');

router.use(exchange);
router.use(signupLog);

module.exports = router