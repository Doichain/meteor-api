# Doichain Meteor API

## This meteor project adds the Doichain (see https://doichain.org) REST API to your web project.

# Installation
1. Prerequisites
    - running Doichain Node in Mainnet or Testnet (manual installation see: https://github.com/Doichain/dapp) or via docker
        - (Mainnet) or via Docker-Hub ``docker run -it -p 8339:8339 doichain/node-only`` (RPC_PASSWORD is generated and inside the docker container ~/.doichain/doichain.conf)
        - (Testnet) or via Docker-Hub ``docker run -it -e TESTNET=true -p 18339:18339 -e RPC_PASSWORD=<my-rpc-password> doichain/node-only``
        - *Remark: you might want to forward a public server remote port for Bob's callback 
          to your local machine via e.g. ``ssh -R 4000:localhost:3000 your@your-remote-ssh-server``* (since your local machine cannot be reached from the internt)   
2. Funding (as described https://github.com/Doichain/dapp#Funding)
3. Installation
    - ```meteor add doichain:doichain-meteor-api```
    - ```meteor npm install simpl-schema```
    - configure settings.json (change rpc password if you set it before) as described under https://github.com/Doichain/dapp/blob/master/doc/en/settings.md 
    - run meteor ``meteor run --settings settings.json``
4. Test REST-API (as described: https://github.com/Doichain/dapp/blob/master/doc/en/rest-api.md#authentication)