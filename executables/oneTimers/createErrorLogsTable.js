/**
 * Module for creating error_logs table.
 *
 * @module executables/oneTimers/createErrorLogsTable
 */

const mysql = require('mysql');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare mysql connection.
const connection = mysql.createConnection({
  host: coreConstants.OST_INFRA_MYSQL_HOST,
  user: coreConstants.OST_INFRA_MYSQL_USER,
  password: coreConstants.OST_INFRA_MYSQL_PASSWORD,
  database: coreConstants.OST_INFRA_MYSQL_DB
});

// Connect to the MySQL server.
connection.connect(function(error) {
  if (error) {
    return console.error('Error: ' + error.message);
  }

  const createErrorLogs = `CREATE TABLE \`error_logs\` (
  \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
  \`app\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  \`env_id\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  \`severity\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  \`machine_ip\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  \`kind\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  \`data\` text,
  \`status\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  \`retry_count\` int(11) DEFAULT '0',
  \`created_at\` datetime NOT NULL,
  \`updated_at\` datetime NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`index_1\` (\`severity\`,\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`;

  connection.query(createErrorLogs, function(err) {
    if (err) {
      console.log(err.message);
    }
    console.log('Table created.');
  });

  connection.end(function(err) {
    if (err) {
      return console.log(err.message);
    }
  });
});
