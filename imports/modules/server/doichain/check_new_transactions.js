import { Meteor } from 'meteor/meteor';
import bitcore from "bitcore-doichain";
import {randomBytes} from "crypto";
import { nameShow, getRawTransaction,getBlock,getTransaction} from '../../../../server/api/doichain.js';
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
              logConfirm('now checking txid:',our_txid)
              let tx
              try {
                  tx = getTransaction(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, our_txid,true)
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
                      const category = detail.category
                      const fee = detail.fee
                      const n = detail.vout
                      const name = detail.name
                      let nameId
                      let nameValue
                      const isOwnerMyMAddress = validateAddress(CONFIRM_CLIENT, address) //address of this output
                      const processedTxInOptIns = OptIns.findOne({txid: tx.txid})

                      if (name && name.startsWith("doi: " + TX_NAME_START)) { //doi permission e/ or email verification es/
                          nameId = name.substring(("doi: " + TX_NAME_START).length);
                          logConfirm("nameId: " + nameId, tx.txid);
                          const nameRawTxVouts = getRawTransaction(CONFIRM_CLIENT,tx.txid).vout[n]
                          nameValue  = nameRawTxVouts.scriptPubKey.nameOp.value
                          logConfirm("nameValue: " + nameValue, nameValue);
                          if (!processedTxInOptIns && isOwnerMyMAddress.ismine)
                              addNameTx(nameId, nameValue, address, tx.txid);
                      } else if (name && name.startsWith("doi: " + TX_VERIFIED_EMAIL_NAME_START)) {
                          nameId = name.substring(("doi: " + TX_VERIFIED_EMAIL_NAME_START).length);
                          const nameRawTxVouts = getRawTransaction(CONFIRM_CLIENT,tx.txid).vout[n]
                          nameValue  = nameRawTxVouts.scriptPubKey.nameOp.value
                          logConfirm("nameValue: " + nameValue, nameValue);
                          if (!processedTxInOptIns && isOwnerMyMAddress.ismine){
                             addVerifyEmailTx(nameId, nameValue, address, tx.txid)
                          }

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
                      if ((isOwnerMyMAddress.ismine
                          || isOwnerMyMAddress.iswatchonly
                          || isSenderMyMAddress.ismine
                          || isSenderMyMAddress.iswatchonly)
                      && senderAddress!==address)
                          {
                              addCoinTx(tx.txid,
                                  n,
                                  category,
                                  amount,
                                  fee,
                                  tx.confirmations,
                                  senderAddress,
                                  address,
                                  nameId,
                                  nameValue)
                          } //we add this again, since we are interested about the confirmation
                  });
              }
              addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
              logConfirm("transactions updated - lastCheckedBlock:", lastCheckedBlock);
          })
          logConfirm("working with tx finished");
      }
  } catch(exception) {
        throw new Meteor.Error('doichain.checkNewTransactions.exception', exception);
  }
  return true;
};

const addVerifyEmailTx = async (nameId,nameValue,validatorAddress,txid) => {
    console.log(nameValue)
    nameId = nameId+nameValue.substring(0,nameValue.indexOf(" "))
    const parentIpfsCid = nameValue.substring(nameValue.indexOf(" ")+1,nameValue.length)
    console.log("adding nameId to validator and requesting email verification: "+nameId,parentIpfsCid)
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
    console.log('dataObjectFromIPFS',dataObjectFromIPFS)
    const signature = nameId
    console.log('signature to verify',signature)
    const senderPublicKey = getPublicKeyOfOriginTxId(txid)
    console.log('senderPublicKey',senderPublicKey)

    const retSignature = verifySignature({data: dataObjectFromIPFS.sender_mail,publicKey:senderPublicKey,signature:signature})
    logConfirm("retSignature "+retSignature);
    return

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
function addCoinTx(txid,n,category,amount,fee, confirmations,senderAddress,address,nameId,nameValue) {
    //const our_address = address //(category==="send")?senderAddress:address
    const our_address = (category==="send")?senderAddress:address
    //const our_senderAddress = senderAddress //(category==="send")?address:senderAddress
    const our_senderAddress = (category==="send")?address:senderAddress
    console.log('adding coin to address: '+our_address, amount)
    const tx = {
        txid: txid,
        n: n,
        category: category,
        amount: amount,
        fee: fee ? fee : 0,
        confirmations: confirmations,
        senderAddress: our_senderAddress,
        address: our_address,
        nameId: nameId,
        nameValue: nameValue
    }
    const insertTx = () => {
        Transactions.remove({txid: txid, n: n,amount:amount})
        const transactionsId = Transactions.insert(tx)
        console.log(transactionsId + " transactionsId inserted local db")
    }
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

