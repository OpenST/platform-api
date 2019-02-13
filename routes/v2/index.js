'use strict';

const express = require('express');

const rootPrefix = '../..',
  userRoutes = require(rootPrefix + '/routes/v2/users'),
  chainRoutes = require(rootPrefix + '/routes/v2/chains'),
  tokenRoutes = require(rootPrefix + '/routes/v2/tokens'),
  pricePointsRoutes = require(rootPrefix + '/routes/v2/pricePoints');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/chains', chainRoutes);
router.use('/tokens', tokenRoutes);
router.use('/price-points', pricePointsRoutes);

module.exports = router;
