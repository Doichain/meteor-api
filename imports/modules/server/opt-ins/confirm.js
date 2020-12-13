import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import bitcoin from 'bitcoinjs-lib';
import { getSignature } from "doichain";
import { getWif } from "../../../../server/api/doichain";
import { CONFIRM_CLIENT, CONFIRM_ADDRESS } from '../../../startup/server/doichain-configuration.js';
import { OptIns } from '../../../api/opt-ins/opt-ins.js';
import { DoichainEntries } from '../../../api/doichain/entries.js';
import decodeDoiHash from '../emails/decode_doi-hash.js';
import { signMessage } from '../../../../server/api/doichain.js';
import addUpdateBlockchainJob from '../jobs/add_update_blockchain.js';
import {logConfirm} from "../../../startup/server/log-configuration";

const ConfirmOptInSchema = new SimpleSchema({
    host: {
        type: String
    },
    token: {
        type: String
    }
});

const confirmOptIn = (request) => {
  try {
    const ourRequest = request;
    ConfirmOptInSchema.validate(ourRequest);
    const optIn = OptIns.findOne({token: ourRequest.token});
    if(optIn === undefined) throw "Invalid token - exiting confirmation";
    if(optIn.confirmedAt !== undefined){ // Opt-In was already confirmed on email click
      logConfirm("OptIn already confirmed: ",optIn);
      return optIn.redirect;
    }
    const confirmedAt = new Date();

    console.log('found opt in to confirm',optIn)
    //TODO after confirmation we deleted the confonfirmationtoken, now we keep it. can this be a security problem?
    OptIns.update({_id : optIn._id},{$set:{confirmedAt: confirmedAt, confirmedBy: ourRequest.host}});

    const entries = DoichainEntries.find({$or: [{name: optIn.nameId}, {masterDoi: optIn.nameId}]});
    if(entries === undefined) throw "Doichain entry/entries not found";

    entries.forEach(entry => {
        logConfirm('confirming DoiChainEntry / respective masterDoi:',entry);

        const value = JSON.parse(entry.value);
        logConfirm('getSignature', value);
        logConfirm('creating DOI signature with soi signature '+entry.address,value.signature);
        const wif = getWif(CONFIRM_CLIENT, entry.address);
        const keyPair = bitcoin.ECPair.fromWIF(wif, GLOBAL.DEFAULT_NETWORK);
        const doiSignature = getSignature(value.signature, keyPair)
       // const doiSignature = signMessage(CONFIRM_CLIENT, entry.address, value.signature); //signature over signature
        logConfirm('got doiSignature:',doiSignature);
        const fromHostUrl = value.from;

        delete value.from;
        value.doiTimestamp = confirmedAt.toISOString(); // not necessary because its the blocktime is fine (I guess)
        value.doiSignature = doiSignature;
        const jsonValue = JSON.stringify(value);
        logConfirm('updating Doichain nameId:'+optIn.nameId+' with value:',jsonValue);

        addUpdateBlockchainJob({
            nameId: entry.name,
            value: jsonValue,
            fromHostUrl: fromHostUrl,
            host: ourRequest.host
        });
    });
    logConfirm('redirecting user to:',optIn.redirect);
    return optIn.redirect;
  } catch (exception) {
    throw new Meteor.Error('opt-ins.confirm.exception', exception);
  }
};

export default confirmOptIn
