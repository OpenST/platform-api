const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  UserFormatter = require(rootPrefix + '/lib/formatter/entity/User'),
  BalanceFormatter = require(rootPrefix + '/lib/formatter/entity/Balance'),
  UserListMetaFormatter = require(rootPrefix + '/lib/formatter/meta/UserList'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  DeviceFormatter = require(rootPrefix + '/lib/formatter/entity/Device'),
  DeviceListMetaFormatter = require(rootPrefix + '/lib/formatter/meta/DeviceList'),
  SessionFormatter = require(rootPrefix + '/lib/formatter/entity/Session'),
  SessionListMetaFormatter = require(rootPrefix + '/lib/formatter/meta/SessionList'),
  UserSaltFormatter = require(rootPrefix + '/lib/formatter/entity/UserSalt'),
  DeviceManagerFormatter = require(rootPrefix + '/lib/formatter/entity/DeviceManager'),
  TransactionFormatter = require(rootPrefix + '/lib/formatter/entity/Transaction'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/services/user/Create');
require(rootPrefix + '/app/services/user/get/ById');
require(rootPrefix + '/app/services/user/get/ByTokenId');
require(rootPrefix + '/app/services/user/CreateTokenHolder');
require(rootPrefix + '/app/services/user/GetTokenHolder');
require(rootPrefix + '/app/services/user/UserSalt');
require(rootPrefix + '/app/services/balance/User');
require(rootPrefix + '/app/services/transaction/execute/FromCompany');
require(rootPrefix + '/app/services/transaction/execute/FromUser');
require(rootPrefix + '/app/services/transaction/GetTransaction');
require(rootPrefix + '/app/services/transaction/GetUserTransactions');

require(rootPrefix + '/app/services/device/Create');
require(rootPrefix + '/app/services/device/get/ByUserId');
require(rootPrefix + '/app/services/device/get/ByAddress');
require(rootPrefix + '/app/services/device/multisigOperation/AuthorizeDevice');
require(rootPrefix + '/app/services/device/multisigOperation/RevokeDevice');

require(rootPrefix + '/app/services/deviceManager/Get');

require(rootPrefix + '/app/services/session/get/ByAddress');
require(rootPrefix + '/app/services/session/get/ByUserId');
require(rootPrefix + '/app/services/session/multisigOperation/AuthorizeSession');
require(rootPrefix + '/app/services/session/multisigOperation/RevokeSession');

/* Create user*/
router.post('/', function(req, res, next) {
  req.decodedParams.apiName = apiName.createUser;
  req.decodedParams.clientConfigStrategyRequired = true;

  //NOTE: Mandatory to override kind value here. As we don't want company kind users to be created from this API.
  req.decodedParams.kind = tokenUserConstants.userKind;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = await new UserFormatter(serviceResponse.data[resultType.user]).perform();
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
    const userFormattedRsp = await new UserFormatter(serviceResponse.data[resultType.user]).perform();
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
      metaPayload = await new UserListMetaFormatter(serviceResponse.data).perform().data;

    for (let index in users) {
      formattedUsers.push(await new UserFormatter(users[index]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.users,
      [resultType.users]: formattedUsers,
      [resultType.meta]: metaPayload
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUserList', 'r_v2_u_3', null, dataFormatterFunc));
});

/* Create device for user*/
router.post('/:user_id/devices', function(req, res, next) {
  req.decodedParams.apiName = apiName.createUserDevice;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = await new DeviceFormatter(serviceResponse.data[resultType.device]).perform();
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
      buffer,
      metaPayload = new DeviceListMetaFormatter(serviceResponse.data).perform().data;

    for (let deviceUuid in devices) {
      buffer = devices[deviceUuid];
      if (!CommonValidators.validateObject(buffer)) {
        continue;
      }
      formattedDevices.push(await new DeviceFormatter(devices[deviceUuid]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.devices,
      [resultType.devices]: formattedDevices,
      [resultType.meta]: metaPayload
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'UserDeviceList', 'r_v2_u_5', null, dataFormatterFunc));
});

/* Get User device By device Address */
router.get('/:user_id/devices/:device_address', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserDevice;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.address = req.params.device_address;

  const dataFormatterFunc = async function(serviceResponse) {
    let device = serviceResponse.data[resultType.device],
      formattedRsp = {};

    if (CommonValidators.validateObject(device)) {
      formattedRsp = await new DeviceFormatter(device).perform();
    }

    serviceResponse.data = {
      result_type: resultType.device,
      [resultType.device]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetDeviceByAddress', 'r_v2_u_6', null, dataFormatterFunc));
});

/* Get sessions by userId */
router.get('/:user_id/sessions', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserSessions;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;

  const dataFormatterFunc = async function(serviceResponse) {
    let sessions = serviceResponse.data[resultType.sessions],
      formattedSessions = [],
      metaPayload = new SessionListMetaFormatter(serviceResponse.data).perform().data;

    for (let address in sessions) {
      formattedSessions.push(await new SessionFormatter(sessions[address]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.sessions,
      [resultType.sessions]: formattedSessions,
      [resultType.meta]: metaPayload
    };
  };

  return Promise.resolve(routeHelper.perform(req, res, next, 'UserSessionList', 'r_v2_u_7', null, dataFormatterFunc));
});

/* Get User session By session Address */
router.get('/:user_id/sessions/:session_address', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserSession;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.address = req.params.session_address;

  const dataFormatterFunc = async function(serviceResponse) {
    let session = serviceResponse.data[resultType.session],
      formattedRsp = await new SessionFormatter(session).perform();

    serviceResponse.data = {
      result_type: resultType.session,
      [resultType.session]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetSessionByAddress', 'r_v2_u_8', null, dataFormatterFunc));
});

/* Get user device managers*/
router.get('/:user_id/device-managers', function(req, res, next) {
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
router.post('/:user_id/activate-user', function(req, res, next) {
  req.decodedParams.apiName = apiName.activateUser;
  req.decodedParams.user_id = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const userFormattedRsp = await new UserFormatter(serviceResponse.data[resultType.user]).perform();
    serviceResponse.data = {
      result_type: resultType.user,
      [resultType.user]: userFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateTokenHolder', 'r_v2_u_10', null, dataFormatterFunc));
});

/* Get user salt*/
router.get('/:user_id/salts', function(req, res, next) {
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

/*Authorize Device*/
router.post('/:user_id/devices/authorize', function(req, res, next) {
  req.decodedParams.apiName = apiName.postAuthorizeDevice;
  req.decodedParams.userId = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = await new DeviceFormatter(serviceResponse.data[resultType.device]).perform();
    serviceResponse.data = {
      result_type: resultType.device,
      [resultType.device]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'AuthorizeDevice', 'r_v2_u_12', null, dataFormatterFunc));
});

/*Revoke Device*/
router.post('/:user_id/devices/revoke', function(req, res, next) {
  req.decodedParams.apiName = apiName.postRevokeDevice;
  req.decodedParams.userId = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = await new DeviceFormatter(serviceResponse.data[resultType.device]).perform();
    serviceResponse.data = {
      result_type: resultType.device,
      [resultType.device]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'RevokeDevice', 'r_v2_u_13', null, dataFormatterFunc));
});

/*Authorize Session*/
router.post('/:user_id/sessions/authorize', function(req, res, next) {
  req.decodedParams.apiName = apiName.postAuthorizeSession;
  req.decodedParams.userId = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const sessionsFormattedRsp = await new SessionFormatter(serviceResponse.data[resultType.session]).perform();
    serviceResponse.data = {
      result_type: resultType.session,
      [resultType.session]: sessionsFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'AuthorizeSession', 'r_v2_u_14', null, dataFormatterFunc));
});

/*Revoke Session*/
router.post('/:user_id/sessions/revoke', function(req, res, next) {
  req.decodedParams.apiName = apiName.postRevokeSession;
  req.decodedParams.userId = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const sessionsFormattedRsp = await new SessionFormatter(serviceResponse.data[resultType.session]).perform();
    serviceResponse.data = {
      result_type: resultType.session,
      [resultType.session]: sessionsFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'RevokeSession', 'r_v2_u_15', null, dataFormatterFunc));
});

router.post('/:user_id/transactions', function(req, res, next) {
  let klassGetterName;
  if (req.decodedParams['api_signature_kind'] === apiSignature.hmacKind) {
    req.decodedParams.apiName = apiName.executeTransactionFromCompany;
    klassGetterName = 'ExecuteCompanyToUserTx';
  } else if (req.decodedParams['api_signature_kind'] === apiSignature.personalSignKind) {
    req.decodedParams.apiName = apiName.executeTransactionFromUser;
    klassGetterName = 'ExecuteTxFromUser';
  }

  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const transactionFormattedRsp = await new TransactionFormatter(
      serviceResponse.data[resultType.transaction]
    ).perform();
    serviceResponse.data = {
      result_type: resultType.transaction,
      [resultType.transaction]: transactionFormattedRsp.data
    };
  };

  return Promise.resolve(routeHelper.perform(req, res, next, klassGetterName, 'r_v_u_11', null, dataFormatterFunc));
});

/* Get transaction by id */
router.get('/:user_id/transactions/:transaction_id', function(req, res, next) {
  req.decodedParams.apiName = apiName.getTransaction;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.transaction_id = req.params.transaction_id;

  const dataFormatterFunc = async function(serviceResponse) {
    let transaction = serviceResponse.data[resultType.transaction],
      formattedRsp = await new TransactionFormatter(transaction).perform();

    serviceResponse.data = {
      result_type: resultType.transaction,
      [resultType.transaction]: formattedRsp.data
    };
  };

  return Promise.resolve(routeHelper.perform(req, res, next, 'GetTransaction', 'r_v_u_12', null, dataFormatterFunc));
});

router.get('/:user_id/transactions', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserTransactions;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.token_id = req.params.token_id;
  req.decodedParams.meta_property = req.params.meta_property;
  req.decodedParams.status = req.params.status;

  const dataFormatterFunc = async function(serviceResponse) {
    //TODO as discussed
  };

  return Promise.resolve(
    routeHelper.perform(req, res, next, 'GetUserTransaction', 'r_v_u_13', null, dataFormatterFunc)
  );
});

router.get('/:user_id/balance', function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserBalance;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;

  const dataFormatterFunc = async function(serviceResponse) {
    const balanceFormattedRsp = await new BalanceFormatter(serviceResponse.data[resultType.balance]).perform();

    serviceResponse.data = {
      result_type: resultType.balance,
      [resultType.balance]: balanceFormattedRsp.data
    };
  };

  return Promise.resolve(routeHelper.perform(req, res, next, 'GetUserBalance', 'r_v_u_14', null, dataFormatterFunc));
});

module.exports = router;
