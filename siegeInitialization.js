'use strict';

const API_END_POINT = 'http://localhost:7001/testnet/v2/',
  BATCH_SIZE = 5,
  POLLING_INTERVAL = 5000, //5 secs
  NUMBER_OF_USERS = 5,
  CREDENTIALS_ARRAY = [
    {
      apiKey: '43538ea77d5473371dbdfb8e773341f7',
      apiSecret: '85217ad39713c51123f73a843df491218f50e997173d1c702be813451a3afb48',
      apiEndPoint: 'http://localhost:7001/testnet/v2/'
    }
  ];

const rootPrefix = '.',
  OSTSDK = require('@ostdotcom/ost-sdk-js'),
  GetTokenDetails = require(rootPrefix + '/tools/seige/userFlow/GetTokenDetails'),
  CreateUsers = require(rootPrefix + '/tools/seige/userFlow/CreateUsers'),
  GenerateRequiredAddresses = require(rootPrefix + '/tools/seige/userFlow/GenerateRequiredAddresses'),
  GetUser = require(rootPrefix + '/tools/seige/userFlow/GetUser'),
  GetDevice = require(rootPrefix + '/tools/seige/userFlow/GetDevice'),
  ActivateUser = require(rootPrefix + '/tools/seige/userFlow/ActivateUser'),
  RegisterDevice = require(rootPrefix + '/tools/seige/userFlow/RegisterDevice'),
  SiegeUsersModel = require(rootPrefix + '/app/models/mysql/SiegeUser');

class SiegeInitialization {
  /**
   *
   * @param params
   */
  constructor() {
    const oThis = this;

    oThis.userIdsArray = [];
  }

  /**
   * params array of hashes
   * [{ apikey: 'ghjhghj',
   *    apiSecret: 'hjghjhjh',
   *    apiEndPoint: 'www.s6-stagingost.com:7000'
   * },
   * { apikey: 'ghjhghj',
   *    apiSecret: 'hjghjhjh',
   *    apiEndPoint: 'www.s6-stagingost.com:7000'
   * }
   * ]
   * @param params
   */
  perform(params) {
    const oThis = this;

    return oThis._asyncPerform(params).catch(function(err) {
      console.log(' In catch block', err);
      return Promise.resolve(err);
    });
  }

  async _asyncPerform(params) {
    const oThis = this;

    for (let index = 0; index < params.length; index++) {
      let apiKey = params[index].apiKey,
        apiSecret = params[index].apiSecret,
        apiEndPoint = params[index].apiEndPoint;

      oThis.ostObj = new OSTSDK({
        apiKey: apiKey,
        apiSecret: apiSecret,
        apiEndpoint: apiEndPoint
      });
    }

    console.log('-------------------->Fetching token data');
    await oThis._getTokenData();

    //create users
    console.log('-------------------->Creating users');
    await oThis._createUsers();

    //Generates required addresses and private key
    console.log('-------------------->Generating required addresses');
    await oThis._generateRequiredAddress();

    //Clear all old entries for given token id
    await oThis._clearOldEntries();

    //Inserting userUuids and respective addresses in db
    console.log('-------------------->Inserting data in db');
    await oThis._insertAddressesInDB();

    //Start Siege
    console.log('-------------------->Starting siege');
    await oThis._startSiege();
  }

