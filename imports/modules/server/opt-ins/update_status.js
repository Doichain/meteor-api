import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {verifySignature} from "doichain"
import { OptIns } from '../../../api/opt-ins/opt-ins.js';
import { Recipients } from '../../../api/recipients/recipients.js';
import {logError, logSend} from "../../../startup/server/log-configuration";
import getPublicKeyAndAddress from "../doichain/get_publickey_and_address_by_domain";

const UpdateOptInStatusSchema = new SimpleSchema({
  nameId: {
    type: String
  },
  signature: {
    type: String
  },
  host: {
      type: String,
      optional: true
  }
});


const updateOptInStatus = (data) => {
  try {
    const ourData = data;
    logSend('validator dApp confirmed optIn:',JSON.stringify(data));
    UpdateOptInStatusSchema.validate(ourData);
    const optIn = OptIns.findOne({nameId: ourData.nameId});
    if(optIn === undefined) throw "Opt-In not found";
    logSend('confirm dApp confirms optIn:',ourData.nameId);

    /**
     * @deprecated
     * That is only possible with standard Doichain dApp doichain entries.
     * Since the whole procedure on testing publicKey + nameId + signature etc. is questionable this might be removed in future
     */
    if(optIn.recipient){
      const recipient = Recipients.findOne({_id: optIn.recipient});
      if(recipient === undefined) throw "Recipient not found";
      const parts = recipient.email.split("@");
      const domain = parts[parts.length-1];
      const publicKeyAndAddress = getPublicKeyAndAddress({domain:domain});

      //TODO getting information from Bob that a certain nameId (DOI) got confirmed. 
      //checking signature over the nameId

      if(!verifySignature(ourData.nameId,ourData.signature,publicKeyAndAddress.destAddress)){
      //if(!verifySignature({publicKey: publicKeyAndAddress.publicKey, data: ourData.nameId, signature: ourData.signature})) {
        const err = "Access denied Signature not verfied"
        //logError(err,{publicKey: publicKeyAndAddress.publicKey, data: ourData.nameId, signature: ourData.signature})
        throw err
      }
      logSend('signature valid for publicKey', publicKeyAndAddress.publicKey);
    }

    OptIns.update({_id : optIn._id},
        {
            $set:{ confirmedAt: new Date(), confirmedBy: ourData.host},
            $push: {status: 'DOI confirmed' }
          },
        {$push:{status:'confirmed'}});
  } catch (exception) {
    throw new Meteor.Error('dapps.send.updateOptInStatus.exception', exception);
  }
};

export default updateOptInStatus;
