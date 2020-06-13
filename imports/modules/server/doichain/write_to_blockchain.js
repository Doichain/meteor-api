import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { OptIns } from '../../../api/opt-ins/opt-ins.js';
import { Senders } from '../../../api/senders/senders.js';
import { Recipients } from '../../../api/recipients/recipients.js';
import generateNameId from './generate_name-id.js';
const bitcoin = require('bitcoinjs-lib')
import {getSignature, network} from 'doichain'
import getDataHash from './get_data-hash.js';
import addInsertBlockchainJob from '../jobs/add_insert_blockchain.js';
import {logSend} from "../../../startup/server/log-configuration";

const WriteToBlockchainSchema = new SimpleSchema({
  id: {
    type: String
  }
});

const writeToBlockchain = (data) => {
  try {
    const ourData = data;
    WriteToBlockchainSchema.validate(ourData);

    const optIn = OptIns.findOne({_id: data.id});
    const recipient = Recipients.findOne({_id: optIn.recipient});
    const sender = Senders.findOne({_id: optIn.sender});
    //logSend("optIn data:",{index:ourData.index, optIn:optIn,recipient:recipient,sender: sender});

    const nameId = generateNameId({id: data.id,index:optIn.index,masterDoi:optIn.masterDoi });
    console.log('nameId generated:',nameId)
    const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(recipient.privateKey,'hex'),network.DEFAULT_NETWORK)
    const signature = getSignature(recipient.email+sender.email,keyPair);
    logSend("generated signature from email recipient and sender:",signature);

    let dataHash = "";

    if(optIn.data) {
      dataHash = getDataHash({data: optIn.data});
      logSend("generated datahash from given data:",dataHash);
    }

    const parts = recipient.email.split("@");
    const domain = parts[parts.length-1];
    logSend("email domain for publicKey request is:",domain);
    addInsertBlockchainJob({
      nameId: nameId,
      signature: signature,
      dataHash: dataHash,
      domain: domain,
      soiDate: optIn.createdAt
    })
  } catch (exception) {
    throw new Meteor.Error('doichain.writeToBlockchain.exception', exception);
  }
};

export default writeToBlockchain
