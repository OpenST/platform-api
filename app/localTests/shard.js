const assert = require('assert');

let rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  OSTBase = require('@openstfoundation/openst-base'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');

require(rootPrefix + '/app/models/ddb/shared/Shard.js');

const InstanceComposer = OSTBase.InstanceComposer;

describe('Shard management', function() {
  it('Should create a table', async function() {
    let configStrategyHelper = new ConfigStrategyHelper(0, 0),
      configRsp = await configStrategyHelper.getComplete(),
      ic = new InstanceComposer(configRsp.data);

    let Model = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      model = new Model({});

    await model.createTable();
  });
});
