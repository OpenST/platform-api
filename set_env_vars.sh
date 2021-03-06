# note: values for development usage and deprecated as of 2020 09

# Core ENV Details
export SA_ENVIRONMENT='development'
export SA_SUB_ENVIRONMENT='sandbox'
export DEVOPS_ENV_ID='dev1-sandbox';

export SA_DEFAULT_LOG_LEVEL='info';
export SA_ES_DEBUG_ENABLED='1';

export DEVOPS_IP_ADDRESS='127.0.0.1';
export DEVOPS_APP_NAME='saas';

# Cache Engine
export SA_ONLY_SHARED_CACHE_ENGINE='memcached'
export SA_SHARED_MEMCACHE_SERVERS='127.0.0.1:11211'

# Database details
export SA_MYSQL_CONNECTION_POOL_SIZE='3'

export SA_SAAS_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_SAAS_SUBENV_MYSQL_USER='root'
export SA_SAAS_SUBENV_MYSQL_PASSWORD='root'

export SA_CONFIG_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_CONFIG_SUBENV_MYSQL_USER='root'
export SA_CONFIG_SUBENV_MYSQL_PASSWORD='root'

export SA_SAAS_BIG_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_SAAS_BIG_SUBENV_MYSQL_USER='root'
export SA_SAAS_BIG_SUBENV_MYSQL_PASSWORD='root'

export SA_KIT_SAAS_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_KIT_SAAS_SUBENV_MYSQL_USER='root'
export SA_KIT_SAAS_SUBENV_MYSQL_PASSWORD='root'

export SA_KIT_SAAS_MYSQL_HOST='127.0.0.1'
export SA_KIT_SAAS_MYSQL_USER='root'
export SA_KIT_SAAS_MYSQL_PASSWORD='root'

export SA_KIT_SAAS_BIG_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_KIT_SAAS_BIG_SUBENV_MYSQL_USER='root'
export SA_KIT_SAAS_BIG_SUBENV_MYSQL_PASSWORD='root'

export SA_OST_INFRA_MYSQL_HOST='127.0.0.1'
export SA_OST_INFRA_MYSQL_USER='root'
export SA_OST_INFRA_MYSQL_PASSWORD='root'
export SA_OST_INFRA_MYSQL_DB='ost_infra_development'

export SA_OST_ANALYTICS_MYSQL_HOST='127.0.0.1'
export SA_OST_ANALYTICS_MYSQL_USER='root'
export SA_OST_ANALYTICS_MYSQL_PASSWORD='root'
export SA_OST_ANALYTICS_MYSQL_DB='ost_analytics_sandbox_development'

# AWS-KMS details
export SA_KMS_AWS_ACCESS_KEY='AKIA2IE3EXDCJJUAJLC3'
export SA_KMS_AWS_SECRET_KEY='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'
export SA_KMS_AWS_REGION='us-east-1'
export SA_API_KEY_KMS_ARN='arn:aws:kms:us-east-1:704700004548:key'
export SA_API_KEY_KMS_ID='3186534a-626e-4c25-9593-8f90184da716'
export SA_KNOWN_ADDRESS_KMS_ARN='arn:aws:kms:us-east-1:704700004548:key'
export SA_KNOWN_ADDRESS_KMS_ID='3186534a-626e-4c25-9593-8f90184da716'
export SA_CONFIG_STRATEGY_KMS_ARN='arn:aws:kms:us-east-1:704700004548:key'
export SA_CONFIG_STRATEGY_KMS_ID='3186534a-626e-4c25-9593-8f90184da716'

# S3 config details
export SA_S3_AWS_ACCESS_KEY='AKIAIG7G5KJ53INDY36A'
export SA_S3_AWS_SECRET_KEY='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'
export SA_S3_AWS_REGION='us-east-1'
export SA_S3_AWS_MASTER_FOLDER='d-sandbox'
export SA_S3_ANALYTICS_BUCKET='graphs.stagingost.com'
export SA_S3_ANALYTICS_GRAPH_FOLDER='graphs'
export SA_S3_PRICEPOINTS_URL='https://s3-eu-west-1.amazonaws.com/public.ost.com/coinmarketcap/api/v2/convert'
export SA_S3_FIAT_PRICEPOINTS_PATH='hgfasgv4567gfachsv7568cvsd6t7i6hga/hfgvh345dfgc66rch.json'

# JWT details
export SA_INTERNAL_API_SECRET_KEY='1somethingsarebetterkeptinenvironemntvariables'

# SHA256 details
export SA_CACHE_DATA_SHA_KEY='066f7e6e833db143afee3dbafc888bcf'

# Web3 pool size
export OST_WEB3_POOL_SIZE=10

# Aux and Origin Gas Prices
export SA_MIN_ORIGIN_GAS_PRICE='0x2540BE400';
export SA_MAX_ORIGIN_GAS_PRICE='0x4A817C800';
export SA_DEFAULT_ORIGIN_GAS_PRICE='0x37E11D600';
export SA_BUFFER_ORIGIN_GAS_PRICE='0x3B9ACA00';
export SA_DEFAULT_AUX_GAS_PRICE='0x3B9ACA00';

# Etherscan API key
export SA_ETHERSCAN_API_KEY='P4C1623S8AG7HSXY3SJN6BN8J8WMBI81TJ';

export SA_ORIGIN_NETWORK_UPGRADE='done'

export SA_SLACK_OAUTH_TOKEN='xoxb-246676767414-944000467810-Z4yaiCeflK83AfaockF4lh8N'
export SA_SLACK_API_APP_ID='ATUK32A8Z'
export SA_SLACK_SIGNING_SECRET='0a6eadd84f9466b455d1f0a992ac339a'

export SA_FUND_FOR_CHAIN_SETUP='1'
