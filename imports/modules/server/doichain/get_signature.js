import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
const Message = require('bitcore-message');
const bitcore = require('bitcore');

const GetSignatureSchema = new SimpleSchema({
  message: {
    type: String
  },
  privateKey: {
    type: String
  }
});

const getSignature = (data) => {
  try {
    const ourData = data;
    GetSignatureSchema.validate(ourData);
    const signature = Message(ourData.message).sign(new bitcore.PrivateKey.fromString(ourData.privateKey));
    return signature;
  } catch(exception) {
    throw new Meteor.Error('doichain.getSignature.exception', exception);
  }
};

export default getSignature;
