const express = require('express');

const rootPrefix = '../..',
  DeviceManagerFormatter = require(rootPrefix + '/lib/formatter/entity/DeviceManager'),
  UserFormatter = require(rootPrefix + '/lib/formatter/entity/User'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  DeviceFormatter = require(rootPrefix + '/lib/formatter/entity/Device'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  routeHelper = require(rootPrefix + '/routes/helper');

const router = express.Router();

require(rootPrefix + '/app/services/user/Create');
require(rootPrefix + '/app/services/user/Get');
require(rootPrefix + '/app/services/user/CreateTokenHolder');

require(rootPrefix + '/app/services/device/Create');
require(rootPrefix + '/app/services/device/getList/ByUserId');
require(rootPrefix + '/app/services/device/getList/ByWalletAddress');

require(rootPrefix + '/app/services/deviceManager/Get');

/* Create user*/
router.post('/', function(req, res, next) {
  req.decodedParams.apiName = apiName.createUser;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = new UserFormatter(serviceResponse.data[resultType.user]).perform();
    serviceResponse.data = {
      result_type: resultType.user,
      [resultType.user]: userFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateUser', 'r_it_1', null, dataFormatterFunc));
});

/* Get user*/
router.get('/:user_id', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUser;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = new UserFormatter(serviceResponse.data[resultType.user]).perform();
    serviceResponse.data = {
      result_type: resultType.user,
      [resultType.user]: userFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUser', 'r_t_2', null, dataFormatterFunc));
});

/* Create device for user*/
router.post('/:user_id/devices', function(req, res, next) {
  req.decodedParams.apiName = apiName.createUserDevice;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = new DeviceFormatter(serviceResponse.data[resultType.device]).perform();
    serviceResponse.data = {
      result_type: resultType.device,
      [resultType.device]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateDevice', 'r_it_1', null, dataFormatterFunc));
});

/* Get devices by userId */
router.get('/:user_id/devices', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserDevice;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;

  const dataFormatterFunc = async function(serviceResponse) {
    let devices = serviceResponse.data[resultType.devices],
      formattedDevices = [],
      buffer;

    for (let deviceUuid in devices) {
      buffer = devices[deviceUuid];
      if (!CommonValidators.validateObject(buffer)) {
        continue;
      }
      formattedDevices.push(new DeviceFormatter(devices[deviceUuid]).perform().data);
    }

    serviceResponse.data['result_type'] = resultType.devices;
    serviceResponse.data[resultType.devices] = formattedDevices;
  };

  let serviceName;
  if (req.decodedParams.address) {
    serviceName = 'DeviceListByWalletAddress';
  } else {
    serviceName = 'DeviceListByUserId';
  }

  Promise.resolve(routeHelper.perform(req, res, next, serviceName, 'r_it_1', null, dataFormatterFunc));
});

/* Get user device managers*/
router.get('/:user_id/device-managers/', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserDeviceManager;
  req.decodedParams.userId = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const deviceManagersFormatterRsp = await new DeviceManagerFormatter(
      serviceResponse.data[resultType.deviceManager]
    ).perform();
    serviceResponse.data = {
      result_type: resultType.deviceManager,
      [resultType.deviceManager]: deviceManagersFormatterRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetDeviceManager', 'r_t_1', null, dataFormatterFunc));
});

/* Get token holders */
router.post('/:user_id/token-holders/', function(req, res, next) {
  req.decodedParams.apiName = apiName.postTokenHolder;
  req.decodedParams.userId = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = new UserFormatter(serviceResponse.data[resultType.user]).perform();
    serviceResponse.data = {
      result_type: resultType.user,
      [resultType.user]: {
        userId: 'test123',
        tokenId: 'test123',
        tokenHolderAddress: 'test123',
        multisigAddress: 'test123',
        kind: '1',
        updatedTimestamp: 'test123',
        status: '2'
      } //userFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateTokenHolder', 'r_t_1', null, dataFormatterFunc));
});

module.exports = router;
