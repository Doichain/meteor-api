import { Meteor } from 'meteor/meteor';
import bitcore from "bitcore-doichain";
import {randomBytes} from "crypto";
import { listSinceBlock, nameShow, getRawTransaction,getBlock,getTransaction} from '../../../../server/api/doichain.js';
import {getUrl} from "../../../startup/server/dapp-configuration";
import { SEND_CLIENT, CONFIRM_CLIENT } from '../../../startup/server/doichain-configuration.js';
import addDoichainEntry from './add_entry_and_fetch_data.js'
import addOrUpdateMeta from '../meta/addOrUpdate.js';
import { Meta } from '../../../api/meta/meta.js';
import { OptIns} from "../../../api/opt-ins/opt-ins";
import { Transactions} from "../../../api/transactions/transactions";
import {logBlockchain, logConfirm} from "../../../startup/server/log-configuration";
import storeMeta from "./store_meta";
import {getRawMemPool, getWif, validateAddress} from "../../../../server/api/doichain";
import {LAST_CHECKED_BLOCK_KEY, BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI} from "../../../startup/both/constants"
import {
    API_PATH,
    EMAIL_VERIFY_CONFIRMATION_ROUTE,
    VERSION
} from "../../../../server/api/rest/rest";
import getFromIPFS from "../ipfs/get_from_ipfs";
import {IPFS} from "../../../../server/api/ipfs";
import encryptMessage from "./encrypt_message";
import verifySignature from "./verify_signature";
import getPublicKeyOfOriginTxId, {getPublicKeyOfRawTransaction} from "./getPublicKeyOfOriginTransaction";
import decryptMessage from "./decrypt_message";
import getPrivateKeyFromWif from "./get_private-key_from_wif";
import addSendVerifyEmailMailJob from "../jobs/add_send_verify_email_mail";
export const TX_NAME_START = "e/";
export const TX_VERIFIED_EMAIL_NAME_START = "es/";

