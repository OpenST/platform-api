'use strict';

const express = require('express');

const rootPrefix = '../..',
  testRoutes = require(rootPrefix + '/routes/v2/test'),
  tokenRoutes = require(rootPrefix + '/routes/v2/tokens');

const router = express.Router();

router.use('/', testRoutes);
router.use('/tokens', tokenRoutes);

module.exports = router;
