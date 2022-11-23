import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
const bitcoin = require('bitcoinjs-lib')
import {decryptStandardECIES,getPrivateKeyFromWif,network} from "doichain";

import { CONFIRM_CLIENT, CONFIRM_ADDRESS } from '../../../startup/server/doichain-configuration.js';
import { getWif } from '../../../../server/api/doichain.js';
import { DoichainEntries } from '../../../api/doichain/entries.js';
import addFetchDoiMailDataJob from '../jobs/add_fetch-doi-mail-data.js';
import {logConfirm, logSend} from "../../../startup/server/log-configuration";
import {getRawTransaction} from "../../../../server/api/doichain";


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
 * Inserts a DoichainEntry to local database when arrving on validator (Bob)
 *
 * @param entry
 * @returns {*}
 */
const addDoichainEntry = (entry) => {

  try {

    const ourEntry = entry;
    logConfirm('adding DoichainEntry on validator (Bob) ...',ourEntry);
    AddDoichainEntrySchema.validate(ourEntry);

      const ety = DoichainEntries.findOne({name: ourEntry.name});
      if (ety !== undefined) {
          logConfirm('returning locally saved entry with _id:' + ety._id);
          return ety._id;
      }

      let value  //contains to retrieve the template from
      try {
          value = JSON.parse(ourEntry.value);
          if (value.doiSignature !== undefined) {
              logConfirm('seems like we are rescanning blockchain, this doi permission was has already a doi signuate (exiting):', value.doiSignature);
              return
          }

          if (value.from === undefined) throw "From was not given, or DOI signature already written";
      } catch (ex) {
          throw "Error value parsing nameValue " + ex.toString
      }


      let privateKeyWif = undefined
      let validatorAddress = undefined;
      logConfirm("getting raw transaction for tx", ourEntry.txId)
      const vouts = getRawTransaction(CONFIRM_CLIENT, ourEntry.txId).vout
      vouts.forEach((output) => {
          if (output.scriptPubKey.nameOp) {
              logConfirm('validator parses output of incoming soi permission to find read address', output.scriptPubKey.nameOp.name)
              logConfirm('output.scriptPubKey.nameOp', output.scriptPubKey.nameOp)
              logConfirm('output.scriptPubKey.addresses', output.scriptPubKey.addresses)

              const nameId = entry.name.startsWith("e/") ? entry.name : "e/" + entry.name
              console.log('nameId is',nameId)
              if (output.scriptPubKey && output.scriptPubKey.nameOp &&
                  output.scriptPubKey.nameOp.name === nameId) {
                  validatorAddress = output.scriptPubKey.addresses[0]
                  logConfirm("getting privateKey of validatorAddress",validatorAddress)
                  privateKeyWif = getWif(CONFIRM_CLIENT, validatorAddress);
                  //privateKeyWif=getPrivateKeyFromWif({wif:getWif(CONFIRM_CLIENT,validatorAddress)});
                  logConfirm('got private key of validator address', validatorAddress)
              }
          } else {
              logConfirm("no name op transaction")
          }
      })
      const keypair = bitcoin.ECPair.fromWIF(privateKeyWif, global.DEFAULT_NETWORK)
      const privateKey = keypair.privateKey.toString('hex')
      const doichainhostUrl = decryptStandardECIES(privateKey, value.from)
      logConfirm('decrypted message from doichainhostUrl: ', doichainhostUrl);

      const namePos = ourEntry.name.indexOf('-'); //if this is not a co-registration fetch mail.
      logConfirm('namePos:', namePos);

      const masterDoi = (namePos != -1) ? ourEntry.name.substring(0, namePos) : undefined;
      logConfirm('masterDoi:', masterDoi);

      const index = masterDoi ? ourEntry.name.substring(namePos + 1) : undefined;
      logConfirm('index:', index);

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

    logConfirm('DoichainEntry added on validator (Bob):', {id:id,name:ourEntry.name,masterDoi:masterDoi,index:index});

    if(!masterDoi && !ourEntry.expired){
        addFetchDoiMailDataJob({
            name: ourEntry.name,
            domain: doichainhostUrl,
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
