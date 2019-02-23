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
* [Only Development] Use docker to run required services

Install docker if not already installed. Refer [this](https://docs.docker.com/docker-for-mac/install/).

Start services:
```
docker-compose up
```
Above command will start below services

|  Service  	|     Port    	|
|:---------:	|:-----------:	|
|   mysql   	|     3306    	|
| memcached 	|    11211    	|
|   redis   	|     6379    	|
|  Rabbitmq 	| 15672, 5672 	|
| Dynamo db 	|     8000    	|

Stop services:
```
docker-compose down
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

* Clear cache.
```bash
node  executables/flush/sharedMemcached.js
```


## ORIGIN CHAIN SETUP
[README-ORIGIN-SETUP.md](README-ORIGIN-SETUP.md)

## AUX CHAIN SETUP
[README-AUX-SETUP.md](README-AUX-SETUP.md)
