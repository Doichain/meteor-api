Package.describe({
  name: 'doichain-meteor-api',
  version: '0.0.6',
  summary: 'Provides a Doichain REST API & webfrontend to an installed Doichain Node',
  git: 'https://github.com/Doichain/meteor-api.git',
  documentation: 'README.md'
});

Npm.depends({
    '@babel/runtime':'7.2.0',
    'simpl-schema':'1.5.3',
    'bcrypt': '1.0.3',
    'bitcore-message': '1.0.4',
    'bs58': '4.0.1',
    'chrome': '0.1.0',
    'classnames': '2.2.6',
    'crypto': '1.0.1',
    'crypto-js': '3.1.9-1',
    'fs': '0.0.1-security',
    'hashids': '1.2.2',
    'hoek': '5.0.3',
    'material-ui': '0.20.2',
    'meteor-node-stubs': '0.3.3',
    'mocha': '5.2.0',
    'namecoin': '0.1.4',
    'prop-types': '15.6.2',
    'react': '16.6.3',
    'react-addons-css-transition-group': '15.6.2',
    'react-dom': '16.6.3',
    'react-router': '3.2.1',
    'react-router-private-route': '0.0.3',
    'scribe-js': '2.0.4',
    'secp256k1': '3.5.0',
    'standard-ecies': '1.0.0',
    'uuid': '3.3.2'
});

Package.onUse(function(api) {
  api.versionsFrom('1.8.0.1');
  api.addFiles('private/version.json', 'server', { isAsset: true });
  api.use('ecmascript@0.12.3');
  api.use('underscore@1.0.10');
  api.use('accounts-password@1.5.1');
  api.use('alanning:roles@1.2.16');
  api.use('babel-runtime@1.3.0');
  api.use('blaze-html-templates@1.1.2');
  api.use('ddp-rate-limiter@1.0.7');
  api.use('email@1.2.3');
  api.use('es5-shim@4.0.0');
  api.use('http@1.4.2');
  api.use('less@2.8.0');
  api.use('mdg:validated-method@1.2.0');
  api.use('nimble:restivus@0.8.12');
  api.use('planettraining:material-design-icons-font@2.2.3');
  api.use('practicalmeteor:chai@2.1.0_1');
  api.use('react-meteor-data@0.2.17');
  api.use('rwatts:uuid');
  api.use('sakulstra:aggregate');
  api.use('session@1.2.0');
  api.use('std:accounts-ui@1.3.3');
  api.use('tracker@1.2.0');
  api.use('universe:i18n@1.20.1');
  api.use('vsivsi:job-collection@1.4.0');
  api.use('zetoff:accounts-material-ui@0.0.15');
    api.use('aldeed:collection2@3.0.1');
    api.use('aldeed:schema-deny@2.0.1');
    api.use('aldeed:schema-index@3.0.0');
  api.mainModule('doichain-api.js');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('doichain-meteor-api');
  api.mainModule('doichain-api-tests.js');
});
