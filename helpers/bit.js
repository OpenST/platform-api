/**
 * Util class to handle bit wise operations
 *
 * @module helpers/bit
 */

/**
 * Class for basic helper.
 *
 * @class BasicHelper
 */
class BitHelper {
  getBit(number, bitPosition) {
    return (number & (1 << bitPosition)) === 0 ? 0 : 1;
  }

  setBit(number, bitPosition) {
    return number | (1 << bitPosition);
  }

  unsetBit(number, bitPosition) {
    const mask = ~(1 << bitPosition);
    return number & mask;
  }
}

module.exports = new BitHelper();
