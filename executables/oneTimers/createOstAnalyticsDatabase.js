/**
 * Module for creating ost_analytics database.
 *
 * @module executables/oneTimers/createOstAnalyticsDatabase
 */

const mysql = require('mysql');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare mysql connection.
const connection = mysql.createConnection({
  host: coreConstants.OST_ANALYTICS_MYSQL_HOST,
  user: coreConstants.OST_ANALYTICS_MYSQL_USER,
  password: coreConstants.OST_ANALYTICS_MYSQL_PASSWORD
});

// Connect to the MySQL server.
connection.connect(function(error) {
  if (error) {
    return console.error('Error: ' + error.message);
  }

  connection.query(`CREATE DATABASE ${coreConstants.OST_ANALYTICS_MYSQL_DB}`, function(err) {
    if (err) {
      throw err;
    }
    console.log('Database created.');
  });

  connection.end(function(err) {
    if (err) {
      return console.log(err.message);
    }
  });
});
