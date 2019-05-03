# Doichain Meteor API

## This meteor project adds the Doichain (see https://doichain.org) REST API to your web project.

# Installation
1. Prerequisites
    - running Doichain Node in Mainnet or Testnet (manual installation see: https://github.com/Doichain/core/tree/master/doc)
    - (Mainnet) or via Docker-Hub ``docker run -it -e RPC_PASSWORD=<my-rpc-password> -p 8339:8339 doichain/node-only``
        (e.g. add  ``-p RPC_ALLOW_IP=::/0`` / or check your docker network if it doesn't connect!) 
    - (Mainnet) or via Docker-Hub ``docker run -it -p 8339:8339 doichain/node-only`` (RPC_PASSWORD is generated and inside the docker container ~/.doichain/doichain.conf)
    - (Mainnet) test with: ```curl --user admin:<my-rpc-password> --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "getblockchaininfo", "params": [] }' -H 'content-type: text/plain;' http://localhost:8339```

    - (Testnet) or via Docker-Hub ``docker run -it -e TESTNET=true -p 18339:18339 -e RPC_PASSWORD=<my-rpc-password> doichain/node-only``
    - (Testnet) or via Docker-Hub ``docker run -it -e TESTNET=true -p 18339:18339 doichain/node-only`` (RPC_PASSWORD is generated and inside the docker container ~/.doichain/doichain.conf)
    - (Testnet) test with: ```curl --user admin:<my-rpc-password> --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "getblockchaininfo", "params": [] }' -H 'content-type: text/plain;' http://localhost:18339```
    - *Remark: in case you want to test the full DOI workflow on testnet (or mainnet) over your local development environment you might have to forward the a remote port for Bob's callback to your local machine via e.g. ``ssh -R 4000:localhost:3000 your@your-remote-ssh-server`` in 
      such a case you also have to change the host entry inside settings.json (see below)*
   
2.  Funding
    - Buy Doicoin from https://bisq.network 
    - (mainnet) Transfer it to your new Doichain Node Address you create with ```curl --user admin:nico --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "getnewaddress", "params": [] }' -H 'content-type: text/plain;' http://localhost:8339```
    - (testnet) Transfer it to your new Doichain Node Address you create with ```curl --user admin:nico --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "getnewaddress", "params": [] }' -H 'content-type: text/plain;' http://localhost:18339```

3. Installation
    - ```meteor add doichain:doichain-meteor-api```
    - ```meteor npm install simpl-schema```
    - configure settings.json (e.g. change rpc password) as described under https://github.com/Doichain/dapp#settings or us example
```
    {
    "app": {
    "debug": "true",
    "host": "localhost-or-your-remote-ip-in-case-you-created-an-ssh-tunnel-on-testnet-or-mainnet",
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
          "password": "<my-rpc-password>"
        }
      }
    }
```

    - run meteor ``meteor run --settings settings.json``


4. Test REST-API
    - authenticate via REST e.g. via ```curl -H "Content-Type: application/json" -X POST -d '{"username":"admin","password":"password"}' http://localhost:3000/api/v1/login ```
    - request a basic doi via ```curl -X POST -H 'X-User-Id: <userId from above>' -H 'X-Auth-Token: <x-auth-token-from-above>' -i 'http://localhost:3000/api/v1/opt-in?recipient_mail=<your-customer-email@example.com>&sender_mail=info@doichain.org'```
