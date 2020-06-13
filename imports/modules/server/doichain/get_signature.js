//import { Meteor } from 'meteor/meteor';
import {getSignature as getDoichainSignature} from 'doichain'
import SimpleSchema from 'simpl-schema';
const GetSignatureSchema = new SimpleSchema({
  message: {
    type: String
  },
  privateKey: {
    type: String
  }
});

import {isRegtest, isTestnet} from "../../../startup/server/dapp-configuration";
/*const Message = require('bitcore-message');
const bitcore = require('bitcore');



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

export default getSignature;*/

const getSignature = (data) => {
  const ourData = data;
  console.log('bla2')
  GetSignatureSchema.validate(ourData);
  console.log('bla2',ourData)
  return getDoichainSignature(ourData.message,ourData.privateKey)
}
export default getSignature
