import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {isRegtest, isTestnet} from "../../../startup/server/dapp-configuration";
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
    console.log("getSignature from",ourData)
    if(isRegtest() || isTestnet())
      bitcore.Networks.defaultNetwork =  bitcore.Networks.get('doichain-testnet')
    else
      bitcore.Networks.defaultNetwork =  bitcore.Networks.get('doichain')
    const signature = Message(ourData.message).sign(new bitcore.PrivateKey.fromString(ourData.privateKey));
    return signature;
  } catch(exception) {
    throw new Meteor.Error('doichain.getSignature.exception', exception);
  }
};

export default getSignature;
