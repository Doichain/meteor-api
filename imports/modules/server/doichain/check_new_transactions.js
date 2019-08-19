import { Meteor } from 'meteor/meteor';
import { listSinceBlock, nameShow, getRawTransaction} from '../../../../server/api/doichain.js';
import { CONFIRM_CLIENT, CONFIRM_ADDRESS } from '../../../startup/server/doichain-configuration.js';
import addDoichainEntry from './add_entry_and_fetch_data.js'
import { Meta } from '../../../api/meta/meta.js';
import { OptIns} from "../../../api/opt-ins/opt-ins";
import addOrUpdateMeta from '../meta/addOrUpdate.js';
import {logConfirm} from "../../../startup/server/log-configuration";
import storeMeta from "./store_meta";
import {validateAddress} from "../../../../server/api/doichain";
const TX_NAME_START = "e/";
import {LAST_CHECKED_BLOCK_KEY, BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI} from "../../../startup/both/constants"

const checkNewTransaction = (txid, job) => {
  try {

      //TODO Security-Bug: Check if this transactions owner belongs to Bob's privateKey otherwise this interface could get used as backdoor for spam attacks
      //logConfirm('checkNewTransaction tx:',{txid});
      if(!txid){
          logConfirm("checkNewTransaction in memcache");
          try {
              var lastCheckedBlock = Meta.findOne({key: LAST_CHECKED_BLOCK_KEY});
              if(lastCheckedBlock !== undefined) lastCheckedBlock = lastCheckedBlock.value;
              logConfirm("lastCheckedBlock",lastCheckedBlock);
              const ret = listSinceBlock(CONFIRM_CLIENT, lastCheckedBlock);
              if(ret === undefined || ret.transactions === undefined) return;

              const txs = ret.transactions;
              lastCheckedBlock = ret.lastblock;
              if(!ret || !txs || txs.length===0){
                //  logConfirm("transactions do not contain nameOp transaction details" +
                  //    " or transaction not found.", ret);
                  addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
                  //addCoinTx(tx.value,tx.scriptPubKey.addresses[0],txid);
                  return;
              }

             // logConfirm("listSinceBlock",txs.length);
              const addressTxs = txs.filter(tx =>
                  tx.name !== undefined
                  && tx.name.startsWith("doi: "+TX_NAME_START)
              );

              addressTxs.forEach(tx => {
                  logConfirm("checking if tx was already processed...",tx.address);

                  //is this necessary because of security concerns and also because our own transactions hit us again - (we don't need them here)
                 //FIX

                  const isFoundMyAddress = Meta.findOne({key:"addresses_by_account", value: {"$in" : [tx.address]}})
                      //Meta.findOne({key:"addresses_by_account", value:tx.address})
                  console.log("isFoundMyAddress:"+tx.address+" "+isFoundMyAddress,isFoundMyAddress===undefined?'not found':'found')

                  const processedTxInOptIns = OptIns.findOne({txid: tx.txid})
                  console.log("processedTxInOptIns:",processedTxInOptIns!==undefined)

                  if(!processedTxInOptIns && isFoundMyAddress){

                      const txName = tx.name.substring(("doi: "+TX_NAME_START).length);
                      logConfirm("excuting name_show in order to get value of nameId:", txName);
                      const ety = nameShow(CONFIRM_CLIENT, txName);
                     // logConfirm("nameShow: value",ety);
                      if(ety)
                          addNameTx(txName, ety.value,tx.address,tx.txid);
                      else
                          logConfirm("couldn't find name on blockchain - obviously not yet confirmed:", ety);

                  }else{
                      logConfirm("not using this tx because it was already processed in mempool transaction");
                  }
              });
              addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
              logConfirm("transactions updated - lastCheckedBlock:",lastCheckedBlock);
             // job.done();
          } catch(exception) {
              throw new Meteor.Error('namecoin.checkNewTransactions.exception', exception);
          }

      }else{
          logConfirm("txid: "+txid+" new block arrived");

          const ret = getRawTransaction(CONFIRM_CLIENT, txid);

          const txs = ret.vout;

          if(!ret || !txs || !txs.length===0){
              logConfirm("txid "+txid+' does not contain transaction details or transaction not found.');
              return;
          }

          const addressTxs = txs.filter(tx =>
              tx.scriptPubKey !== undefined
              && tx.scriptPubKey.nameOp !== undefined
              && tx.scriptPubKey.nameOp.op === "name_doi"
              && tx.scriptPubKey.nameOp.name !== undefined
              && tx.scriptPubKey.nameOp.name.startsWith(TX_NAME_START)
          );
          addressTxs.forEach(tx => {
              tx.scriptPubKey.addresses.forEach(addr =>{
                  const isFoundMyAddress = Meta.findOne({key:"addresses_by_account", value:addr})  //TODO use validataAddress (!)
                  console.log("tx was sent to one of my addresses:"+addr,isFoundMyAddress!==undefined)
                  if(isFoundMyAddress!==undefined)
                    addNameTx(tx.scriptPubKey.nameOp.name, tx.scriptPubKey.nameOp.value,tx.scriptPubKey.addresses[0],txid);
              })
          });

          const coinTxs = txs.filter(tx =>
              tx.scriptPubKey !== undefined && tx.scriptPubKey.nameOp === undefined
          );
          coinTxs.forEach(tx => {
              console.log("---->coinTX",tx)
              addCoinTx(tx.value,tx.scriptPubKey.addresses[0],txid);
          });

      }
  } catch(exception) {
    throw new Meteor.Error('doichain.checkNewTransactions.exception', exception);
  }
  return true;
};


function addNameTx(name, value, address, txid) {

    //cut away 'e/' in case it was delivered in a mempool transaction otherwise its not included.
    const txName = name.startsWith(TX_NAME_START)?name.substring(TX_NAME_START.length):name;

    addDoichainEntry({
        name: txName,
        value: value,
        address: address,
        txId: txid
    });
}

function addCoinTx(value,address, txid) {

    const addressValid = validateAddress(CONFIRM_CLIENT,address)  //TODO this should be not necessary at this point anymore
    if(!addressValid.ismine) return

    if(txid) //if a new block was arriving we do not use a txid here
        logConfirm("unconfirmed Doicoin "+value+" was arriving for address "+address+" by txid:",txid);
    else
        logConfirm("confirmed Doicoin "+value+" was arriving for address "+address);


    const valueCount = Meta.findOne({key:BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI})
    if(valueCount){
        const oldValue =  parseFloat(valueCount.value);
        value += oldValue;
    }
    storeMeta(BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI,value);
}

export default checkNewTransaction;