  async _getTokenData() {
    let oThis = this,
      getTokenDetailsObj = new GetTokenDetails({ ostObj: oThis.ostObj }),
      tokenDetails = await getTokenDetailsObj.perform();

    oThis.tokenId = tokenDetails.token.id;
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _createUsers() {
    let oThis = this,
      createUsersObj = new CreateUsers({ ostObj: oThis.ostObj, numberOfUsers: NUMBER_OF_USERS });

    oThis.userIdsArray = await createUsersObj.perform();
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _generateRequiredAddress() {
    let oThis = this,
      generateRequiredAddressObj = new GenerateRequiredAddresses({ userIdsArray: oThis.userIdsArray });

    oThis.requiredAddressesHash = await generateRequiredAddressObj.perform();
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _clearOldEntries() {
    let oThis = this,
      siegeUsersObj = new SiegeUsersModel(),
      deleteRsp = await siegeUsersObj
        .delete()
        .where(['id > 0 AND token_id = ?', oThis.tokenId])
        .fire();

    return Promise.resolve();
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _insertAddressesInDB() {
    let oThis = this,
      siegeUsersObj = new SiegeUsersModel(),
      insertColumns = ['token_id', 'user_uuid', 'device_address', 'device_pk', 'session_address', 'session_pk'],
      insertMultipleValues = [];

    for (let i = 0; i < oThis.userIdsArray.length; i++) {
      let userUuid = oThis.userIdsArray[i],
        addressesDetails = oThis.requiredAddressesHash[userUuid],
        insertValueArray = [];

      insertValueArray[0] = oThis.tokenId;
      insertValueArray[1] = userUuid;
      insertValueArray[2] = addressesDetails.deviceAddress;
      insertValueArray[3] = addressesDetails.deviceAddressPrivateKey;
      insertValueArray[4] = addressesDetails.sessionAddress;
      insertValueArray[5] = addressesDetails.sessionPrivateKey;

      insertMultipleValues.push(insertValueArray);
    }

    await siegeUsersObj.insertMultiple(insertColumns, insertMultipleValues).fire();
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _startSiege() {
    let oThis = this,
      promiseArray = [];

    for (let index = 0; index < oThis.userIdsArray.length; index++) {
      let userUuid = oThis.userIdsArray[index],
        addressesDetails = oThis.requiredAddressesHash[userUuid];

      promiseArray.push(oThis._performOperationsForSingleUser(userUuid, addressesDetails));

      if (promiseArray.length >= BATCH_SIZE || oThis.userIdsArray.length === index + 1) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }
    }
  }

  /**
   *
   * @param {string} userUuid
   * @param {hash} addressesData
   * @returns {Promise<void>}
   * @private
   */
  async _performOperationsForSingleUser(userUuid, addressesData) {
    let oThis = this,
      deviceAddress = addressesData.deviceAddress,
      deviceAddressPrivateKey = addressesData.deviceAddressPrivateKey,
      sessionAddress = addressesData.sessionAddress;

    //Register Device
    console.log('****Registering Device****');
    await oThis._registerDevice(userUuid, deviceAddress);

    //Activate User
    let paramsForActivateUser = {
      tokenId: oThis.tokenId,
      userUuid: userUuid,
      deviceAddress: deviceAddress,
      apiSignerPrivateKey: deviceAddressPrivateKey,
      sessionAddress: sessionAddress
    };
    console.log('****Activating User****');
    await oThis._activateUser(paramsForActivateUser);

    //Start Polling to fetch user status
    console.log('****Initiated Poll****');
    let userData = await oThis._pollForUserStatus(userUuid, 'ACTIVATED'),
      tokenHolderAddress = userData.user.token_holder_address;

    //Save token holder in db
    let siegeUsersObj = new SiegeUsersModel(),
      insertRsp = siegeUsersObj
        .update({ token_holder_contract_address: tokenHolderAddress })
        .where(['user_uuid = ?', userUuid])
        .fire();

    return Promise.resolve();
  }

  /**
   *
   * @param uuid
   * @param deviceAddress
   * @returns {Promise<void>}
   * @private
   */
  async _registerDevice(uuid, deviceAddress) {
    let oThis = this,
      registerDeviceObj = new RegisterDevice({
        userUuid: uuid,
        deviceAddress: deviceAddress,
        ostObj: oThis.ostObj
      }),
      deviceData = await registerDeviceObj.perform();
  }

  /**
   *
   * @param params
   * @returns {Promise<void>}
   * @private
   */
  async _activateUser(params) {
    let oThis = this,
      activateUserObj = new ActivateUser({
        tokenId: params.tokenId,
        userUuid: params.userUuid,
        deviceAddress: params.deviceAddress,
        apiSignerPrivateKey: params.apiSignerPrivateKey,
        sessionAddress: params.sessionAddress,
        expirationHeight: '1000000000000',
        spendingLimit: '100000000000000000000',
        apiEndPoint: API_END_POINT
      }),
      activateUserRsp = await activateUserObj.perform();
  }

  /**
   *
   * @param userUuid
   * @param status
   * @returns {Promise<*>}
   * @private
   */
  async _pollForUserStatus(userUuid, status) {
    let oThis = this;

    return new Promise(async function(onResolve, onReject) {
      const _getUserData = async function(userUuid) {
        let getUserDataObj = new GetUser({ ostObj: oThis.ostObj, userUuid: userUuid }),
          userData = await getUserDataObj.perform();

        console.log('.');

        if (userData.user.status == status) {
          return onResolve(userData);
        } else {
          setTimeout(async function() {
            _getUserData(userUuid);
          }, POLLING_INTERVAL);
        }
      };

      _getUserData(userUuid);
    });
  }

  async _getDeviceData() {
    let oThis = this,
      getDeviceDataObj = new GetDevice({
        ostObj: oThis.ostObj,
        userUuid: '03d05683-0230-44f1-8daa-5f775aa06527',
        deviceAddress: '0xc8fF9541Fefd9456d864D2d77bb3557DD510E012'
      }),
      deviceData = await getDeviceDataObj.perform();

    console.log('=====>deviceData', deviceData);
  }
}

new SiegeInitialization().perform(CREDENTIALS_ARRAY).then(function() {
  setTimeout(function() {
    console.log('********** DONE ************');
    process.exit(0);
  }, 5000);
});
