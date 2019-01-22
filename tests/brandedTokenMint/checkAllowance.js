const rootPrefix = '../..',
  CheckAllowance = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/CheckAllowance'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const assert = require('assert');

describe('Check allowance', function() {
  it('Should have enough allowance', async function() {
    let checkAllowance = new CheckAllowance({
      simpleTokenContract: '0xab5f71b354f75701bb4e7443dda1784f89b1b442',
      stakerAddress: '0xd1abbdccc3dfa2a80a6e99da97339a5f12ed911e',
      stakeAmount: 1000000,
      originChainId: 1000,
      tokenId: 1
    });
    let response = await checkAllowance.perform();

    assert.equal(workflowStepConstants.taskDone, response.data.taskStatus);
  });
});
