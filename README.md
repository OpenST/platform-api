# Pre Setup

* Setup Kit API. Instructions are published at:  
  https://github.com/OpenSTFoundation/kit-api/blob/master/README.md

# saas-api

### Setup
Install all the packages.
```
npm install
```

* Start Memcached.
```bash
> memcached -p 11211 -d
```

* Source all the ENV vars.
```bash
source set_env_vars.sh
```

### Config Strategies Creation

- Seed the [config strategy](https://github.com/OpenSTFoundation/saas-api/blob/master/configStrategySeed.md) table.

### Local Chain Setup

* Run following command for origin chain setup.
```bash
> source set_env_vars.sh
> node tools/localSetup/originChainSetup.js --originChainId 1000
```

* Start Origin geth.
```bash
> sh ~/openst-setup/bin/origin-1000/origin-chain-1000.sh
```
   
* Run following command for aux chain setup.
```bash
> source set_env_vars.sh
> node tools/localSetup/auxChainSetup.js --originChainId 1000 --auxChainId 2000
```