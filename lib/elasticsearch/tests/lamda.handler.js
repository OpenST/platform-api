const rootPrefix = '../',
  logger = require(rootPrefix + '/providers/logger'),
  esServices = require(rootPrefix + '/lib/es_services/manifest'),
  TransactionsService = require(rootPrefix + '/services/transactions/service'),
  responseHelper = require(rootPrefix + '/providers/responseHelper'),
  Constants = require(rootPrefix + '/config/constants'),
  config = require(rootPrefix + '/config/es'),
  BulkService = esServices.BulkService;

const pendingTransactionTablePostFix = '_pending_transactions';

let event = {
  Records: [
    {
      eventID: '2ab332e4fe213598c524953fabe63560',
      eventName: 'REMOVE',
      eventVersion: '1.1',
      eventSource: 'aws:dynamodb',
      awsRegion: 'us-east-1',
      dynamodb: {
        ApproximateCreationDateTime: 1551179313,
        Keys: {
          txuuid: {
            S: 'ae1781b5-53a1-4f30-ba0d-5730c4008b49'
          },
          cid: {
            N: '199'
          }
        },
        SequenceNumber: '3495100000000007620845578',
        SizeBytes: 48,
        StreamViewType: 'NEW_IMAGE'
      },
      eventSourceARN:
        'arn:aws:dynamodb:us-east-1:704700004548:table/s6_s_a_199_pending_transactions/stream/2019-02-26T07:10:22.403'
    }
    /*{
      "eventID": "ea04e42d463e68e1d555bf99cf095d05",
      "eventName": "INSERT",
      "eventVersion": "1.1",
      "eventSource": "aws:dynamodb",
      "awsRegion": "us-east-1",
      "dynamodb": {
        "ApproximateCreationDateTime": 1551179290,
        "Keys": {
          "txuuid": {
            "S": "ae1781b5-53a1-4f30-ba0d-5730c4008b49"
          },
          "cid": {
            "N": "199"
          }
        },
        "NewImage": {
          "nn": {
            "N": "3"
          },
          "val": {
            "N": "0"
          },
          "cts": {
            "N": "1551179290"
          },
          "gl": {
            "N": "800000"
          },
          "txh": {
            "S": "0x1f57b521bd3412909f46ebbd495d5769be7e9b4d764c39480a47a4631141280a"
          },
          "ip": {
            "S": "0xd94c2529000000000000000000000000eb838dbad9af876ed95c505674a096965fcdca41000000000000000000000000000000000000000000000000000000000000010000000000000000000000000005e3a7a31ffe3721b47098d15f6257e4858bc7c9000000000000000000000000bcf4880e1d87a719be5fc3bf207dbfb334a8cc82000000000000000000000000ea2dffffdddec5a6ecf208be4dc9f50cbba4a67800000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000044000000000000000000000000000000000000000000000000000000000000002840ec78d9e00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000be8b3fa4133e77e72277af6b3ea7bb3750511b88000000000000000000000000000000000000000000000000000000000000018460df7f5800000000000000000000000055c501f8fa68c87dc63276281f7f59de5213bb940000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000e461b69abd000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000064cbe40622000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003840000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000e6a06e6dbd5b02f7facb27d037622e8591c9200a000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000021e19e0c9bab240000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000005f5e100"
          },
          "fad": {
            "S": "0xc94e3d06358edd0b32523113d1fa49e447f69b89"
          },
          "gp": {
            "N": "1000000000"
          },
          "ar": {
            "S": "{\"topics\":[\"auxWorkflow.userSetup\"],\"publisher\":\"OST_Workflow\",\"message\":{\"kind\":\"background_job\",\"payload\":{\"stepKind\":\"addUserInWalletFactory\",\"taskStatus\":\"taskDone\",\"currentStepId\":999,\"workflowId\":45}}}"
          },
          "uts": {
            "N": "1551179290"
          },
          "tad": {
            "S": "0xef0a213aaf6970c1f032c8445ef3aef23e4696cb"
          },
          "txuuid": {
            "S": "ae1781b5-53a1-4f30-ba0d-5730c4008b49"
          },
          "cid": {
            "N": "199"
          }
        },
        "SequenceNumber": "3494900000000007620833522",
        "SizeBytes": 2814,
        "StreamViewType": "NEW_IMAGE"
      },
      "eventSourceARN": "arn:aws:dynamodb:us-east-1:704700004548:table/s6_s_a_199_pending_transactions/stream/2019-02-26T07:10:22.403"
    },
    {
      "eventID": "083ea3888e484a34bd47509891236ede",
      "eventName": "MODIFY",
      "eventVersion": "1.1",
      "eventSource": "aws:dynamodb",
      "awsRegion": "us-east-1",
      "dynamodb": {
        "ApproximateCreationDateTime": 1551179297,
        "Keys": {
          "txuuid": {
            "S": "ae1781b5-53a1-4f30-ba0d-5730c4008b49"
          },
          "cid": {
            "N": "199"
          }
        },
        "NewImage": {
          "bts": {
            "N": "1551179294"
          },
          "nn": {
            "N": "3"
          },
          "val": {
            "N": "0"
          },
          "cts": {
            "N": "1551179290"
          },
          "gl": {
            "N": "800000"
          },
          "txh": {
            "S": "0x1f57b521bd3412909f46ebbd495d5769be7e9b4d764c39480a47a4631141280a"
          },
          "ip": {
            "S": "0xd94c2529000000000000000000000000eb838dbad9af876ed95c505674a096965fcdca41000000000000000000000000000000000000000000000000000000000000010000000000000000000000000005e3a7a31ffe3721b47098d15f6257e4858bc7c9000000000000000000000000bcf4880e1d87a719be5fc3bf207dbfb334a8cc82000000000000000000000000ea2dffffdddec5a6ecf208be4dc9f50cbba4a67800000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000044000000000000000000000000000000000000000000000000000000000000002840ec78d9e00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000be8b3fa4133e77e72277af6b3ea7bb3750511b88000000000000000000000000000000000000000000000000000000000000018460df7f5800000000000000000000000055c501f8fa68c87dc63276281f7f59de5213bb940000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000e461b69abd000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000064cbe40622000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003840000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000e6a06e6dbd5b02f7facb27d037622e8591c9200a000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000021e19e0c9bab240000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000005f5e100"
          },
          "fad": {
            "S": "0xc94e3d06358edd0b32523113d1fa49e447f69b89"
          },
          "gp": {
            "N": "1000000000"
          },
          "bn": {
            "N": "26176"
          },
          "ar": {
            "S": "{\"topics\":[\"auxWorkflow.userSetup\"],\"publisher\":\"OST_Workflow\",\"message\":{\"kind\":\"background_job\",\"payload\":{\"stepKind\":\"addUserInWalletFactory\",\"taskStatus\":\"taskDone\",\"currentStepId\":999,\"workflowId\":45}}}"
          },
          "sts": {
            "N": "3"
          },
          "uts": {
            "N": "1551179290"
          },
          "tad": {
            "S": "0xef0a213aaf6970c1f032c8445ef3aef23e4696cb"
          },
          "txuuid": {
            "S": "ae1781b5-53a1-4f30-ba0d-5730c4008b49"
          },
          "cid": {
            "N": "199"
          }
        },
        "SequenceNumber": "3495000000000007620836750",
        "SizeBytes": 2834,
        "StreamViewType": "NEW_IMAGE"
      },
      "eventSourceARN": "arn:aws:dynamodb:us-east-1:704700004548:table/s6_s_a_199_pending_transactions/stream/2019-02-26T07:10:22.403"
    },
    {
      "eventID": "5e22d7c1374e49ca0c7ba602cf046334",
      "eventName": "INSERT",
      "eventVersion": "1.1",
      "eventSource": "aws:dynamodb",
      "awsRegion": "us-east-1",
      "dynamodb": {
        "ApproximateCreationDateTime": 1551179287,
        "Keys": {
          "txuuid": {
            "S": "660c99af-7cdd-46ce-b6f9-7013c957198d"
          },
          "cid": {
            "N": "199"
          }
        },
        "NewImage": {
          "cts": {
            "N": "1551179287"
          },
          "gl": {
            "N": "3000000"
          },
          "gp": {
            "N": "1000000000"
          },
          "es": {
            "S": "{\"r\":\"0x49a9e541a6c88a6bd4776d7b7b3bc379d7cc7bf0eca10cda5695428d06c809a4\",\"s\":\"0x31d0bd28527b3e79a1cb31e7d4909500af9e914933a4c58939866e1ca9c12c6e\",\"v\":\"0x1c\",\"messageHash\":\"0x4c4c9224c1b4847d80e49fad967144c49da5830763a50adabc2e99cef9ab8cc1\",\"signature\":\"0x49a9e541a6c88a6bd4776d7b7b3bc379d7cc7bf0eca10cda5695428d06c809a431d0bd28527b3e79a1cb31e7d4909500af9e914933a4c58939866e1ca9c12c6e1c\"}"
          },
          "ra": {
            "S": "0xea2dffffdddec5a6ecf208be4dc9f50cbba4a678"
          },
          "ud": {
            "S": "[{\"era\":\"0xbcf4880e1d87a719be5fc3bf207dbfb334a8cc82\",\"tha\":\"0x740520032fc452987bd992ee1ce685667a7b83d3\",\"bud\":\"10\"}]"
          },
          "ted": {
            "S": "0x94ac7a3f000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000121eff5d65d6861c3865c655616f53bd8957643e0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000a"
          },
          "sts": {
            "N": "1"
          },
          "trs": {
            "S": "[{\"fa\":\"0x740520032fc452987bd992ee1ce685667a7b83d3\",\"ta\":\"0x121eff5d65d6861c3865c655616f53bd8957643e\",\"v\":\"10\"}]"
          },
          "ti": {
            "N": "1002"
          },
          "uts": {
            "N": "1551179287"
          },
          "tad": {
            "S": "0x740520032fc452987bd992ee1ce685667a7b83d3"
          },
          "skn": {
            "S": "0"
          },
          "txuuid": {
            "S": "660c99af-7cdd-46ce-b6f9-7013c957198d"
          },
          "ea": {
            "S": "0xbcf4880e1d87a719be5fc3bf207dbfb334a8cc82"
          },
          "cid": {
            "N": "199"
          }
        },
        "SequenceNumber": "3494800000000007620831969",
        "SizeBytes": 1289,
        "StreamViewType": "NEW_IMAGE"
      },
      "eventSourceARN": "arn:aws:dynamodb:us-east-1:704700004548:table/s6_s_a_199_pending_transactions/stream/2019-02-26T07:10:22.403"
    },*/
  ]
};

