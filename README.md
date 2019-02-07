# Saas API
Saas API layer.

* Kit API Setup
  Instructions are published at: https://github.com/OpenSTFoundation/kit-api/blob/master/README.md

* Requirements
  You will need following for development environment setup.
    - [nodejs](https://nodejs.org/) >= 8.0.0
    - [Geth](https://github.com/ethereum/go-ethereum/) >= 1.8.20
    - [Memcached](https://memcached.org/)
    - [DB Browser for SQLite](https://sqlitebrowser.org/)

* Installing Geth
```
git clone https://github.com/ethereum/go-ethereum.git
cd go-ethereum
git checkout tags/v1.8.20
make geth
sudo cp ~/workspace/go-ethereum/build/bin/geth /usr/local/bin
```

* Start RabbitMQ
```
brew services start rabbitmq
```

* Install all the packages.
```
rm -rf node_modules
rm -rf package-lock.json
npm install
```

* Source all the ENV vars.
```bash
source set_env_vars.sh
```

* Clear cache. [Sunil: Why are we keeping memcache in env and database?]
```bash
node  executables/flush/sharedMemcached.js
```

## [Only Development] Start Dynamo DB
```bash
rm ~/dynamodb_local_latest/shared-local-instance.db

java -Djava.library.path=~/dynamodb_local_latest/DynamoDBLocal_lib/ -jar ~/dynamodb_local_latest/DynamoDBLocal.jar -sharedDb -dbPath ~/dynamodb_local_latest/
```

## ORIGIN CHAIN SETUP
    README-ORIGIN-SETUP.md

# AUX CHAIN SETUP
    README-AUX-SETUP.md