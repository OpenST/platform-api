const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  routeHelper = require(rootPrefix + '/routes/helper'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  UserFormatter = require(rootPrefix + '/lib/formatter/entity/User'),
  TokenHolderFormatter = require(rootPrefix + '/lib/formatter/entity/TokenHolder'),
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
  sanitizer = require(rootPrefix + '/helpers/sanitizer'),
  TransactionFormatter = require(rootPrefix + '/lib/formatter/entity/Transaction'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  TransactionListMetaFormatter = require(rootPrefix + '/lib/formatter/meta/TransactionList'),
  UserRedemptionListMetaFormatter = require(rootPrefix + '/lib/formatter/meta/UserRedemptionList'),
  RecoveryOwnerFormatter = require(rootPrefix + '/lib/formatter/entity/RecoveryOwner'),
  RedemptionFormatter = require(rootPrefix + '/lib/formatter/entity/Redemption');

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
require(rootPrefix + '/app/services/transaction/get/ById');
require(rootPrefix + '/app/services/transaction/get/ByUserId');

require(rootPrefix + '/app/services/user/recovery/Initiate');
require(rootPrefix + '/app/services/user/recovery/Abort');
require(rootPrefix + '/app/services/user/recovery/ResetRecoveryOwner');
require(rootPrefix + '/app/services/user/recovery/GetPending');

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
require(rootPrefix + '/app/services/session/multisigOperation/Logout');

require(rootPrefix + '/app/services/recoveryOwner/get/ByRecoveryOwnerAddress');

require(rootPrefix + '/app/services/user/redemption/Get');
require(rootPrefix + '/app/services/user/redemption/GetList');

/* Create user*/
router.post('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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
router.get('/:user_id', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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
router.get('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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

/* Get Token Holder of user */
router.get('/:user_id/token-holder', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getTokenHolder;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = await new TokenHolderFormatter(serviceResponse.data[resultType.tokenHolder]).perform();
    serviceResponse.data = {
      result_type: resultType.tokenHolder,
      [resultType.tokenHolder]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetTokenHolder', 'r_v2_u_4', null, dataFormatterFunc));
});

/* Logout All sessions of user */
router.post('/:user_id/token-holder/logout', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.postLogoutSessions;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = await new TokenHolderFormatter(serviceResponse.data[resultType.tokenHolder]).perform();
    serviceResponse.data = {
      result_type: resultType.tokenHolder,
      [resultType.tokenHolder]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'SessionsLogout', 'r_v2_u_5', null, dataFormatterFunc));
});

/* Create device for user*/
router.post('/:user_id/devices', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateDevice', 'r_v2_u_6', null, dataFormatterFunc));
});

/* Get user pending recovery request */
router.get('/:user_id/devices/pending-recovery', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.userPendingRecovery;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;

  const dataFormatterFunc = async function(serviceResponse) {
    let devices = serviceResponse.data[resultType.devices],
      formattedDevices = [];

    for (let i = 0; i < devices.length; i++) {
      let deviceData = devices[i];
      if (!CommonValidators.validateObject(deviceData)) {
        continue;
      }
      formattedDevices.push(await new DeviceFormatter(deviceData).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.devices,
      [resultType.devices]: formattedDevices
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetPendingRecovery', 'r_v2_u_7', null, dataFormatterFunc));
});

/* Get devices by userId */
router.get('/:user_id/devices', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserDevices;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;

  const dataFormatterFunc = async function(serviceResponse) {
    let devices = serviceResponse.data[resultType.devices],
      formattedDevices = [],
      metaPayload = new DeviceListMetaFormatter(serviceResponse.data).perform().data;

    for (let i = 0; i < devices.length; i++) {
      let device = devices[i];
      if (!CommonValidators.validateObject(device)) {
        continue;
      }
      formattedDevices.push(await new DeviceFormatter(device).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.devices,
      [resultType.devices]: formattedDevices,
      [resultType.meta]: metaPayload
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'UserDeviceList', 'r_v2_u_8', null, dataFormatterFunc));
});

/* Get User device By device Address */
router.get('/:user_id/devices/:device_address', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserDevice;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.device_address = req.params.device_address;

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

  Promise.resolve(routeHelper.perform(req, res, next, 'GetDeviceByAddress', 'r_v2_u_9', null, dataFormatterFunc));
});

/* Get sessions by userId */
router.get('/:user_id/sessions', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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

  return Promise.resolve(routeHelper.perform(req, res, next, 'UserSessionList', 'r_v2_u_10', null, dataFormatterFunc));
});

/* Get User session By session Address */
router.get('/:user_id/sessions/:session_address', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserSession;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.session_address = req.params.session_address;

  const dataFormatterFunc = async function(serviceResponse) {
    let session = serviceResponse.data[resultType.session],
      formattedRsp = await new SessionFormatter(session).perform();

    serviceResponse.data = {
      result_type: resultType.session,
      [resultType.session]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'GetSessionByAddress', 'r_v2_u_11', null, dataFormatterFunc));
});

/* Get user device managers*/
router.get('/:user_id/device-managers', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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

  Promise.resolve(routeHelper.perform(req, res, next, 'GetDeviceManager', 'r_v2_u_12', null, dataFormatterFunc));
});

