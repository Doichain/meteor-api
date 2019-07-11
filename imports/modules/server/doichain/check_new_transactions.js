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
import {BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI} from "../../../../server/api/rest/imports/status";

const TX_NAME_START = "e/";
const LAST_CHECKED_BLOCK_KEY = "lastCheckedBlock";

const checkNewTransaction = (txid, job) => {
  try {

      //TODO Security-Bug: Check if this transactions owner belongs to Bob's privateKey otherwise this interface could get used as backdoor for spam attacks
      //logConfirm('checkNewTransaction tx:',{txid});
      if(!txid){
          logConfirm("checkNewTransaction triggered when starting node - checking all confirmed blocks since last check for doichain address",CONFIRM_ADDRESS);
          try {
              var lastCheckedBlock = Meta.findOne({key: LAST_CHECKED_BLOCK_KEY});
              if(lastCheckedBlock !== undefined) lastCheckedBlock = lastCheckedBlock.value;
              logConfirm("lastCheckedBlock",lastCheckedBlock);
              const ret = listSinceBlock(CONFIRM_CLIENT, lastCheckedBlock);
              if(ret === undefined || ret.transactions === undefined) return;

              const txs = ret.transactions;
              lastCheckedBlock = ret.lastblock;
              if(!ret || !txs || !txs.length===0){
                  logConfirm("transactions do not contain nameOp transaction details or transaction not found.", lastCheckedBlock);
                  addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
                  return;
              }

              logConfirm("listSinceBlock",ret);
              const addressTxs = txs.filter(tx =>
                  tx.name !== undefined
                  && tx.name.startsWith("doi: "+TX_NAME_START)
              );
              addressTxs.forEach(tx => {
                  logConfirm("checking if tx was already processed...");

                  const isFoundMyAddress = Meta.findOne({key:"addresses_by_account", value:tx.address})
                  console.log("isFoundMyAddress:",isFoundMyAddress!==undefined)

                  const processedTxInOptIns = OptIns.findOne({txid: tx.txid})
                  console.log("processedTxInOptIns:",processedTxInOptIns!==undefined)

                  if( isFoundMyAddress && !processedTxInOptIns ){

                      const txName = tx.name.substring(("doi: "+TX_NAME_START).length);
                      logConfirm("excuting name_show in order to get value of nameId:", txName);
                      const ety = nameShow(CONFIRM_CLIENT, txName);
                      logConfirm("nameShow: value",ety);
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
          logConfirm("txid: "+txid+" was triggered by walletnotify for address:",CONFIRM_ADDRESS);

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
                  const isFoundMyAddress = Meta.findOne({key:"addresses_by_account", value:addr})
                  console.log("tx was sent to one of my addresses:"+addr,isFoundMyAddress!==undefined)
                  if(isFoundMyAddress!==undefined)
                    addNameTx(tx.scriptPubKey.nameOp.name, tx.scriptPubKey.nameOp.value,tx.scriptPubKey.addresses[0],txid);
              })
          });

          const coinTxs = txs.filter(tx =>
              tx.scriptPubKey !== undefined && tx.scriptPubKey.nameOp === undefined
          );
          coinTxs.forEach(tx => {
              addCoinTx(tx.value,tx.scriptPubKey.addresses[0],txid);
          });

      }
  } catch(exception) {
    throw new Meteor.Error('doichain.checkNewTransactions.exception', exception);
  }
  return true;
};


function addNameTx(name, value, address, txid) {
    const txName = name.substring(TX_NAME_START.length);

    addDoichainEntry({
        name: txName,
        value: value,
        address: address,
        txId: txid
    });
}

function addCoinTx(value,address, txid) {
    logConfirm("unconfirmed Doicoin "+value+" was arriving for address "+address+" by txid:",txid);
    const addressValid = validateAddress(CONFIRM_CLIENT,address)
    if(!addressValid.ismine) return
    const valueCount = Meta.find({key:BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI}).count();
    if(valueCount> 0){
        const oldValue =  parseFloat(Meta.findOne({key:BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI}).value);
        value += oldValue;
    }
    storeMeta(BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI,value);
}

export default checkNewTransaction;