const checkNewTransaction = (txid, block) => {
  try {
     //  let isMemCacheTransaction = false
       //if the transaction reported (txid) just came in is still in mempool its clearly a mempool transaction
      // const memPoolTransactions = getRawMemPool(CONFIRM_CLIENT);
      // if(memPoolTransactions.indexOf(txid)!==-1) isMemCacheTransaction = true

    /*   if(isMemCacheTransaction) {
           logConfirm("walletnotfiy called - check_new_transactions",txid);
           logConfirm("txid: "+txid+" arrived in mem cache - checking for name and coin outputs");
           let ret;
           let vout;
           try{
               ret = getRawTransaction(CONFIRM_CLIENT, txid);
               vout = ret.vout;
           }catch(e){
               logConfirm('not our tx')
           }
           if(!ret || !vout || !vout.length===0){
               logConfirm("txid "+txid+' does not contain transaction details or transaction not found.');
               return;
           }
           let nameId
           let nameValue
           vout.forEach(output => {
               if(output.scriptPubKey &&
                   output.scriptPubKey.nameOp &&
                   output.scriptPubKey.nameOp.op === "name_doi" &&
                   output.scriptPubKey.nameOp.name !== undefined)
               {
                   if(output.scriptPubKey.nameOp.name.startsWith(TX_NAME_START)){
                       nameId = output.scriptPubKey.nameOp.name
                       nameValue =output.scriptPubKey.nameOp.value
                       output.scriptPubKey.addresses.forEach(addr =>{
                           console.log('now tryuing to add nameId on blockchain for address',addr)
                           const isFoundMyAddress = validateAddress(SEND_CLIENT, addr)
                           if(isFoundMyAddress.ismine) //no watchonly here please
                               addNameTx(output.scriptPubKey.nameOp.name, output.scriptPubKey.nameOp.value,addr,txid)
                       })
                    }
                   if(output.scriptPubKey.nameOp.name.startsWith(TX_VERIFIED_EMAIL_NAME_START)){
                       nameId = output.scriptPubKey.nameOp.name
                       nameValue =output.scriptPubKey.nameOp.value
                       output.scriptPubKey.addresses.forEach(addr =>{
                           const isFoundMyAddress = validateAddress(SEND_CLIENT, addr)
                           if(isFoundMyAddress.ismine) //no watchonly addresses here please this is Bob not Alice
                                addVerifyEmailTx(output.scriptPubKey.nameOp.name,output.scriptPubKey.nameOp.value,addr,txid)
                       })
                   }
               }
               console.log(output)
               output.scriptPubKey.addresses.forEach(addr => {
                   let publicKey
                   if (!publicKey) publicKey = getPublicKeyOfOriginTxId(txid) //in case we have a confirmed block
                   let firstOutsAddress
                   if (!publicKey) { //handle Coinbase transaction transaction please refactor with the same procedure in memcache tx
                       const rawTx = getRawTransaction(CONFIRM_CLIENT, tx.txid)
                       const txIdOfInput = rawTx.vin[0].txid
                       if (txIdOfInput) {
                           console.log("txIdOfInput", txIdOfInput)
                           const rawTxInput = getRawTransaction(CONFIRM_CLIENT, txIdOfInput)
                           firstOutsAddress = rawTxInput.vout[0].scriptPubKey.addresses[0]
                           console.log('getting first outputs address of the coinbase transaction:' + firstOutsAddress)
                       }
                   }

                   const senderAddress = publicKey ? bitcore.getAddressOfPublicKey(publicKey).toString() : firstOutsAddress
                   console.log('senderAddress', senderAddress)
                   const isOwnerMyMAddress = validateAddress(CONFIRM_CLIENT, addr)
                   const isSenderMyMAddress = validateAddress(CONFIRM_CLIENT, senderAddress)
                   console.log('isOwnerMyMAddress: ' + isOwnerMyMAddress.address, isOwnerMyMAddress.ismine)
                   console.log('isSenderMyMAddress:' + isSenderMyMAddress.address, isSenderMyMAddress.ismine)
                   if (isOwnerMyMAddress.ismine
                       || isOwnerMyMAddress.iswatchonly
                       || isSenderMyMAddress.ismine
                       || isSenderMyMAddress.iswatchonly) {
                       const amount = output.value
                       const n = output.n
                       const fee = 0;
                       const confirmations = 0
                       addCoinTx(txid,
                           n,
                           amount,
                           fee,
                           confirmations,
                           senderAddress,
                           addr,
                           nameId,
                           nameValue);
                   } else console.log('not mine', addr)
               })
               //}
           });
       } */

      if (block || txid) {
          logConfirm("blocknotfiy called - check_new_transactions for all tx of the block", block);
          let lastCheckedBlock = block
          let txs

          /*
          let lastCheckedBlock = Meta.findOne({key: LAST_CHECKED_BLOCK_KEY});
          if(lastCheckedBlock !== undefined) lastCheckedBlock = lastCheckedBlock.value;
          logConfirm("lastCheckedBlock",lastCheckedBlock);

          const ret = listSinceBlock(CONFIRM_CLIENT, lastCheckedBlock);
          const txs = ret.transactions;
          lastCheckedBlock = ret.lastblock;
          if(!ret || !txs || txs.length===0){
              logConfirm('updating meta lastCheckedBlock',lastCheckedBlock)
              addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
              return;
          }*/
          let txIdMemCache
          if(txid){
              txIdMemCache = txid
              txs = [txIdMemCache]
              console.log('got txid directly ', txIdMemCache)
          }
          else {
              txs = getBlock(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, block).tx
              console.log('got txs from block ', txs)
          }

          txs.forEach(our_txid => {

              let tx
              try {
                  tx = getTransaction(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, our_txid)
              }catch(e){
                  logConfirm("tx not ours");
              }

              //if a memcache transaction comes right before the block, it could be the block confirms it already and then it should not be added at the same time
              const isConfirmedMemCacheTransaction = (txIdMemCache?true:false) && tx.confirmations>0
              logConfirm("checking tx ... (txIdMemCache)"+txIdMemCache, tx);
              if(tx && !isConfirmedMemCacheTransaction){
                  tx.details.forEach((detail) => { //each tx can have many outputs
                      const address = detail.address
                      const amount = detail.amount
                      const fee = detail.fee
                      const n = detail.vout
                      const name = detail.name
                      let nameId
                      let nameValue
                      const isOwnerMyMAddress = validateAddress(CONFIRM_CLIENT, address) //TODO could easily be there are more addresses in one transaction (e.g. in DOI or Email Verification transactions)
                      if (name && name.startsWith("doi: " + TX_NAME_START)) { //doi permission e/ or email verification es/
                          nameId = name.substring(("doi: " + TX_NAME_START).length);
                          logConfirm("nameId: " + nameId, tx.txid);
                          const ety = nameShow(CONFIRM_CLIENT, nameId);
                          logConfirm("nameShow: " + nameId, ety);
                          nameValue = ety.value
                          const processedTxInOptIns = OptIns.findOne({txid: tx.txid})
                          if (!processedTxInOptIns && isOwnerMyMAddress.ismine) //TODO don't add it again to blockchain but maybe update a local value in case the block is confirmed
                              addNameTx(nameId, nameValue, address, tx.txid);
                      } else if (name && name.startsWith("doi: " + TX_VERIFIED_EMAIL_NAME_START)) {
                          nameId = name.substring(("doi: " + TX_VERIFIED_EMAIL_NAME_START).length);
                          const ety = nameShow(CONFIRM_CLIENT, nameId);
                          nameValue = ety.value
                          logConfirm("nameShow: " + nameId, ety);
                          if (!processedTxInOptIns && isOwnerMyMAddress.ismine) //TODO don't add it again to blockchain but maybe update a local value in case the block is confirmed
                              addVerifyEmailTx(nameId, nameValue, address, ety.txid)
                      }

                      let publicKey
                      let firstOutsAddress = 'coinbase'
                      if (!publicKey) publicKey = getPublicKeyOfOriginTxId(tx.txid) //in case we have a confirmed block

                      if (!publicKey) { //handle Coinbase transaction please refactor with the same procedure in memcache tx
                          const rawTx = getRawTransaction(CONFIRM_CLIENT, tx.txid)
                          const txIdOfInput = rawTx.vin[0].txid
                          if (txIdOfInput) {
                              //console.log("txIdOfInput",txIdOfInput)
                              const rawTxInput = getRawTransaction(CONFIRM_CLIENT, txIdOfInput)
                              firstOutsAddress = rawTxInput.vout[0].scriptPubKey.addresses[0]
                              console.log('getting first outputs address of the coinbase transaction:' + firstOutsAddress)
                          }
                      }
                      const senderAddress = publicKey ? bitcore.getAddressOfPublicKey(publicKey).toString() : firstOutsAddress
                      console.log('isOwnerMyMAddress: ' + isOwnerMyMAddress.address, isOwnerMyMAddress.ismine)
                      const isSenderMyMAddress = validateAddress(CONFIRM_CLIENT, senderAddress)
                      console.log('isSenderMyMAddress: ' + senderAddress, isSenderMyMAddress.ismine)
                      if (isOwnerMyMAddress.ismine
                          || isOwnerMyMAddress.iswatchonly
                          || isSenderMyMAddress.ismine
                          || isSenderMyMAddress.iswatchonly)
                          addCoinTx(tx.txid,
                              n,
                              amount,
                              fee,
                              tx.confirmations,
                              senderAddress,
                              address,
                              nameId,
                              nameValue) //we add this again, since we are interested about the confirmation
                  });
              }
              addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
              logConfirm("transactions updated - lastCheckedBlock:", lastCheckedBlock);
          })
      }
  } catch(exception) {
        throw new Meteor.Error('doichain.checkNewTransactions.exception', exception);
  }
  return true;
};

