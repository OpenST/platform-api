//IP: obj sdk and no. of users
//OP: array of user ids

const rootPrefix = '../../..';

const BATCH_SIZE = 10;

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
      userUuidsArray = [];

    for (let i = 0; i < oThis.numberOfUsers; i++) {
      promiseArray.push(
        userService
          .create({ i: i })
          .then(function(res) {
            userUuidsArray.push(res.data.user.id);
          })
          .catch(function(err) {
            console.log(JSON.stringify(err));
          })
      );

      if (promiseArray.length >= BATCH_SIZE || oThis.numberOfUsers === i + 1) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }
    }

    return userUuidsArray;
  }
}

module.exports = CreateUsers;
