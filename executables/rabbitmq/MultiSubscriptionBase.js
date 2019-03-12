'use strict';
/**
 * Class for subscriber base.
 *
 * @module executables/rabbitmq/MultiSubscriptionBase
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

/**
 * Class for subscriber base.
 *
 * @class
 */
class MultiSubscriptionBase extends CronBase {
  /**
   * Constructor for subscriber base
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.subscriptionTopicToDataMap = {};
  }

  /**
   * Validate and sanitize params.
   *
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    if (!oThis.prefetchCount) {
      logger.error('Prefetch count un-available in cron params in the database.');
      process.emit('SIGINT');
    }

    oThis.prefetchCount = parseInt(oThis.prefetchCount);

    if (!CommonValidators.validateNonZeroInteger(oThis.prefetchCount)) {
      logger.error('Prefetch count is not a valid integer.');
      process.emit('SIGINT');
    }

    logger.step('Common validations done.');

    oThis._specificValidations();

    logger.step('Specific validations done.');

    return true;
  }

  /**
   * Get promise queue manager for subscription topic
   *
   * @param subscriptionTopic {string}
   * @return {*}
   */
  promiseQueueManager(subscriptionTopic) {
    const oThis = this;

    let rabbitmqSubscription = oThis.subscriptionTopicToDataMap[subscriptionTopic];

    // trying to ensure that there is only one _PromiseQueueManager;
    if (rabbitmqSubscription.promiseQueueManager) return rabbitmqSubscription.promiseQueueManager;

    let qm = new OSTBase.OSTPromise.QueueManager(
      function(...args) {
        // Promise executor should be a static method by itself. We declared an unnamed function
        // which was a static method, and promiseExecutor was passed in the same scope as that
        // of the class with oThis preserved.
        oThis._promiseExecutor(...args);
      },
      {
        name: oThis._processNamePrefix + '_promise_queue_manager',
        timeoutInMilliSecs: oThis.timeoutInMilliSecs,
        maxZombieCount: Math.round(oThis.prefetchCount * 0.25),
        onMaxZombieCountReached: oThis._onMaxZombieCountReached
      }
    );

    rabbitmqSubscription.setPromiseQueueManager(qm);

    return rabbitmqSubscription.promiseQueueManager;
  }

  /**
   * Start the actual functionality of the cron.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    await oThis._beforeSubscribe();

    oThis._prepareSubscriptionData();

    await oThis._startSubscription();

    return true;
  }

  /**
   * Start subscription
   *
   * @param subscriptionTopic
   * @return {Promise<void>}
   *
   * @private
   */
  async _startSubscriptionFor(subscriptionTopic) {
    const oThis = this;

    let rabbitmqSubscription = oThis.subscriptionTopicToDataMap[subscriptionTopic];

    const ostNotification = await rabbitmqProvider.getInstance(rabbitmqSubscription.rabbitmqKind, {
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons,
      auxChainId: rabbitmqSubscription.auxChainId
    });

    // below condition is to save from multiple subscriptions by command messages.
    if (!rabbitmqSubscription.isSubscribed()) {
      rabbitmqSubscription.markAsSubscribed();

      oThis.promiseQueueManager(subscriptionTopic);

      if (rabbitmqSubscription.consumerTag) {
        process.emit('RESUME_CONSUME', rabbitmqSubscription.consumerTag);
      } else {
        ostNotification.subscribeEvent
          .rabbit(
            [rabbitmqSubscription.topic],
            {
              queue: rabbitmqSubscription.queue,
              ackRequired: oThis.ackRequired,
              prefetch: rabbitmqSubscription.prefetchCount
            },
            function(params) {
              let messageParams = {};
              try {
                messageParams = JSON.parse(params);
              } catch (err) {
                logger.error('--------Parsing failed--------------params-----', JSON.stringify(params));
                return Promise.resolve({});
              }

              return oThis
                ._sequentialExecutor(messageParams)
                .then(
                  function(response) {
                    messageParams.fromAddress = response.data.address;
                    messageParams.fromAddressNonce = response.data.nonce;

                    if (response.isFailure()) {
                      return Promise.resolve({});
                    }

                    return rabbitmqSubscription.promiseQueueManager.createPromise(messageParams);
                  },
                  function(err) {
                    logger.error('---------------------reject err------', err.toString());
                    return Promise.resolve({});
                  }
                )
                .catch(function(error) {
                  logger.error('Error in execute transaction', error);
                  return Promise.resolve({});
                });
            },
            function(consumerTag) {
              rabbitmqSubscription.setConsumerTag(consumerTag);
            }
          )
          .catch(function(error) {
            logger.error('Error in subscription', error);
            oThis._ostRmqError();
          });
      }
    }
  }

