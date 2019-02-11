'use strict';

const express = require('express');

const rootPrefix = '../..',
  tokenRoutes = require(rootPrefix + '/routes/v2/tokens'),
  userRoutes = require(rootPrefix + '/routes/v2/users'),
  pricePointsRoutes = require(rootPrefix + '/routes/v2/pricePoints');

const router = express.Router();

router.use('/tokens', tokenRoutes);
router.use('/users', userRoutes);
router.use('/price-points', pricePointsRoutes);

module.exports = router;