class Executor {
  /**
   * @param {Object} records
   *
   * @constructor
   **/
  constructor(records) {
    const oThis = this;
    oThis.records = records;
    oThis.bulkService = new BulkService(config);
  }

  /**
   * populateBulkService
   *
   * @param {Object} record
   *
   * @return promise
   **/
  populateBulkService(record) {
    const oThis = this;

    let service = oThis.getService(record.eventSourceARN);
    if (!service) {
      logger.error('Unable to identify service for record:\n', record);
      return;
    }

    let data = record.dynamodb.NewImage,
      eventName = record.eventName;

    /**
     * Make sure no delete operations are performed in ES via Lambda
     * */
    if (Constants.DYNAMO_DELETE_EVENT_NAME == String(eventName).toUpperCase()) {
      return Promise.resolve(data);
    }

    data = data || {};
    let keys = record.dynamodb.Keys;
    data = Object.assign({}, keys, data);

    return service.populateBulkService(eventName, data, oThis.bulkService);
  }

  /**
   * getService
   *
   * @param {string} eventSourceARN
   *
   * @return service instance
   **/

  getService(eventSourceARN) {
    const oThis = this;

    if (oThis.isTransactionTable(eventSourceARN)) {
      if (!oThis.transactionsService) {
        oThis.transactionsService = new TransactionsService(config);
      }
      return oThis.transactionsService;
    }

    return null;
  }

  /**
   * isTransactionTable
   *
   * @param {string} eventSourceARN
   *
   * @return boolean
   **/

  isTransactionTable(eventSourceARN) {
    const chainId = config['chainId'],
      ddbTablePrefix = config['ddbTablePrefix'];
    //TO DO replace via regex
    if (
      eventSourceARN.indexOf(chainId) > -1 &&
      eventSourceARN.indexOf(ddbTablePrefix) > -1 &&
      eventSourceARN.indexOf(pendingTransactionTablePostFix) > -1
    ) {
      return true;
    }

    return false;
  }

  /**
   * perform
   *
   * @return promise
   **/
  async perform() {
    const oThis = this;

    let records = oThis.records,
      len = records.length,
      cnt,
      record;

    for (cnt = 0; cnt < len; cnt++) {
      await oThis.populateBulkService(records[cnt]);
    }
    return oThis.bulkService.perform();
  }
}

const handler = async (event) => {
  let executor = new Executor(event.Records);
  let response = await executor.perform();
  if (response.isFailure()) {
    console.error(JSON.stringify(response.toHash()));
  } else {
    console.log(null, JSON.stringify(response.toHash()));
  }
};

handler(event);
