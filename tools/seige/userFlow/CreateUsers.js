//IP: obj sdk and no. of users
//OP: array of user ids

const rootPrefix = '../../..';

const BATCH_SIZE = 5;

class CreateUsers {
  constructor(params) {
    const oThis = this;

    oThis.numberOfUsers = params.numberOfUsers;
    oThis.ostObj = params.ostObj;
  }

  async perform() {
    const oThis = this,
      userService = oThis.ostObj.services.users;

    let promiseArray = [],
      userUuidsArray = [],
      beforeTimeStamp = Date.now();

    for (let i = 0; i < oThis.numberOfUsers; i++) {
      let beforeTimeStamp = Date.now();
      promiseArray.push(
        userService
          .create({ i: i })
          .then(function(res) {
            userUuidsArray.push(res.data.user.id);
            let afterTimeStamp = Date.now();
            console.log('Time taken by Create Users: ', afterTimeStamp - beforeTimeStamp, 'ms');
          })
          .catch(function(err) {
            console.log(JSON.stringify(err));
          })
      );

      if (promiseArray.length >= BATCH_SIZE || oThis.numberOfUsers === i + 1) {
        await Promise.all(promiseArray);
        promiseArray = [];
        beforeTimeStamp = Date.now();
      }
    }

    return userUuidsArray;
  }
}

module.exports = CreateUsers;
