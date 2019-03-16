const rootPrefix = '../../..';

class GetTokenDetails {
  constructor(params) {
    const oThis = this;

    oThis.ostObj = params.ostObj;
  }

  async perform() {
    let oThis = this,
      tokenService = oThis.ostObj.services.tokens,
      beforeTimeStamp = Date.now(),
      tokenData = await tokenService.get({}).catch(function(err) {
        console.log(JSON.stringify(err));
      }),
      afterTimeStamp = Date.now();

    console.log('Time taken by Get Token Details: ', afterTimeStamp - beforeTimeStamp);

    return tokenData.data;
  }
}

module.exports = GetTokenDetails;
