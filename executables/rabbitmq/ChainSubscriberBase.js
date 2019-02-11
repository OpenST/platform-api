'use strict';
/**
 * Class for subscriber base.
 *
 * @module executables/rabbitmq/SubscriberBase
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  sharedRabbitMqProvider = require(rootPrefix + '/lib/providers/sharedNotification'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

/**
 * Class for subscriber base.
 *
 * @class
 */
class SubscriberBase extends CronBase {
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

    oThis.unAckCount = 0;
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

    if (!CommonValidators.validateInteger(oThis.prefetchCount)) {
      logger.error('Prefetch count is not an integer.');
      process.emit('SIGINT');
    }

    if (oThis.prefetchCount < 0) {
      logger.error('Prefetch count is invalid.');
      process.emit('SIGINT');
    }

    logger.step('Common validations done.');

    oThis._specificValidations();

    logger.step('Specific validations done.');

    return true;
  }

  /**
   * Promise queue manager
   *
   * @returns {OSTBase.OSTPromise.QueueManager}
   */
  promiseQueueManager(topicName) {
    const oThis = this;

    // trying to ensure that there is only one _PromiseQueueManager;
    if (oThis.subscriptionData[topicName]['promiseQueueManager'])
      return oThis.subscriptionData[topicName]['promiseQueueManager'];

    oThis.subscriptionData[topicName]['promiseQueueManager'] = new OSTBase.OSTPromise.QueueManager(
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
        onMaxZombieCountReached: oThis.onMaxZombieCountReached
      }
    );

    return oThis.subscriptionData[topicName]['promiseQueueManager'];
  }

  /**
   * Start subscription.
   *
   * @returns {Promise<void>}
   */
  async _startSubscription(topicName) {
    const oThis = this;

    // TODO: chain specific rabbit provider.
    const openStNotification = await sharedRabbitMqProvider.getInstance({
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    });

    let subData = oThis.subscriptionData[topicName];

    // below condition is to save from multiple subscriptions by command messages.
    if (!oThis.subscriptionData[topicName]['subscribed']) {
      oThis.subscriptionData[topicName]['subscribed'] = 1;

      if (subData['consumerTag']) {
        process.emit('RESUME_CONSUME', subData['consumerTag']);
      } else {
        openStNotification.subscribeEvent
          .rabbit(
            subData.topicName,
            {
              queue: subData.queueName,
              ackRequired: oThis.ackRequired,
              prefetch: subData.prefetchCount
            },
            function(params) {
              // Promise is required to be returned to manually ack messages in RMQ
              return oThis.promiseQueueManager(topicName).createPromise(params);
            },
            function(consumerTag) {
              oThis.subscriptionData[topicName]['consumerTag'] = consumerTag;
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

    oThis.unAckCount++;

    try {
      messageParams = JSON.parse(messageParams);
    } catch (err) {
      logger.error('Error in JSON parse ', err);
      return onResolve();
    }
    oThis
      ._processMessage(messageParams)
      .then(function() {
        oThis.unAckCount--;
        onResolve();
      })
      .catch(function(error) {
        oThis.unAckCount--;
        logger.error(
          'e_bs_w_5',
          'Error in process message from rmq. unAckCount ->',
          oThis.unAckCount,
          'Error: ',
          error,
          'Params: ',
          messageParams
        );
        onResolve();
      });
  }

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

    if (oThis.unAckCount !== oThis.PromiseQueueManager.getPendingCount()) {
      logger.error('ERROR :: unAckCount and pending counts are not in sync.');
    }
    return !oThis.PromiseQueueManager.getPendingCount() && !oThis.unAckCount;
  }

  get timeoutInMilliSecs() {
    return 3 * 60 * 1000; // By default the time out is 3 minutes
  }

  get ackRequired() {
    return 1;
  }

  onMaxZombieCountReached() {
    logger.warn('e_r_sb_1', 'maxZombieCount reached. Triggering SIGTERM.');
    // Trigger gracefully shutdown of process.
    process.kill(process.pid, 'SIGTERM');
  }

  async _beforeSubscribe() {
    throw 'sub class to implement.';
  }

  get _topicsToSubscribe() {
    throw 'sub class to implement.';
  }

  get _queueName() {
    throw 'sub class to implement.';
  }

  get _processNamePrefix() {
    throw 'sub class to implement.';
  }

  _specificValidations() {
    throw 'sub class to implement.';
  }

  _processMessage() {
    throw 'sub class to implement.';
  }
}

module.exports = SubscriberBase;
