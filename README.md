# Doichain Meteor API

This meteor project adds the Doichain (see https://doichain.org) REST API to your web project.

1. Prerequisites
    - running Doichain Node (manual installation see: https://github.com/Doichain/core/tree/master/doc)
    - or via Docker-Hub ``docker run -it doichain/node-only``

2. Installation
    - ```meteor add doichain:doichain-meteor-api```
    - ```meteor npm install simpl-schema```
    - configure settings.json as described under https://github.com/Doichain/dapp#settings or us example
```
    {
    "app": {
    "debug": "true",
    "host": "localhost",
    "port": "3000",
    "types": [
      "send"
    ]
      },
      "send": {
        "doiMailFetchUrl": "http://localhost:3000/api/v1/debug/mail",
        "doichain": {
          "host": "localhost",
          "port": "8338",
          "username": "admin",
          "password": "***put-your-password-here***"
        }
      }
    }
``` 
    - run meteor ```meteor run --settings settings.json```


3. Test REST-API
    - authenticate via REST e.g. via ```curl -H "Content-Type: application/json" -X POST -d '{"username":"admin","password":"password"}' http://localhost:3000/api/v1/login ```
    - request a basic doi via ```curl -X POST -H 'X-User-Id: <userId from above>' -H 'X-Auth-Token: <x-auth-token-from-above>' -i 'http://localhost:3000/api/v1/opt-in?recipient_mail=<your-customer-email@example.com>&sender_mail=info@doichain.org'```

4. Use Javascript-Api
    - request doi with 