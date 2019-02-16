const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  UserFormatter = require(rootPrefix + '/lib/formatter/entity/User'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  DeviceFormatter = require(rootPrefix + '/lib/formatter/entity/Device'),
  SessionFormatter = require(rootPrefix + '/lib/formatter/entity/Session'),
  UserSaltFormatter = require(rootPrefix + '/lib/formatter/entity/UserSalt'),
  DeviceManagerFormatter = require(rootPrefix + '/lib/formatter/entity/DeviceManager'),
  NextPagePayloadFormatter = require(rootPrefix + '/lib/formatter/entity/NextPagePayload');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/services/user/Create');
require(rootPrefix + '/app/services/user/Get');
require(rootPrefix + '/app/services/user/GetList');
require(rootPrefix + '/app/services/user/CreateTokenHolder');
require(rootPrefix + '/app/services/user/GetTokenHolder');
require(rootPrefix + '/app/services/user/UserSalt');

require(rootPrefix + '/app/services/device/Create');
require(rootPrefix + '/app/services/device/getList/ByUserId');
require(rootPrefix + '/app/services/device/getList/ByWalletAddress');

require(rootPrefix + '/app/services/deviceManager/Get');

require(rootPrefix + '/app/services/session/list/ByAddress');
require(rootPrefix + '/app/services/session/list/ByUserId');

/* Create user*/
router.post('/', function(req, res, next) {
  req.decodedParams.apiName = apiName.createUser;
  req.decodedParams.clientConfigStrategyRequired = true;

  //NOTE: Mandatory to override kind value here. As we don't want company kind users to be created from this API.
  req.decodedParams.kind = tokenUserConstants.userKind;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = new UserFormatter(serviceResponse.data[resultType.user]).perform();
    serviceResponse.data = {
      result_type: resultType.user,
      [resultType.user]: userFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateUser', 'r_v2_u_1', null, dataFormatterFunc));
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

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUser', 'r_v2_u_2', null, dataFormatterFunc));
});

/* Get users*/
router.get('/', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserList;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    let users = serviceResponse.data[resultType.users],
      formattedUsers = [],
      nextPagePayload = new NextPagePayloadFormatter(serviceResponse.data.nextPagePayload).perform().data;

    for (let index in users) {
      formattedUsers.push(new UserFormatter(users[index]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.users,
      [resultType.users]: formattedUsers,
      next_page_payload: nextPagePayload
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUsersList', 'r_v2_u_3', null, dataFormatterFunc));
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

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateDevice', 'r_v2_u_4', null, dataFormatterFunc));
});

/* Get devices by userId */
router.get('/:user_id/devices', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserDevices;
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

  Promise.resolve(routeHelper.perform(req, res, next, serviceName, 'r_v2_u_5', null, dataFormatterFunc));
});

/* Get User device By device Address */
router.get('/:user_id/devices/:device_address', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserDevice;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.addresses = [req.params.device_address];
  // In this API, we are using the same service as getDevices for a user. Hence, we are
  // converting the device_address into an array.

  const dataFormatterFunc = async function(serviceResponse) {
    let devices = serviceResponse.data[resultType.devices],
      formattedRsp = {};

    for (let deviceUuid in devices) {
      const buffer = devices[deviceUuid];
      if (CommonValidators.validateObject(buffer)) {
        formattedRsp = new DeviceFormatter(devices[deviceUuid]).perform();
      }
    }
    serviceResponse.data = {
      result_type: resultType.device,
      [resultType.device]: formattedRsp.data || {}
    };
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, 'DeviceListByWalletAddress', 'r_v2_u_6', null, dataFormatterFunc)
  );
});

/* Get sessions by userId */
router.get('/:user_id/sessions', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserSessions;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;

  const dataFormatterFunc = async function(serviceResponse) {
    let sessions = serviceResponse.data[resultType.sessions],
      formattedSessions = [],
      buffer;

    for (let address in sessions) {
      buffer = sessions[address];
      if (!CommonValidators.validateObject(buffer)) {
        continue;
      }
      formattedSessions.push(new SessionFormatter(sessions[address]).perform().data);
    }

    serviceResponse.data['result_type'] = resultType.sessions;
    serviceResponse.data[resultType.sessions] = formattedSessions;
  };

  let serviceName;
  if (req.decodedParams.address) {
    serviceName = 'SessionListByAddress';
  } else {
    serviceName = 'SessionListByUserId';
  }

  return Promise.resolve(routeHelper.perform(req, res, next, serviceName, 'r_v2_u_7', null, dataFormatterFunc));
});

/* Get User session By session Address */
router.get('/:user_id/sessions/:session_address', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserSession;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.addresses = [req.params.session_address];

  const dataFormatterFunc = async function(serviceResponse) {
    let sessions = serviceResponse.data[resultType.sessions],
      formattedRsp = {};

    for (let address in sessions) {
      const buffer = sessions[address];
      if (CommonValidators.validateObject(buffer)) {
        formattedRsp = new SessionFormatter(sessions[address]).perform();
      }
    }
    serviceResponse.data = {
      result_type: resultType.session,
      [resultType.session]: formattedRsp.data || {}
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'SessionListByAddress', 'r_v2_u_8', null, dataFormatterFunc));
});

/* Get user device managers*/
router.get('/:user_id/device-managers/', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserDeviceManager;
  req.decodedParams.user_id = req.params.user_id; // review params
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

  Promise.resolve(routeHelper.perform(req, res, next, 'GetDeviceManager', 'r_v2_u_9', null, dataFormatterFunc));
});

/* Create token holders */
router.post('/:user_id/activate-user/', function(req, res, next) {
  req.decodedParams.apiName = apiName.activateUser;
  req.decodedParams.user_id = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = new UserFormatter(serviceResponse.data[resultType.user]).perform();
    serviceResponse.data = {
      result_type: resultType.user,
      [resultType.user]: userFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateTokenHolder', 'r_v2_u_10', null, dataFormatterFunc));
});

/* Get user salt*/
router.get('/:user_id/salts/', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserSalt;
  req.decodedParams.user_id = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const userSaltFormatterRsp = await new UserSaltFormatter(serviceResponse.data[resultType.salt]).perform();
    serviceResponse.data = {
      result_type: resultType.salt,
      [resultType.salt]: userSaltFormatterRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUserSalt', 'r_v2_u_11', null, dataFormatterFunc));
});

module.exports = router;
