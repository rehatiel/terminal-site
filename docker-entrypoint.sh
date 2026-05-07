#!/bin/sh
set -e

# Generate config from environment variables
cat > /usr/share/nginx/html/js/config-env.js << 'EOF'
(function() {
    const envConfig = {
        siteName: '${SITE_NAME}',
        siteUrl: '${SITE_URL}',
        osName: '${OS_NAME}',
        osVersion: '${OS_VERSION}',
        osCodename: '${OS_CODENAME}',
        kernelName: '${KERNEL_NAME}',
        cityName: '${CITY_NAME}',
        regionName: '${REGION_NAME}',
        companyName: '${COMPANY_NAME}',
        defaultUsername: '${DEFAULT_USERNAME}',
        defaultUserFullName: '${DEFAULT_USER_FULLNAME}',
        defaultEmail: '${DEFAULT_EMAIL}',
    };

    // Merge with defaults from config.js
    window.SynthDistrict = window.SynthDistrict || {};
    window.SynthDistrict.config = Object.assign({}, window.SynthDistrict.config, envConfig);
})();
EOF

# Replace environment variables in the script
sed -i "s|\${SITE_NAME}|${SITE_NAME:-Synth District}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${SITE_URL}|${SITE_URL:-https://synthdistrict.dev}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${OS_NAME}|${OS_NAME:-Synth District Linux}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${OS_VERSION}|${OS_VERSION:-1.0}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${OS_CODENAME}|${OS_CODENAME:-Neon}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${KERNEL_NAME}|${KERNEL_NAME:-synth-district}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${CITY_NAME}|${CITY_NAME:-Synth City}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${REGION_NAME}|${REGION_NAME:-Neon State}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${COMPANY_NAME}|${COMPANY_NAME:-Synth Systems Inc.}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${DEFAULT_USERNAME}|${DEFAULT_USERNAME:-user}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${DEFAULT_USER_FULLNAME}|${DEFAULT_USER_FULLNAME:-Synth District User}|g" /usr/share/nginx/html/js/config-env.js
sed -i "s|\${DEFAULT_EMAIL}|${DEFAULT_EMAIL:-user@synthdistrict.dev}|g" /usr/share/nginx/html/js/config-env.js

exec "$@"
