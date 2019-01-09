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
> node tools/localSetup/originChainSetup.js --originChainId 1000
```
   - NOTE: Make sure you don't exit the tab, so that origin geth will be running.
   
   
* Run following command for aux chain setup.
```bash
> node tools/localSetup/auxChainSetup.js --originChainId 1000 --auxChainId 2000
```