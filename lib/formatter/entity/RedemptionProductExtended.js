const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for redemption product extended formatter.
 *
 * @class RedemptionProductExtendedFormatter
 */
class RedemptionProductExtendedFormatter {
  /**
   * Constructor for redemption product extended formatter.
   *
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.name
   * @param {string} params.description
   * @param {object} params.images
   * @param {string} params.status
   * @param {number} params.updatedTimestamp
   * @param {array<object>} params.availability
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Main performer for class.
   *
   * @returns {*|result}
   */
  perform() {
    const oThis = this;

    const formattedAvailabilityArray = [];

    for (let availabilityIndex = 0; availabilityIndex < oThis.params.availability.length; availabilityIndex++) {
      const availability = oThis.params.availability[availabilityIndex];
      const denominations = availability.denominations;

      const formattedDenominationsArray = [];

      for (let denominationIndex = 0; denominationIndex < denominations.length; denominationIndex++) {
        const denomination = denominations[denominationIndex];
        const formattedDenomination = {
          amount_in_fiat: denomination.amountInFiat,
          amount_in_wei: denomination.amountInWei
        };

        formattedDenominationsArray.push(formattedDenomination);
      }

      const formattedAvailability = {
        country: availability.country,
        country_iso_code: availability.countryIsoCode,
        currency_iso_code: availability.currencyIsoCode,
        denominations: formattedDenominationsArray
      };

      formattedAvailabilityArray.push(formattedAvailability);
    }

    const formattedData = {
      id: oThis.params.id,
      name: oThis.params.name,
      images: oThis.params.images,
      description: { text: oThis.params.description },
      status: oThis.params.status,
      updated_timestamp: Number(oThis.params.uts),
      availability: formattedAvailabilityArray
    };

    return responseHelper.successWithData(formattedData);
  }
}

module.exports = RedemptionProductExtendedFormatter;
