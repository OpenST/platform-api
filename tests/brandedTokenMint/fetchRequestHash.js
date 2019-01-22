const rootPrefix = '../..',
  FetchRequestHash = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/FetchRequestHash'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const assert = require('assert');

describe('Fetch request hash', function() {
  it('Should fetch request hash for a valid request stake transaction hash', async function() {
    let fetchRequestHash = new FetchRequestHash({
      originChainId: 1000,
      transactionHash: '0xbc0ee0b2b71c46db08b7e7307a87d46b3084e36a32a9d311b050ee23ea7e1cab'
    });
    let response = await fetchRequestHash.perform();

    assert.equal(workflowStepConstants.taskDone, response.data.taskStatus);
  });
});
