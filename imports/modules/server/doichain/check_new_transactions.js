import { Meteor } from 'meteor/meteor';
import { listSinceBlock, nameShow, getRawTransaction} from '../../../../server/api/doichain.js';
import { CONFIRM_CLIENT, CONFIRM_ADDRESS } from '../../../startup/server/doichain-configuration.js';
import addDoichainEntry from './add_entry_and_fetch_data.js'
import addOrUpdateMeta from '../meta/addOrUpdate.js';
import { Meta } from '../../../api/meta/meta.js';
import { OptIns} from "../../../api/opt-ins/opt-ins";
import {logConfirm} from "../../../startup/server/log-configuration";
import storeMeta from "./store_meta";
import {getRawMemPool, getWif, validateAddress} from "../../../../server/api/doichain";
const TX_NAME_START = "e/";
const TX_VERIFIED_EMAIL_NAME_START = "es/";

import {LAST_CHECKED_BLOCK_KEY, BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI} from "../../../startup/both/constants"
import {SEND_CLIENT} from "../../../startup/server/doichain-configuration";
import decryptMessage from "./decrypt_message";
import getPrivateKeyFromWif from "./get_private-key_from_wif";
import addSendVerifyEmailMailJob from "../jobs/add_send_verify_email_mail";

const checkNewTransaction = (txid, job) => {
  try {
       let isMemCacheTransaction = false
       const memPoolTransactions = getRawMemPool(CONFIRM_CLIENT);
       if(memPoolTransactions.indexOf(txid)!==-1) isMemCacheTransaction = true

      logConfirm("isMemCacheTransaction",isMemCacheTransaction);
      logConfirm("txid",txid)

       if(!isMemCacheTransaction){
          logConfirm("checkNewTransaction for incoming block");
          try {
              var lastCheckedBlock = Meta.findOne({key: LAST_CHECKED_BLOCK_KEY});
              if(lastCheckedBlock !== undefined) lastCheckedBlock = lastCheckedBlock.value;
              logConfirm("lastCheckedBlock",lastCheckedBlock);

              const ret = listSinceBlock(CONFIRM_CLIENT, lastCheckedBlock);
              if(ret === undefined || ret.transactions === undefined) return;

              const txs = ret.transactions;
              lastCheckedBlock = ret.lastblock;
              console.log('lastCheckedBlock',"-"+ret.lastblock)
              if(!ret || !txs || txs.length===0){
                  console.log('updating meta')
                  addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
              }

              const addressTxs = txs.filter(tx =>
                  tx.name !== undefined
                  && tx.name.startsWith("doi: "+TX_NAME_START)
              );
              console.log("addressTxs",addressTxs)

              addressTxs.forEach(tx => {
                  logConfirm("checking if tx was already processed...",tx.address);

                  const isFoundMyAddress = Meta.findOne({key:"addresses_by_account", value: {"$in" : [tx.address]}})
                  console.log("isFoundMyAddress: "+tx.address+" "+(isFoundMyAddress?'yes':'no'))

                  const processedTxInOptIns = OptIns.findOne({txid: tx.txid})
                  console.log("processedTxInOptIns:",processedTxInOptIns!==undefined)

                  if(!processedTxInOptIns && isFoundMyAddress){

                      const txName = tx.name.substring(("doi: "+TX_NAME_START).length);
                      logConfirm("excuting name_show in order to get value of nameId:", txName);
                      let ety;
                      try{
                          ety = nameShow(CONFIRM_CLIENT, txName);
                          logConfirm("nameShow: value",ety);
                          addNameTx(txName, ety.value,tx.address,tx.txid);
                      }catch(ex){
                          logConfirm("couldn't find name on blockchain - obviously not yet confirmed:", ety);
                      }
                  }else{
                      logConfirm("not using this tx because it was already processed in mempool transaction");
                  }
              });
              console.log("checking cointx")
              const coinTxs = txs.filter(tx =>
                  tx.name === undefined
              );
              coinTxs.forEach(tx => {
                  console.log(tx)
                  addCoinTx(tx.value,tx.address);
              });

              addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
              logConfirm("transactions updated - lastCheckedBlock:",lastCheckedBlock);
             // job.done();
          } catch(exception) {
              throw new Meteor.Error('namecoin.checkNewTransactions.exception', exception);
          }

      }else{
          logConfirm("txid: "+txid+" arrived in mem cache - checking for name and coin outputs");

          const ret = getRawTransaction(CONFIRM_CLIENT, txid);

          const txs = ret.vout;

          if(!ret || !txs || !txs.length===0){
              logConfirm("txid "+txid+' does not contain transaction details or transaction not found.');
              return;
          }

          //check for DOI transactions
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
                  if(isFoundMyAddress!==undefined){
                      console.log("adding nameId to validator:",tx.scriptPubKey.nameOp.name)
                      addNameTx(tx.scriptPubKey.nameOp.name, tx.scriptPubKey.nameOp.value,tx.scriptPubKey.addresses[0],txid)
                  }
              })
          });

          //check for coin transactions
          const coinTxs = txs.filter(tx =>
              tx.scriptPubKey !== undefined && tx.scriptPubKey.nameOp === undefined
          );
          coinTxs.forEach(tx => {
             // console.log("---->coinTX",tx)
              addCoinTx(tx.value,tx.scriptPubKey.addresses[0],txid);
          });

           //check for verified email transactions
           const veTxs = txs.filter(tx =>
               tx.scriptPubKey !== undefined
               && tx.scriptPubKey.nameOp !== undefined
               && tx.scriptPubKey.nameOp.op === "name_doi"
               && tx.scriptPubKey.nameOp.name !== undefined
               && tx.scriptPubKey.nameOp.name.startsWith(TX_VERIFIED_EMAIL_NAME_START)
           );

           veTxs.forEach(tx => {
               tx.scriptPubKey.addresses.forEach(addr =>{
                  // const isFoundMyAddress = Meta.findOne({key:"addresses_by_account", value:addr})
                   const isFoundMyAddress = validateAddress(SEND_CLIENT, addr).ismine
                   console.log("tx was sent to one of my addresses:"+addr,isFoundMyAddress)
                   if(isFoundMyAddress){
                       const cid = tx.scriptPubKey.nameOp.value
                       console.log('ipfs cit is',cid)
                       getFromIPFS(cid).then((dataFromIPFS) => {
                           console.log('dataFromIPFS',dataFromIPFS)
                           const privateKey = getWif(SEND_CLIENT,addr)
                           console.log('our privateKey',getPrivateKeyFromWif({wif:privateKey}))
                           const decryptedDataObjectFromIPFS = decryptMessage({
                               message:dataFromIPFS,
                               privateKey:getPrivateKeyFromWif({wif:privateKey})})
                           console.log("dataFromIPFS (email to request)",JSON.parse(decryptedDataObjectFromIPFS))
                            const to = JSON.parse(decryptedDataObjectFromIPFS).sender_mail
                           const subject = "Doichain email verification processs"
                           const message = `Please click the following  link to verify activate your email ${to} on the Doichain blockchain.`
                           const contentType = "text/plain"
                            console.log('sending to',to)
                           addSendVerifyEmailMailJob({
                               to: to,
                               subject: subject,
                               message: message,
                               contentType: contentType
                           });
                       })
                       console.log("adding nameId to validator and requesting email verification",tx.scriptPubKey.nameOp.name)
                   }
               })
           });

      }
  } catch(exception) {
    throw new Meteor.Error('doichain.checkNewTransactions.exception', exception);
  }
  return true;
};

