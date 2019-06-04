'use strict';

const express = require('express');

const rootPrefix = '../..',
  userRoutes = require(rootPrefix + '/routes/v2/users'),
  chainRoutes = require(rootPrefix + '/routes/v2/chains'),
  tokenRoutes = require(rootPrefix + '/routes/v2/tokens'),
  rulesRoutes = require(rootPrefix + '/routes/v2/rules'),
  baseTokenRoutes = require(rootPrefix + '/routes/v2/baseTokens');
// webhookRoutes = require(rootPrefix + '/routes/v2/webhooks');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/chains', chainRoutes);
router.use('/tokens', tokenRoutes);
router.use('/rules', rulesRoutes);
router.use('/base-tokens', baseTokenRoutes);
// router.use('/webhooks', webhookRoutes);

module.exports = router;