/* Create token holders */
router.post('/:user_id/activate-user', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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

  Promise.resolve(routeHelper.perform(req, res, next, 'CreateTokenHolder', 'r_v2_u_13', null, dataFormatterFunc));
});

/* Get user salt*/
router.get('/:user_id/salts', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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

  Promise.resolve(routeHelper.perform(req, res, next, 'GetUserSalt', 'r_v2_u_14', null, dataFormatterFunc));
});

/*Authorize Device*/
router.post('/:user_id/devices/authorize', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.postAuthorizeDevice;
  req.decodedParams.user_id = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = await new DeviceFormatter(serviceResponse.data[resultType.device]).perform();
    serviceResponse.data = {
      result_type: resultType.device,
      [resultType.device]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'AuthorizeDevice', 'r_v2_u_15', null, dataFormatterFunc));
});

/*Revoke Device*/
router.post('/:user_id/devices/revoke', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.postRevokeDevice;
  req.decodedParams.user_id = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = await new DeviceFormatter(serviceResponse.data[resultType.device]).perform();
    serviceResponse.data = {
      result_type: resultType.device,
      [resultType.device]: formattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'RevokeDevice', 'r_v2_u_16', null, dataFormatterFunc));
});

/*Authorize Session*/
router.post('/:user_id/sessions/authorize', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.postAuthorizeSession;
  req.decodedParams.user_id = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const sessionsFormattedRsp = await new SessionFormatter(serviceResponse.data[resultType.session]).perform();
    serviceResponse.data = {
      result_type: resultType.session,
      [resultType.session]: sessionsFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'AuthorizeSession', 'r_v2_u_17', null, dataFormatterFunc));
});

/*Revoke Session*/
router.post('/:user_id/sessions/revoke', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.postRevokeSession;
  req.decodedParams.user_id = req.params.user_id; // review params
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const sessionsFormattedRsp = await new SessionFormatter(serviceResponse.data[resultType.session]).perform();
    serviceResponse.data = {
      result_type: resultType.session,
      [resultType.session]: sessionsFormattedRsp.data
    };
  };

  Promise.resolve(routeHelper.perform(req, res, next, 'RevokeSession', 'r_v2_u_18', null, dataFormatterFunc));
});

router.post('/:user_id/transactions', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  let klassGetterName;

  if (req.decodedParams.api_signature_kind === apiSignature.hmacKind) {
    req.decodedParams.apiName = apiName.executeTransactionFromCompany;
    klassGetterName = 'ExecuteCompanyToUserTx';
  } else if (req.decodedParams.api_signature_kind === apiSignature.personalSignKind) {
    req.decodedParams.apiName = apiName.executeTransactionFromUser;
    klassGetterName = 'ExecuteTxFromUser';
  }

  req.decodedParams.user_id = req.params.user_id;

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

  return Promise.resolve(routeHelper.perform(req, res, next, klassGetterName, 'r_v2_u_19', null, dataFormatterFunc));
});

/* Get transaction by userId and transactionId */
router.get('/:user_id/transactions/:transaction_id', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getTransaction;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.transaction_id = req.params.transaction_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    let transaction = serviceResponse.data[resultType.transaction],
      formattedRsp = await new TransactionFormatter(transaction).perform();

    serviceResponse.data = {
      result_type: resultType.transaction,
      [resultType.transaction]: formattedRsp.data
    };
  };

  return Promise.resolve(routeHelper.perform(req, res, next, 'GetTransaction', 'r_v2_u_20', null, dataFormatterFunc));
});

router.get('/:user_id/transactions', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.getUserTransactions;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const transactions = serviceResponse.data[resultType.transactions],
      formattedTransactions = [],
      metaPayload = new TransactionListMetaFormatter(serviceResponse.data).perform().data;

    for (let index = 0; index < transactions.length; index++) {
      formattedTransactions.push(new TransactionFormatter(transactions[index]).perform().data);
    }

    serviceResponse.data = {
      result_type: resultType.transactions,
      [resultType.transactions]: formattedTransactions,
      [resultType.meta]: metaPayload
    };
  };

  return Promise.resolve(
    routeHelper.perform(req, res, next, 'GetTransactionsList', 'r_v2_u_21', null, dataFormatterFunc)
  );
});

