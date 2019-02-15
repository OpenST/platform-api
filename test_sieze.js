/****
GetTokenWorkingProcess = require('./lib/executeTransactionManagement/GetTokenWorkingProcess')
new GetTokenWorkingProcess({ tokenId: 1012 }).perform().then(console.log)


InitProcessKlass = require('./lib/executeTransactionManagement/initProcess')
InitProcess = new InitProcessKlass({processId: 15})
InitProcess.perform().then(console.log)

****/

rootPrefix = '.';
rabbitMqProvider = require(rootPrefix + '/lib/providers/notification');
connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');
coreConstants = require(rootPrefix + '/config/coreConstants');
basicHelper = require(rootPrefix + '/helpers/basic');
ByChainIdKlass = require(rootPrefix + '/helpers/configStrategy/ByChainId');
OSTBase = require('@openstfoundation/openst-base');

require(rootPrefix + '/lib/executeTransactionManagement/GetPublishDetails');

chainId = 2000;
ic = null;

async function getConfig() {
  if (ic) return ic;

  let b = new ByChainIdKlass(chainId);
  let config = await b.getComplete();

  let InstanceComposer = OSTBase.InstanceComposer;
  ic = new InstanceComposer(config.data);
  return ic;
}
function getEpheAddr() {
  var addresses = [
    '0x416a20d9339ab77582252a4d398269d0710f5c12',
    '0xb45d7ec6199c347374332c60fe3a2f20c6d7da91',
    '0x9266f942c4674b9471b8eb903478eb325056dd30',
    '0x48803484991537a70aa376b4239029cd7787a37b',
    '0x0340b352ecdb23992e65d8296d66ac99f1e3e269'
  ];

  let min = 0;
  let max = addresses.length;
  let randomNo = Math.floor(Math.random() * (+max - +min) + +min);

  return addresses[randomNo];
}

function getNotiInstance() {
  return rabbitMqProvider.getInstance({
    connectionWaitSeconds: connectionTimeoutConst.crons,
    switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons,
    chainId: chainId
  });
}

async function getPublishDetails() {
  await getConfig();
  let GetTopicNameToPublishObj = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ExTxGetPublishDetails');
  return new GetTopicNameToPublishObj({ tokenId: 1012, ephemeralAddress: getEpheAddr() }).perform();
}

async function publish() {
  let openStNotification = await getNotiInstance();
  for (let i = 0; i < 5; i++) {
    let publishDetails = await getPublishDetails();
    let messageParams = {
      topics: [publishDetails.topicName],
      publisher: 'abcd',
      message: {
        kind: 'execute_transaction',
        payload: {
          chainId: 2000,
          tokenAddressId: publishDetails.tokenAddressId,
          sequence: i
        }
      }
    };
    await basicHelper.pauseForMilliSeconds(100);
    let setToRMQ = await openStNotification.publishEvent.perform(messageParams);
    console.log('topicName-----', publishDetails.topicName, 'setToRMQ----', setToRMQ);
  }
  return true;
}

publish().then(function() {
  //process.exit(0);
});
