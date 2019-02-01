'use strict';

const rootPrefix = '../..',
  AUXCHAINID = 2000,
  ORIGINCHAINID = 1000,
  OldChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  NewChainAddressModel = require(rootPrefix + '/executables/oneTimers/ChainAddress'),
  KnownAddressModel = require(rootPrefix + '/app/models/mysql/KnownAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

class MigrateChainAddressesTable {
  constructor() {}

  async perform() {
    let chainAddresses = await new OldChainAddressModel().select('*').fire();

    let auxChainKind = 2,
      originChainKind = 1;

    for (let index = 0; index < chainAddresses.length; index++) {
      let chainAddressEntity = chainAddresses[index];

      console.log('chainAddressEntity====', chainAddressEntity);

      let chainId = chainAddressEntity.chain_id;
      let kind = chainAddressEntity.kind;
      let chainKind = chainAddressEntity.chain_kind;
      let auxChainId = chainAddressEntity.aux_chain_id;
      let address = chainAddressEntity.address;
      let knownAddressId = chainAddressEntity.known_address_id;
      let createdAt = chainAddressEntity.created_at;
      let updatedAt = chainAddressEntity.updated_at;

      if (chainId == AUXCHAINID && kind == 1) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 1,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 1) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 2,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 2) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 3,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 3) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 4,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 4) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: ORIGINCHAINID,
          deployed_chain_kind: this.chainKind(ORIGINCHAINID),
          kind: 5,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 4) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: AUXCHAINID,
          deployed_chain_kind: this.chainKind(AUXCHAINID),
          kind: 6,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 5) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: ORIGINCHAINID,
          deployed_chain_kind: this.chainKind(ORIGINCHAINID),
          kind: 7,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 5) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: AUXCHAINID,
          deployed_chain_kind: this.chainKind(AUXCHAINID),
          kind: 8,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 6) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 9,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 7) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 10,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();

        let anotherParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 12,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(anotherParams).fire();
      } else if (chainId == AUXCHAINID && kind == 7) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 11,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();

        let anotherParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 13,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(anotherParams).fire();

        let anotherAnotherParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 14,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(anotherAnotherParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 8) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 15,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();

        let anotherParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 17,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(anotherParams).fire();
      } else if (chainId == AUXCHAINID && kind == 8) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 16,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();

        let anotherParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 18,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(anotherParams).fire();

        let anotherAnotherParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 19,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(anotherAnotherParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 9) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 20,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();

        let anotherParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 22,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(anotherParams).fire();
      } else if (chainId == AUXCHAINID && kind == 9) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 21,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();

        let anotherParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 23,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(anotherParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 10) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: ORIGINCHAINID,
          deployed_chain_kind: this.chainKind(ORIGINCHAINID),
          kind: 24,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 10) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: AUXCHAINID,
          deployed_chain_kind: this.chainKind(AUXCHAINID),
          kind: 25,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 11) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: ORIGINCHAINID,
          deployed_chain_kind: this.chainKind(ORIGINCHAINID),
          kind: 26,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 12) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: AUXCHAINID,
          deployed_chain_kind: this.chainKind(AUXCHAINID),
          kind: 27,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 13) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: ORIGINCHAINID,
          deployed_chain_kind: this.chainKind(ORIGINCHAINID),
          kind: 28,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 13) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: AUXCHAINID,
          deployed_chain_kind: this.chainKind(AUXCHAINID),
          kind: 29,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 14) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: ORIGINCHAINID,
          deployed_chain_kind: this.chainKind(ORIGINCHAINID),
          kind: 30,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 14) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: AUXCHAINID,
          deployed_chain_kind: this.chainKind(AUXCHAINID),
          kind: 31,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 15) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: ORIGINCHAINID,
          deployed_chain_kind: this.chainKind(ORIGINCHAINID),
          kind: 32,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 15) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: AUXCHAINID,
          deployed_chain_kind: this.chainKind(AUXCHAINID),
          kind: 33,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 16) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: ORIGINCHAINID,
          deployed_chain_kind: this.chainKind(ORIGINCHAINID),
          kind: 34,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 17) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: AUXCHAINID,
          deployed_chain_kind: this.chainKind(AUXCHAINID),
          kind: 35,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 18) {
        let dbRowIdRsp = await new KnownAddressModel()
          .select('id')
          .where({ address: address })
          .fire();
        if (dbRowIdRsp.length !== 0) {
          knownAddressId = dbRowIdRsp[0].id;
        }

        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 36,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 19) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: ORIGINCHAINID,
          deployed_chain_kind: this.chainKind(ORIGINCHAINID),
          kind: 37,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 20) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 38,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 21) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 39,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 22) {
        let insertParams = {
          associated_aux_chain_id: 0,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 40,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == ORIGINCHAINID && kind == 23) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 41,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 24) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: AUXCHAINID,
          deployed_chain_kind: this.chainKind(AUXCHAINID),
          kind: 42,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      } else if (chainId == AUXCHAINID && kind == 25) {
        let insertParams = {
          associated_aux_chain_id: AUXCHAINID,
          deployed_chain_id: null,
          deployed_chain_kind: this.chainKind(null),
          kind: 43,

          known_address_id: knownAddressId,
          status: 1,
          address: address,
          created_at: createdAt,
          updated_at: updatedAt
        };
        await new NewChainAddressModel().insert(insertParams).fire();
      }
    }
  }

  chainKind(chainId) {
    if (!chainId) {
      return null;
    }
    return chainId === ORIGINCHAINID ? 1 : 2;
  }
}
module.exports = MigrateChainAddressesTable;

new MigrateChainAddressesTable().perform();
