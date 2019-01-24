'use strict';

const express = require('express');

const rootPrefix = '../..',
  tokenRoutes = require(rootPrefix + '/routes/v2/tokens');

const router = express.Router();

router.use('/tokens', tokenRoutes);

module.exports = router;