  /**
   * This method executes the promises.
   *
   * @param onResolve
   * @param onReject
   * @param {String} messageParams
   *
   * @returns {*}
   *
   * @private
   */
  _promiseExecutor(onResolve, onReject, messageParams) {
    const oThis = this;

    oThis._incrementUnAck(messageParams);

    oThis
      ._processMessage(messageParams)
      .then(function() {
        oThis._decrementUnAck(messageParams);
        onResolve();
      })
      .catch(function(error) {
        oThis._decrementUnAck(messageParams);
        logger.error(
          'e_r_csb_w_1',
          'Error in process message from rmq. unAckCount ->',
          oThis._getUnAck(messageParams),
          'Error: ',
          error,
          'Params: ',
          messageParams
        );
        onResolve();
      });
  }

  /**
   * ost rmp error
   *
   * @param err
   * @private
   */
  _ostRmqError(err) {
    logger.info('ostRmqError occurred.', err);
    process.emit('SIGINT');
  }

  /**
   * This function checks if there are any pending tasks left or not.
   *
   * @returns {Boolean}
   */
  _pendingTasksDone() {
    const oThis = this;

    for (let topic in oThis.subscriptionTopicToDataMap) {
      let rabbitmqSubscription = oThis.subscriptionTopicToDataMap[topic];

      if (!rabbitmqSubscription.promiseQueueManager) {
        continue;
      }

      if (rabbitmqSubscription.unAckCount !== rabbitmqSubscription.promiseQueueManager.getPendingCount()) {
        logger.error('ERROR :: unAckCount and pending counts are not in sync for', topic);
      }

      if (!(rabbitmqSubscription.promiseQueueManager.getPendingCount() == 0 && rabbitmqSubscription.unAckCount == 0)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Stops consumption upon invocation
   */
  _stopPickingUpNewTasks() {
    const oThis = this;

    // stopping consumption for all the topics
    for (let topic in oThis.subscriptionTopicToDataMap) {
      let rabbitmqSubscription = oThis.subscriptionTopicToDataMap[topic];

      rabbitmqSubscription.stopConsumption();
    }
  }

  /**
   * Timeout in milli seconds
   *
   * @return {number}
   */
  get timeoutInMilliSecs() {
    return 3 * 60 * 1000; // By default the time out is 3 minutes
  }

  /**
   * Ack required
   *
   * @return {number}
   */
  get ackRequired() {
    return 1;
  }

  /**
   * Sequential executor
   * @param messageParams
   * @return {Promise<void>}
   * @private
   */
  async _sequentialExecutor(messageParams) {
    // Default behaviour - nothing to do.
    return responseHelper.successWithData({});
  }

  /**
   * On max zombie count reached
   *
   * @private
   */
  _onMaxZombieCountReached() {
    logger.warn('e_r_sb_1', 'maxZombieCount reached. Triggering SIGTERM.');
    // Trigger gracefully shutdown of process.
    process.kill(process.pid, 'SIGTERM');
  }

  /**
   * Process name prefix
   *
   * @private
   */
  get _processNamePrefix() {
    throw 'sub class to implement.';
  }

  /**
   * Specific validations
   *
   * @private
   */
  _specificValidations() {
    throw 'sub class to implement.';
  }

  /**
   * Process message
   *
   * @private
   */
  _processMessage() {
    throw 'sub class to implement.';
  }

  /**
   * Increment Unack count
   *
   * @param messageParams
   * @private
   */
  _incrementUnAck(messageParams) {
    throw 'sub class to implement.';
  }

  /**
   * Decrement Unack count
   *
   * @param messageParams
   * @private
   */
  _decrementUnAck(messageParams) {
    throw 'sub class to implement.';
  }

  /**
   * Before subscribe
   *
   * @private
   */
  _beforeSubscribe() {
    throw 'sub class to implement.';
  }

  /**
   * Prepare subscription data
   *
   * @private
   */
  _prepareSubscriptionData() {
    throw 'sub class to implement.';
  }

  /**
   * Start subscription
   *
   * @private
   */
  _startSubscription() {
    throw 'sub class to implement.';
  }
}

module.exports = MultiSubscriptionBase;
