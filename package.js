Package.describe({
  name: 'doichain-meteor-api',
  version: '0.0.8',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/Doichain/meteor-api.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.8.0.1');
  api.addFiles('private/version.json', 'server', { isAsset: true });
  api.use('ecmascript@0.12.3');
  api.use('underscore@1.0.10');
  api.use('accounts-password@1.5.1');
  api.use('alanning:roles@1.2.16');
  api.use('aldeed:collection2@3.0.1');
  api.use('aldeed:collection2-core@2.1.2');
  api.use('aldeed:schema-deny@2.0.1');
  api.use('aldeed:schema-index@3.0.0');
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



  api.mainModule('doichain-api.js');
});

Npm.depends({
    '@babel/runtime': '7.2.0',
    'emailjs-mime-codec':'2.0.7'
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('doichain-api');
  api.mainModule('doichain-api-tests.js');
});
