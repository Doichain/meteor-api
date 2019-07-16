import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/alanning:roles';
import {Meta} from '../../api/meta/meta.js'
import fs from 'fs';

Meteor.startup(() => {

  const rd = process.env.PWD;
  const version = fs.readFileSync(`${rd}/private/version.json`).toString();

  if(Meta.find({key:"version"}).count() > 0){
    Meta.remove({key:"version"});
  }

  console.log("version from file: ",version)
   Meta.insert({key:"version", value: version});
  
  if(Meteor.users.find().count() === 0) {
    const id = Accounts.createUser({
      username: 'admin',
      email: 'admin@doichain.org',
      password: 'password'
    });
    Roles.addUsersToRoles(id, 'admin');
  }
});
