'use strict';

const express = require('express');

const rootPrefix = '../..',
  signerRoutes = require(rootPrefix + '/routes/internal/signer'),
  tokenRoutes = require(rootPrefix + '/routes/internal/token');

let router = express.Router();

router.use('/signer', signerRoutes);
router.use('/token', tokenRoutes);

module.exports = router;