const getFromIPFS = async (cid) => {
    let { Peer, BlockStore } = require('@textile/ipfs-lite')
    let { setupLibP2PHost } = require('@textile/ipfs-lite/dist/setup')
    let { MemoryDatastore } = require('interface-datastore')

    let store = new BlockStore(new MemoryDatastore())
    let data
    await (async function() {
       // let host = await setupLibP2PHost()
        /*var host = await setupLibP2PHost(undefined, undefined, [
            `/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star`
        ])*/

        let host = await setupLibP2PHost(undefined, undefined, ['/ip4/0.0.0.0/tcp/0'])
        let lite = new Peer(store, host)

        console.log('starting host...')
        await lite.start()
        console.log('started. getting file from cid',cid)
        //let cid = 'QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u'
        data = await lite.getFile(cid)
        console.log("got an email from alice to verify",data.toString())
        // Hello World
        await lite.stop()
        //return data.toString()
    })()
    return data.toString()
}

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

/**
 * This method should add an incoing coin transaction weather its coming through memcash (unconfirmed) or in a new block (confirmed)
 *
 * //TODO 1) right now it only adds unconfirmed transactions (it should also add track confirmed) -
 * //TODO 2) track transaction (txid, received,sent, amount address (from/to) for later use in doiContacts
 *
 * @param value
 * @param address
 * @param txid
 */
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

