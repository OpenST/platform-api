const rootPrefix = '../..',
  ProcessTransaction = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/ProcessTransaction');

describe('After request stake', function() {
  it('Should insert entry in pending transactions', async function() {
    let processTx = new ProcessTransaction({
      originChainId: 1000,
      transactionHash: '0xbc0ee0b2b71c46db08b7e7307a87d46b3084e36a32a9d311b050ee23ea7e1cab'
    });
    await processTx.perform();
  });
});
