import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _i18n as i18n } from 'meteor/universe:i18n';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Roles } from 'meteor/alanning:roles';
import { _ } from 'meteor/underscore';
import addOptIn from '../../modules/server/opt-ins/add_and_write_to_blockchain.js';
import {OptIns} from "./opt-ins";

const add = new ValidatedMethod({
  name: 'opt-ins.add',
  validate: null,
  run({ recipientMail, senderMail, data }) {
    if(!this.userId) {
      const error = "api.opt-ins.add.accessDenied";
      throw new Meteor.Error(error, i18n.__(error));
    }

    const optIn = {
      "recipient_mail": recipientMail,
      "sender_mail": senderMail,
      "ownerId": this.userId,
      data
    }

    addOptIn(optIn)
  },
});

const remove = new ValidatedMethod({
  name: 'opt-ins.remove',
  validate: null,
  run(_id) {
    if(!this.userId) {
      const error = "api.opt-ins.add.accessDenied";
      throw new Meteor.Error(error, i18n.__(error));
    }
    if(Roles.userIsInRole(this.userId, ['admin'])) {
      OptIns.remove({_id: _id})
      return `admin deleted: ${_id}`
    }
    else{
      OptIns.remove({_id: _id, ownerId:this.userid})
      return `user deleted: ${_id}`
    }
  },
});

// Get list of all method names on opt-ins
const OPTIONS_METHODS = _.pluck([
  add, remove
], 'name');
if (Meteor.isServer) {
  // Only allow 5 opt-in operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(OPTIONS_METHODS, name);
    },

    // Rate limit per connection ID
    connectionId() { return true; },
  }, 5, 1000);
}