const addVerifyEmailTx = async (nameId,parentIpfsCid,validatorAddress,txid) => {
    console.log("adding nameId to validator and requesting email verification",nameId)
    const dataFromIPFS = await getFromIPFS(parentIpfsCid)
    const privateKeyWif = getWif(CONFIRM_CLIENT, validatorAddress)
    const privateKey = getPrivateKeyFromWif({wif: privateKeyWif})
    const decryptedDataObjectFromIPFS = decryptMessage({
        message: dataFromIPFS,
        privateKey: privateKey
    })
    const publicKey = validateAddress(CONFIRM_CLIENT, validatorAddress).pubkey
    const confirmationToken = randomBytes(32).toString('hex');
    const dataObjectFromIPFS = JSON.parse(decryptedDataObjectFromIPFS)

    const signature = nameId.substring(3)
    const senderPublicKey = getPublicKeyOfOriginTxId(txid)
    console.log('senderPublicKey',senderPublicKey)

    const retSignature = verifySignature({data: dataObjectFromIPFS.sender_mail,publicKey:senderPublicKey,signature:signature})
    if(!retSignature)  throw new Meteor.Error(
        'namecoin.checkNewTransactions.addVerifyEmailTx.exception for public key '+senderPublicKey);

    logConfirm("decryptedDataObjectFromIPFS ", JSON.parse(decryptedDataObjectFromIPFS));

    const ipfsData = {
        address: decryptedDataObjectFromIPFS.address,
        nameId: nameId,
        parentCid: parentIpfsCid,
        validatorAddress: validatorAddress,
        confirmationToken: confirmationToken
    }

    const encryptedObjectAsString = encryptMessage({
        message: JSON.stringify(ipfsData),
        publicKey: publicKey
    })

    const lite = await IPFS()
    const source = [{
        path: 'nameId',
        content: encryptedObjectAsString,
    }]
    const data = await lite.addFile(source)
    console.log('added encrypted object ipfsData with cid',data.cid.toString())
    const confirmationUrl = getUrl() + API_PATH + VERSION + "/" +
        EMAIL_VERIFY_CONFIRMATION_ROUTE + "/" +
        encodeURIComponent(confirmationToken) + "/" +
        encodeURIComponent(data.cid.toString())+"/"+
        encodeURIComponent(validatorAddress);
    logConfirm('confirmationUrl:' + confirmationUrl);

    const to = JSON.parse(decryptedDataObjectFromIPFS).sender_mail
    const subject = "Doichain email verification processs"
    const message = `Hello ${to},\n\nplease click the following link to verify and activate your email on the Doichain blockchain.\n\n${confirmationUrl}\n\nYour Doichain Validator at ${getUrl()}`
    const contentType = "text/plain"
    logConfirm('sending doichain verification email to', to)

    addSendVerifyEmailMailJob({
        to: to,
        subject: subject,
        message: message,
        contentType: contentType
    });
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
 * @param value
 * @param address
 * @param txid
 */
function addCoinTx(txid,n,amount,fee, confirmations,senderAddress,address,nameId,nameValue) {
    console.log('adding coin ', amount)
    let category = "sent"
    if (validateAddress(CONFIRM_CLIENT, address).ismine) category = 'received'

    const tx = {
        txid: txid,
        n: n,
        category: category,
        amount: amount,
        fee: fee ? fee : 0,
        confirmations: confirmations,
        address: address,
        senderAddress: senderAddress,
        nameId: nameId,
        nameValue: nameValue
    }
    console.log(tx)
    const insertTx = () => {
        Transactions.remove({txid: txid, n: n})
        const transactionsId = Transactions.insert(tx)
        console.log(transactionsId + " transactionsId inserted local db")
    }
    //if(confirmations>0) Meteor.setTimeout(insertTx, 1000) //in case its a block please wait a second before inserting it to prevent collission with memcache tx (and double entries in db)
    //else  //not necessary anymore sine we filter out already confirmed tx's before adding it twice
    insertTx()

    logConfirm(senderAddress + " sent " + amount + " DOI to address " + address + " in txid:", txid);

    const valueCount = Meta.findOne({key: BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI})
    if (valueCount) {
        const oldValue = parseFloat(valueCount.value);
        value += oldValue;
    }
    storeMeta(BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI, value);
}

export default checkNewTransaction;

