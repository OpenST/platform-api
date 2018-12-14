'use strict';

const signature = {

  start_on_boarding: {
    mandatory: [
      {
        parameter: 'client_id',
        error_identifier: 'missing_client_id'
      },
      {
        parameter: 'token_symbol',
        error_identifier: 'missing_token_symbol'
      },
      {
        parameter: 'stake_and_mint_params',
        error_identifier: 'missing_stake_and_mint_params'
      },
      {
        parameter: 'client_token_id',
        error_identifier: 'missing_client_token_id'
      }
    ],
    optional: ['airdrop_params']
  }

};

module.exports = signature;