router.get('/:user_id/balance', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
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

  return Promise.resolve(routeHelper.perform(req, res, next, 'GetUserBalance', 'r_v2_u_22', null, dataFormatterFunc));
});

/* Get recovery owner by address */
router.get('/:user_id/recovery-owners/:recovery_owner_address', sanitizer.sanitizeDynamicUrlParams, function(
  req,
  res,
  next
) {
  req.decodedParams.apiName = apiName.getRecoveryOwner;
  req.decodedParams.clientConfigStrategyRequired = true;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.recovery_owner_address = req.params.recovery_owner_address;

  const dataFormatterFunc = async function(serviceResponse) {
    const recoveryOwner = serviceResponse.data[resultType.recoveryOwner],
      formattedRsp = new RecoveryOwnerFormatter(recoveryOwner).perform();

    serviceResponse.data = {
      result_type: resultType.recoveryOwner,
      [resultType.recoveryOwner]: formattedRsp.data
    };
  };

  return Promise.resolve(
    routeHelper.perform(req, res, next, 'GetRecoveryOwnerAddress', 'r_v2_u_23', null, dataFormatterFunc)
  );
});

router.post('/:user_id/devices/initiate-recovery', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.initiateRecovery;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = new DeviceFormatter(serviceResponse.data[resultType.device]).perform();
    serviceResponse.data = {
      result_type: resultType.device,
      [resultType.device]: formattedRsp.data
    };
  };

  return Promise.resolve(routeHelper.perform(req, res, next, 'InitiateRecovery', 'r_v2_u_24', null, dataFormatterFunc));
});

router.post('/:user_id/devices/abort-recovery', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.abortRecovery;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const formattedRsp = new DeviceFormatter(serviceResponse.data[resultType.device]).perform();
    serviceResponse.data = {
      result_type: resultType.device,
      [resultType.device]: formattedRsp.data
    };
  };

  return Promise.resolve(routeHelper.perform(req, res, next, 'AbortRecovery', 'r_v2_u_25', null, dataFormatterFunc));
});

router.post('/:user_id/recovery-owners', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.resetRecoveryOwner;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const recoveryOwner = serviceResponse.data[resultType.recoveryOwner],
      formattedRsp = new RecoveryOwnerFormatter(recoveryOwner).perform();

    serviceResponse.data = {
      result_type: resultType.recoveryOwner,
      [resultType.recoveryOwner]: formattedRsp.data
    };
  };

  return Promise.resolve(
    routeHelper.perform(req, res, next, 'ResetRecoveryOwner', 'r_v2_u_26', null, dataFormatterFunc)
  );
});

router.get('/:user_id/redemptions', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.redemptionList;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const redemptions = serviceResponse.data[resultType.userRedemptions],
      formattedRedemptions = [],
      metaPayload = new UserRedemptionListMetaFormatter(serviceResponse.data).perform().data;

    for (let ind = 0; ind < redemptions.length; ind++) {
      const formattedRsp = new RedemptionFormatter(redemptions[ind]).perform();
      formattedRedemptions.push(formattedRsp);
    }

    serviceResponse.data = {
      result_type: resultType.userRedemptions,
      [resultType.userRedemptions]: formattedRedemptions,
      [resultType.meta]: metaPayload
    };
  };

  return Promise.resolve(
    routeHelper.perform(req, res, next, 'UserRedemptionList', 'r_v2_u_27', null, dataFormatterFunc)
  );
});

router.get('/:user_id/redemptions/:user_redemption_uuid', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.decodedParams.apiName = apiName.redemptionGet;
  req.decodedParams.user_id = req.params.user_id;
  req.decodedParams.user_redemption_uuid = req.params.user_redemption_uuid;
  req.decodedParams.clientConfigStrategyRequired = true;

  const dataFormatterFunc = async function(serviceResponse) {
    const redemption = serviceResponse.data[resultType.userRedemption],
      formattedRsp = new RedemptionFormatter(redemption).perform();

    serviceResponse.data = {
      result_type: resultType.userRedemption,
      [resultType.userRedemption]: formattedRsp.data
    };
  };

  return Promise.resolve(
    routeHelper.perform(req, res, next, 'UserRedemptionGet', 'r_v2_u_28', null, dataFormatterFunc)
  );
});

module.exports = router;
