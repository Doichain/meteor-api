import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/alanning:roles';
import {Meta} from '../../api/meta/meta.js'
import fs from 'fs'
import os from 'os'
import propertiesReader from 'properties-reader'
import { isRegtest } from './dapp-configuration.js';

Meteor.startup(() => {
  
  const rd = process.env.PWD;
  const version = fs.readFileSync(`${rd}/private/version.json`).toString();

  if(Meta.find({key:"version"}).count() > 0){
    Meta.remove({key:"version"});
  }

  console.log("version from file: ",version)
  Meta.insert({key:"version", value: version});

  if(Meteor.users.find().count() === 0) {

    let rpcpassword = 'password'
    const homedir = os.homedir()

    if (!isRegtest()) {
        console.info('homedir', homedir)
        const doichainConfPath = homedir + '/.doichain/doichain.conf'
        try {
            const properties = propertiesReader(doichainConfPath)
            if (properties.get("testnet")) {
              rpcpassword = properties.get("test.rpcpassword")
            } else {
              rpcpassword = properties.get("main.rpcpassword")
            }
            console.info("password from doichain.conf", rpcpassword)
        } catch (e) {
            console.error('problem reading doichain.conf in ', doichainConfPath)
        }
    }

    const id = Accounts.createUser({
        username: 'admin',
        email: 'admin@doichain.org',
        password: rpcpassword
    });

    Roles.addUsersToRoles(id, 'admin');
  }
});
