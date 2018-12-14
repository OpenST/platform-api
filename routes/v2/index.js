'use strict';

const express = require('express');

const rootPrefix = '../..',
  testRoutes = require(rootPrefix + '/routes/v2/test');

const router = express.Router();

router.use('/', testRoutes);

module.exports = router;
