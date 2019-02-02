const express = require('express');

const rootPrefix = '../..',
  DeviceManagersFormatter = require(rootPrefix + '/lib/formatter/entity/DeviceManagers'),
  UserFormatter = require(rootPrefix + '/lib/formatter/entity/User'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/tokenUsers/AddUser');
require(rootPrefix + '/app/services/tokenUsers/GetUser');

/* Get user device managers*/
router.get('/:user_id/device-managers/', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserDeviceManager;
  req.decodedParams.userId = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const deviceManagersFormatterRsp = await new DeviceManagersFormatter(serviceResponse.data).perform();

    serviceResponse.data = deviceManagersFormatterRsp.data;
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'DeviceManager', 'r_t_1', null, dataFormatterFunc));
});

/* Get user*/
router.get('/:user_id', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUser;
  req.decodedParams.user_id = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = new UserFormatter(serviceResponse.data.user).perform();
    serviceResponse.data = {
      result_type: resultType.user,
      [resultType.user]: userFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUser', 'r_t_2', null, dataFormatterFunc));
});

router.post('/', function(req, res, next) {
  req.decodedParams.apiName = apiName.createUser;
  req.decodedParams.configStrategyRequired = false;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = new UserFormatter(serviceResponse.data.user).perform();
    serviceResponse.data = {
      result_type: resultType.user,
      [resultType.user]: userFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'AddUser', 'r_it_1', null, dataFormatterFunc));
});

module.exports = router;
