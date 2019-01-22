'use strict';

const express = require('express');

const rootPrefix = '../..',
  testRoutes = require(rootPrefix + '/routes/v2/test'),
  tokenRoutes = require(rootPrefix + '/routes/v2/token');

const router = express.Router();

router.use('/', testRoutes);
router.use('/token', tokenRoutes);

module.exports = router;
