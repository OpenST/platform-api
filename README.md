# Pre Setup

* Setup Kit API. Instructions are published at:  
  https://github.com/OpenSTFoundation/kit-api/blob/master/README.md

# saas-api

### Setup
Install all the packages.
```
npm install
```

* Source all the ENV vars.
```bash
source set_env_vars.sh
```

### Config Strategies Creation

- Seed the [config strategy](https://github.com/OpenSTFoundation/saas-api/blob/master/configStrategySeed.md) table.

### Local Chain Setup

* Setup Origin GETH and fund necessary addresses.
```bash
> source set_env_vars.sh
> node executables/setup/origin/gethAndAddresses.js --originChainId 1000
```

* Start Origin GETH with this script.
```bash
> sh ~/openst-setup/bin/origin-1000/origin-chain-1000.sh
```

* Setup Simple Token (only for non production_main env)
```bash
> source set_env_vars.sh
> node executables/setup/origin/simpleToken.js --originChainId 1000
```

* Setup Origin Contracts
```bash
> source set_env_vars.sh
> node executables/setup/origin/contracts.js --originChainId 1000
```
   
* Run following command for aux chain setup.
```bash
> source set_env_vars.sh
> node tools/localSetup/auxChainSetup.js --originChainId 1000 --auxChainId 2000
```

* If you need to run auxiliary geth, run this script.
```bash
> sh ~/openst-setup/bin/aux-2000/aux-chain-2000.sh
```

