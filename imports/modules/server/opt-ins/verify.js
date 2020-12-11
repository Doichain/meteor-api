import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
const bitcoin = require('bitcoinjs-lib');
import {verifySignature} from "doichain";
import {logVerify} from "../../../startup/server/log-configuration";
import { VERIFY_CLIENT } from '../../../startup/server/doichain-configuration.js';
import { nameShow } from '../../../../server/api/doichain.js';
import getPublicKeyAndAddress from "../doichain/get_publickey_and_address_by_domain";

const VerifyOptInSchema = new SimpleSchema({
  recipient_mail: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  sender_mail: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  name_id: {
    type: String
  },
  recipient_public_key: {  //deprecated (TODO)
    type: String,
    optional:true
  },
  public_key:{
    type: String,
    optional: true
  }
});

const verifyOptIn = (data) => {
  try {
    console.log('verifying doi',data)
    const ourData = data;
    VerifyOptInSchema.validate(ourData);
    const entry = nameShow(VERIFY_CLIENT, ourData.name_id);
    console.log('verifying doi',entry)
    if(entry === undefined) return {nameIdFound: "failed"};
    const entryData = JSON.parse(entry.value);

    console.info("ourData",ourData)
    const publicKey = ourData.public_key?ourData.public_key:ourData.recipient_public_key  //TODO remove this in future versions update documentation
    var publicKeyBuffer = Buffer.from(publicKey, 'hex')
    var keyPair = bitcoin.ECPair.fromPublicKey(publicKeyBuffer)
    logVerify("publicKey",keyPair.publicKey.toString('hex'))
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: GLOBAL.DEFAULT_NETWORK  });

    console.log('address from publicKey',address)
    console.info('ourData.recipient_mail+ourData.sender_mail',(ourData.recipient_mail+ourData.sender_mail))
    console.log('verifySignature',verifySignature(
          (ourData.recipient_mail+ourData.sender_mail),
          address,
          entryData.signature
     ))

    const firstCheck = verifySignature(
      // data: entryData.signature, //we had this before! 
          ourData.recipient_mail+ourData.sender_mail,
          address,
          entryData.signature
     ) 


    if(!firstCheck) return {soiSignatureStatus: "failed"};
    else console.info('first signature check successful')
    const parts = ourData.recipient_mail.split("@"); //TODO put this into getPublicKeyAndAddress
    const domain = parts[parts.length-1];
    const publicKeyAndAddress = getPublicKeyAndAddress({domain: domain});

    if(!entryData.signature||!entryData.doiSignature)return {doiSignatureStatus: "missing"};
   /* const secondCheck = verifySignature({
     // data: entryData.signature, //we had this before! 
      data: ourData.name_id,
      signature: entryData.doiSignature,
      publicKey: publicKeyAndAddress.publicKey
    }) */
    console.log("second verification",{
       data: entryData.signature,
       address:  publicKeyAndAddress.destAddress,
       signature: entryData.doiSignature
     })

      const secondCheck = verifySignature(
     // data: entryData.signature, //we had this before! 
        entryData.signature,
        publicKeyAndAddress.destAddress,
        entryData.doiSignature
    ) 

    if(!secondCheck) return {doiSignatureStatus: "failed"};
    return true;
  } catch (exception) {
    throw new Meteor.Error('opt-ins.verify.exception', exception);
  }
};

export default verifyOptIn
