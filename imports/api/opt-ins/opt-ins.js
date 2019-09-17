import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

class OptInsCollection extends Mongo.Collection {
  insert(optIn, callback) {
    const ourOptIn = optIn;
    ourOptIn.recipient_sender = ourOptIn.recipient+ourOptIn.sender;
    ourOptIn.createdAt = ourOptIn.createdAt || new Date();
    const result = super.insert(ourOptIn, callback);
    return result;
  }
  update(selector, modifier) {
    const result = super.update(selector, modifier);
    return result;
  }
  remove(selector) {
    const result = super.remove(selector);
    return result;
  }
}

export const OptIns = new OptInsCollection('opt-ins');

// Deny all client-side updates since we will be using methods to manage this collection
OptIns.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});


OptIns.schema = new SimpleSchema({
  _id: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  recipient: {
    type: String,
    optional: true,
    //denyUpdate: true, //TODO enable this when this package works again see meta
  },
  sender: {
    type: String,
    optional: true,
  //  denyUpdate: true,
  },
  data: {
    type: String,
    optional: true,
  //  denyUpdate: false,
  },
  index: {
    type: SimpleSchema.Integer,
    optional: true,
 //   denyUpdate: false,
  },
  nameId: {
    type: String,
    optional: true,
 //   denyUpdate: false,
  },
  txId: {
      type: String,
      optional: true,
 //     denyUpdate: false,
  },
  templateDataEncrypted: {
    type: String,
    optional: true
  },
  validatorPublicKey: {
    type: String,
    optional: true
  },
  masterDoi: {
      type: String,
      optional: true,
 //     denyUpdate: false,
  },
  createdAt: {
    type: Date,
 //   denyUpdate: true,
  },
  confirmedAt: {
    type: Date,
    optional: true,
//   denyUpdate: false,
  },
  confirmedBy: {
    type: String,
    regEx: SimpleSchema.RegEx.IP,
    optional: true,
 //   denyUpdate: false
  },
  confirmationToken: {
    type: String,
    optional: true,
 //   denyUpdate: false
  },
  ownerId:{
    type: String,
    optional: true,
    regEx: SimpleSchema.RegEx.Id
  },
  status: [String],
  receivedByValidator: {
    type: Boolean,
    optional: true
  },
  confirmedByValidator: {
    type: Boolean,
    optional: true
  },
  ourRequestedDoi: {
    type: Boolean,
    optional: true
  },
  ourRequestedAndConfirmedDois: {
    type: Boolean,
    optional: true
  },
  address:{
    type: String,
    optional: true
  },
  value:{
    type: String,
    optional: true
  },
  domain:{
    type: String,
    optional: true
  },
  confirmations: {
    type: SimpleSchema.Integer,
    optional: true,
    //   denyUpdate: false,
  },
  error: { type: Array,optional: true },
  'error.$': { type: String,optional: true }
});

OptIns.attachSchema(OptIns.schema);

// This represents the keys from Opt-In objects that should be published
// to the client. If we add secret properties to Opt-In objects, don't list
// them here to keep them private to the server.
OptIns.publicFields = {
  _id: 1,
  recipient: 1,
  sender: 1,
  data: 1,
  index: 1,
  nameId: 1,
  txId: 1,
  masterDoi: 1,
  createdAt: 1,
  confirmedAt: 1,
  confirmedBy: 1,
  ownerId: 1,
  status:1,
  receivedByValidator:1,
  confirmedByValidator:1,
  ourRequestedDoi:1,
  ourRequestedAndConfirmedDois:1,
  address:1,
  value:1,
  domain:1,
  confirmations:1,
  error: 1
};
