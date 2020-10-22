import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { SEND_CLIENT } from '../../../startup/server/doichain-configuration.js'
//import encryptMessage from "./encrypt_message";
import {getUrl} from "../../../startup/server/dapp-configuration";
import {logBlockchain, logSend} from "../../../startup/server/log-configuration";
import {DOI_FEE,nameDoi} from "../../../../server/api/doichain";
import {OptIns} from "../../../api/opt-ins/opt-ins";
import getPublicKeyAndAddress from "./get_publickey_and_address_by_domain";
import {encryptStandardECIES} from "doichain";


const InsertSchema = new SimpleSchema({
  nameId: {
    type: String
  },
  signature: {
    type: String
  },
  dataHash: {
    type: String
  },
  domain: {
    type: String
  },
  soiDate: {
    type: Date
  }
});

const insert = (data) => {
  const ourData = data;
  try {
    InsertSchema.validate(ourData);
    logSend("domain:",ourData.domain);

    const publicKeyAndAddress = getPublicKeyAndAddress({domain:ourData.domain});
    const from = encryptStandardECIES(publicKeyAndAddress.publicKey,getUrl()).toString('hex')

    const nameValue = JSON.stringify({
        signature: ourData.signature,
        dataHash: ourData.dataHash,
        from: from
    });

    //TODO (!) this must be replaced in future by "atomic name trading example" https://wiki.namecoin.info/?title=Atomic_Name-Trading
    logSend('sending a fee to bob so he can pay the doi storage (destAddress):', publicKeyAndAddress.destAddress);
    //const feeDoiTx = feeDoi(SEND_CLIENT, publicKeyAndAddress.destAddress);
    //logSend('fee send txid to destaddress', feeDoiTx, publicKeyAndAddress.destAddress);

    /**
     *  
     * options (json object, optional) Options for this RPC call
    {
      "nameEncoding": "str",     (string) Encoding ("ascii", "utf8" or "hex") of the name argument
      "valueEncoding": "str",    (string) Encoding ("ascii", "utf8" or "hex") of the value argument
      "destAddress": "str",      (string) The address to send the name output to
      "sendCoins": {             (json object) Addresses to which coins should be sent additionally
        ...
      },
    }
     */
    
     let options = {
      "destAddress":  publicKeyAndAddress.destAddress
    }

    let sendCoins = {}
    sendCoins[publicKeyAndAddress.destAddress] = DOI_FEE 
    options.sendCoins = sendCoins;

    logSend('adding data to blockchain via name_doi (nameId,value,options):', ourData.nameId,nameValue,options);
    const nameDoiTx = nameDoi(SEND_CLIENT, ourData.nameId, nameValue, options);
    logSend('name_doi added blockchain. txid:', nameDoiTx);

    OptIns.update({nameId: ourData.nameId}, {$set: {txId:nameDoiTx}, $push: {status:'transaction sent'}});
    logSend('updating OptIn locally with:', {nameId: ourData.nameId, txId: nameDoiTx});

  } catch(exception) {
    logBlockchain(exception.message)
     // OptIns.update({nameId: ourData.nameId}, {$push: {error:JSON.stringify(exception.message)}});
    throw new Meteor.Error('doichain.insert.exception', exception); //TODO update opt-in in local db to inform user about the error! e.g. Insufficient funds etc.
  }
};

export default insert;
