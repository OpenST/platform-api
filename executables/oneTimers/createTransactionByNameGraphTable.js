/**
 * Module for creating transaction_by_name_graph table.
 *
 * @module executables/oneTimers/createTransactionByNameGraphTable
 */

const mysql = require('mysql');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare mysql connection.
const connection = mysql.createConnection({
  host: coreConstants.OST_ANALYTICS_MYSQL_HOST,
  user: coreConstants.OST_ANALYTICS_MYSQL_USER,
  password: coreConstants.OST_ANALYTICS_MYSQL_PASSWORD,
  database: coreConstants.OST_ANALYTICS_MYSQL_DB
});

// Connect to the MySQL server.
connection.connect(function(error) {
  if (error) {
    return console.error('Error: ' + error.message);
  }

  const createErrorLogs = `CREATE TABLE \`transaction_by_name_graph\` (
  \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
  \`chain_id\` int(11) NOT NULL,
  \`token_id\` int(11) NOT NULL,
  \`timestamp\` int(11) NOT NULL,
  \`meta_name\` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  \`graph_duration_type\` varchar(10) COLLATE utf8_unicode_ci NOT NULL,
  \`total_transactions\` bigint(20) NOT NULL,
  \`total_transfers\` bigint(20) NOT NULL,
  \`total_volume\` decimal(60,0) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`ci_ti_gdt_t\` (\`chain_id\`,\`token_id\`,\`graph_duration_type\`,\`timestamp\`)
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
