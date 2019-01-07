# saas-api

## Setup
Install all the packages.
```
npm install
```

Source all the ENV vars.
```
source set_env_vars.sh
```

Seed the [config strategy](https://github.com/OpenSTFoundation/saas-api/blob/master/configStrategySeed.md) table.

Create folder structure.
```
cd ~
mkdir openst-setup
cd openst-setup
mkdir geth
mkdir bin
mkdir logs
cd geth
mkdir origin-1000
mkdir aux-2000
cd ..
cd logs
mkdir origin-1000
mkdir aux-2000
mkdir shared
cd ..
cd bin
mkdir origin-1000
mkdir aux-2000
```

Init origin Geth.
```
geth --datadir ~/openst-setup/geth/origin-1000 init $WORKSPACE/saas-api/tools/localSetup/powGenesisTemplate.json
```

Start origin Geth
```
geth --datadir ~/openst-setup/geth/origin-1000 --networkid 1000 --port 30310 --rpc --rpcapi eth,net,web3,personal,txpool --wsapi eth,net,web3,personal,txpool --rpcaddr 127.0.0.1 --rpcport 8545 --ws --wsaddr 127.0.0.1 --wsport 8546 --wsorigins '*' --etherbase 0xfc8d8fb384d3dc57aacda5bb584d6c63ca476911 --mine --minerthreads 1 --targetgaslimit 9000000  --gasprice 0x3B9ACA00 --unlock 0xfc8d8fb384d3dc57aacda5bb584d6c63ca476911 --password ~/openst-setup/geth/origin-1000/pwd
```

Init aux Geth (change the addr to allocate)
```
geth --datadir ~/openst-setup/geth/aux-2000 init $WORKSPACE/saas-api/tools/localSetup/poaGenesisTemplate.json
```

Start aux Geth
```
geth --datadir ~/openst-setup/geth/aux-2000 --networkid 2000 --port 30311 --rpc --rpcapi eth,net,web3,personal,txpool --wsapi eth,net,web3,personal,txpool --rpcaddr 127.0.0.1 --rpcport 9545 --ws --wsaddr 127.0.0.1 --wsport 9546 --wsorigins ‘*’ --etherbase 0xfc8d8fb384d3dc57aacda5bb584d6c63ca476911 --mine --minerthreads 1 --targetgaslimit 9000000  --gasprice 0x0 --unlock 0xfc8d8fb384d3dc57aacda5bb584d6c63ca476911 --password ~/openst-setup/geth/aux-2000/pwd
```

Follow steps in tools/chainSetup/steps.js