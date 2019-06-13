import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import getKeyPairM from '../../modules/server/doichain/get_key-pair.js';
import getBalanceM from '../../modules/server/doichain/get_balance.js';
import sendToAddressM from '../../modules/server/doichain/send_to_address';
import {_i18n as i18n} from "meteor/universe:i18n";

const sendToAddress = new ValidatedMethod({
  name: 'doichain.sendToAddress',
  validate: null,
  run({address,amount}) {
    console.log(`sendToAddress address:${address} amount:${amount} `)
    if(!this.userId) {
      const error = "api.doichain.sendToAddress.accessDenied";
      throw new Meteor.Error(error, i18n.__(error));
    }
    return sendToAddressM(address,amount);
  },
});

const getKeyPair = new ValidatedMethod({
  name: 'doichain.getKeyPair',
  validate: null,
  run() {
    return getKeyPairM();
  },
});

/**TODO this can be removed - if not longer important since we import balance durinng blocknotify and status call from outside*/
const getBalance = new ValidatedMethod({
  name: 'doichain.getBalance',
  validate: null,
  run() {
    const logVal = getBalanceM();
    return logVal;
  },
});


// Get list of all method names on doichain
const OPTIONS_METHODS = _.pluck([
    sendToAddress,
    getKeyPair,
    getBalance], 'name');

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
