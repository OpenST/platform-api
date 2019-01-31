const express = require('express');

const rootPrefix = '../..',
  DeviceManagersFormatter = require(rootPrefix + '/lib/formatter/entity/DeviceManagers'),
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

//require(rootPrefix + '/app/services/user/DeviceManager');

/* Get user device managers*/
router.get('/:user_id', function(req, res, next) {
  req.decodedParams.apiName = 'getDeviceManagers'; //review api names
  req.decodedParams.userId = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const deviceManagersFormatterRsp = await new DeviceManagersFormatter(serviceResponse.data).perform();

    serviceResponse.data = deviceManagersFormatterRsp.data;
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'DeviceManager', 'r_t_1', null, dataFormatterFunc));
});

module.exports = router;
