const express = require('express');

const rootPrefix = '../..',
  DeviceManagersFormatter = require(rootPrefix + '/lib/formatter/entity/DeviceManagers'),
  userDataFormatter = require(rootPrefix + '/lib/formatter/entity/user'),
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

//require(rootPrefix + '/app/services/user/DeviceManager');

/* Get user device managers*/
router.get('/:user_id/device-managers/', function(req, res, next) {
  req.decodedParams.apiName = 'getDeviceManagers'; //review
  req.decodedParams.userId = req.params.user_id; // review
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const deviceManagersFormatterRsp = await new DeviceManagersFormatter(serviceResponse.data).perform();

    serviceResponse.data = deviceManagersFormatterRsp.data;
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'DeviceManager', 'r_t_1', null, dataFormatterFunc));
});

/* Get user*/
router.get('/:user_id', function(req, res, next) {
  req.decodedParams.apiName = 'getUser'; //review api names
  req.decodedParams.user_id = req.params.user_id; // review params
  req.decodedParams.client_id = req.params.client_id;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = userDataFormatter.perform(serviceResponse.data);

    serviceResponse.data = userFormattedRsp.data;
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUser', 'r_t_2', null, dataFormatterFunc));
});

router.post('/', function(req, res, next) {
  req.decodedParams.apiName = 'addUser';
  req.decodedParams.configStrategyRequired = false;

  Promise.resolve(routeHelper.perform(req, res, next, 'AddUser', 'r_it_1'));
});

module.exports = router;
