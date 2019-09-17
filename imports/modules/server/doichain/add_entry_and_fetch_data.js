import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { CONFIRM_CLIENT, CONFIRM_ADDRESS } from '../../../startup/server/doichain-configuration.js';
import { getWif } from '../../../../server/api/doichain.js';
import { DoichainEntries } from '../../../api/doichain/entries.js';
import addFetchDoiMailDataJob from '../jobs/add_fetch-doi-mail-data.js';
import getPrivateKeyFromWif from './get_private-key_from_wif.js';
import decryptMessage from './decrypt_message.js';
import {logConfirm, logSend} from "../../../startup/server/log-configuration";
import {Meta} from "../../../api/meta/meta";
import getPublicKeyOfOriginTransaction from "./getPublicKeyOfOriginTransaction";

const AddDoichainEntrySchema = new SimpleSchema({
  name: {
    type: String
  },
  value: {
    type: String
  },
  address: {
    type: String
  },
  txId: {
    type: String
  }
});

/**
 * Inserts
 *
 * @param entry
 * @returns {*}
 */
const addDoichainEntry = (entry) => {
  try {

    const ourEntry = entry;
    logConfirm('adding DoichainEntry on Bob...',ourEntry.name);
    AddDoichainEntrySchema.validate(ourEntry);

    const ety = DoichainEntries.findOne({name: ourEntry.name});
    if(ety !== undefined){
        logConfirm('returning locally saved entry with _id:'+ety._id);
        return ety._id;
    }

    const value = JSON.parse(ourEntry.value);
    //logSend("value:",value);
    if(value.doiSignature!==undefined){
        logConfirm('seems like we are rescanning blockchain, this doi permission was has already a doi signuate (exiting):',value.doiSignature);
        return
    }
    if(value.from === undefined) throw "Wrong blockchain entry"; //TODO if from is missing but value is there, it is probably already handled correctly anyways this is not so cool as it seems.

    //TODO confirm address here? Is it really nessary to configure? since inside the
    // transaction the address is already given. no need to configure it at all!
    // take out this address and get private key!

    let wif
    const addressesByAccount  = Meta.findOne({key: "addresses_by_account"})
    if(addressesByAccount !== undefined){
              addressesByAccount.value.forEach(function (addr) {
                  wif = getWif(CONFIRM_CLIENT, addr);
              })
    }

    const privateKey = getPrivateKeyFromWif({wif: wif});
    logConfirm('got private key (will not show it here)');

    //get public key of the originating transaction
    const publicKey = getPublicKeyOfOriginTransaction(ourEntry.txId);
    const domain = decryptMessage({privateKey: privateKey, publicKey: publicKey, message: value.from});
      logConfirm('decrypted message from domain: ',domain);

    const namePos = ourEntry.name.indexOf('-'); //if this is not a co-registration fetch mail.
      logConfirm('namePos:',namePos);
    const masterDoi = (namePos!=-1)?ourEntry.name.substring(0,namePos):undefined;
      logConfirm('masterDoi:',masterDoi);
    const index = masterDoi?ourEntry.name.substring(namePos+1):undefined;
      logConfirm('index:',index);

    const id = DoichainEntries.insert({
        name: ourEntry.name,
        value: ourEntry.value,
        address: ourEntry.address,
        masterDoi: masterDoi,
        index: index,
        txId: ourEntry.txId,
        expiresIn: ourEntry.expiresIn,
        expired: ourEntry.expired
    });

    logConfirm('DoichainEntry added on Bob:', {id:id,name:ourEntry.name,masterDoi:masterDoi,index:index});

    if(!masterDoi && !ourEntry.expired){
        addFetchDoiMailDataJob({
            name: ourEntry.name,
            domain: domain,
            txId: ourEntry.txId
        });
        logConfirm('New entry added: \n'+
            'NameId='+ourEntry.name+"\n"+
            'Address='+ourEntry.address+"\n"+
            'TxId='+ourEntry.txId+"\n"+
            'Value='+ourEntry.value);

    }else{
        logSend('This transaction belongs to co-registration', masterDoi);
    }

    return id;
  } catch (exception) {
    throw new Meteor.Error('doichain.addEntryAndFetchData.exception', exception);
  }
};

export default addDoichainEntry;
