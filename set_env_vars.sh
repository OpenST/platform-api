# Core ENV Details
export CR_ENVIRONMENT='development'
export CR_SUB_ENVIRONMENT='sandbox'

# Cache Engine
export CR_ONLY_SHARED_CACHE_ENGINE='memcached'
export OST_SHARED_MEMCACHE_SERVERS='127.0.0.1:11211'

# Enable RabbitMQ.
export OST_RMQ_SUPPORT='1'
export OST_RMQ_HOST='172.16.0.225'
export OST_RMQ_PORT='5672'
export OST_RMQ_USERNAME='cluster_manager'
export OST_RMQ_PASSWORD='123456'
export OST_RMQ_HEARTBEATS='30'

# Database details
export CR_MYSQL_CONNECTION_POOL_SIZE='3'

export CR_DEFAULT_MYSQL_HOST='127.0.0.1'
export CR_DEFAULT_MYSQL_USER='root'
export CR_DEFAULT_MYSQL_PASSWORD='root'

export CR_BIG_DB_MYSQL_HOST='127.0.0.1'
export CR_BIG_DB_MYSQL_USER='root'
export CR_BIG_DB_MYSQL_PASSWORD='root'

export CR_TRANSACTION_DB_MYSQL_HOST='127.0.0.1'
export CR_TRANSACTION_DB_MYSQL_USER='root'
export CR_TRANSACTION_DB_MYSQL_PASSWORD='root'

export CR_CA_SHARED_MYSQL_HOST='127.0.0.1'
export CR_CA_SHARED_MYSQL_USER='root'
export CR_CA_SHARED_MYSQL_PASSWORD='root'

# DB details of openst-payments.
export OP_MYSQL_HOST='127.0.0.1'
export OP_MYSQL_USER='root'
export OP_MYSQL_PASSWORD='root'
export OP_MYSQL_DATABASE=openst_payments_${CR_SUB_ENVIRONMENT}_${CR_ENVIRONMENT}
export OP_MYSQL_CONNECTION_POOL_SIZE='5'

# AWS details
export CR_AWS_ACCESS_KEY='AKIAJUDRALNURKAVS5IQ'
export CR_AWS_SECRET_KEY='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'
export CR_AWS_REGION='us-east-1'

# KMS details
export CR_API_KEY_KMS_ARN='arn:aws:kms:us-east-1:604850698061:key'
export CR_API_KEY_KMS_ID='eab8148d-fd9f-451d-9eb9-16c115645635'
export CR_MANAGED_ADDRESS_KMS_ARN='arn:aws:kms:us-east-1:604850698061:key'
export CR_MANAGED_ADDRESS_KMS_ID='eab8148d-fd9f-451d-9eb9-16c115645635'

# JWT details
export CA_SAAS_API_SECRET_KEY='1somethingsarebetterkeptinenvironemntvariables'

# SHA256 details
export CA_GENERIC_SHA_KEY='9fa6baa9f1ab7a805b80721b65d34964170b1494'
export CR_CACHE_DATA_SHA_KEY='066f7e6e833db143afee3dbafc888bcf'

export CR_ACCEPTED_PRICE_FLUCTUATION_FOR_PAYMENT='{"OST":{"USD": "1000000000000000000"}}'

export OST_WEB3_POOL_SIZE=10

# Main-net
export MIN_VALUE_GAS_PRICE='0xBA43B7400';
export MAX_VALUE_GAS_PRICE='0x174876E800';
export DEFAULT_VALUE_GAS_PRICE='0x1176592E00';
export BUFFER_VALUE_GAS_PRICE='0xBA43B7400';
export ENV_IDENTIFIER='mainnet_launch';

# App directory path
export APP_SHARED_DIRECTORY=$HOME/openst-setup