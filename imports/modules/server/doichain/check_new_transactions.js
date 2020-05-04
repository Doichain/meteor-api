import { Meteor } from 'meteor/meteor';
import bitcore from "bitcore-doichain";
import {randomBytes} from "crypto";
import { nameShow, getRawTransaction,getBlock,getTransaction} from '../../../../server/api/doichain.js';
import {getUrl, isRegtest, isTestnet} from "../../../startup/server/dapp-configuration";
import { SEND_CLIENT, CONFIRM_CLIENT } from '../../../startup/server/doichain-configuration.js';
import addDoichainEntry from './add_entry_and_fetch_data.js'
import addOrUpdateMeta from '../meta/addOrUpdate.js';
import { Meta } from '../../../api/meta/meta.js';
import { OptIns} from "../../../api/opt-ins/opt-ins";
import { Transactions} from "../../../api/transactions/transactions";
import {logBlockchain, logConfirm} from "../../../startup/server/log-configuration";
import storeMeta from "./store_meta";
import {getBlockHash, getRawMemPool, getWif, listSinceBlock, validateAddress} from "../../../../server/api/doichain";
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
import getPublicKeyOfOriginTxId from "./getPublicKeyOfOriginTransaction";
import decryptMessage from "./decrypt_message";
import getPrivateKeyFromWif from "./get_private-key_from_wif";
import addSendVerifyEmailMailJob from "../jobs/add_send_verify_email_mail";
import getAddress from "./get_address";
export const TX_NAME_START = "e/";
export const TX_VERIFIED_EMAIL_NAME_START = "es/";

const checkNewTransaction = (txid, block) => {
  try {
      if (block || txid) {
          if(block) logConfirm("blocknotfiy called", block);
          if(txid)logConfirm("walletnotfiy called", txid);
          let txs = []
          if(txid){
              try {
                  const txMemcache = getTransaction(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, txid,true)
                  txs = [txMemcache]
                  console.log('got txid from memcache ', txid)
              }catch(e){

              }

          }
          else {
              //txs = getBlock(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, block).tx
              let lastCheckedBlock = Meta.findOne({key: LAST_CHECKED_BLOCK_KEY}); //TODO if dapp gets initialized first time nothing gets called
              if(lastCheckedBlock) lastCheckedBlock = lastCheckedBlock.value;
              else lastCheckedBlock = getBlockHash(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT,1)
              logConfirm("lastCheckedBlock",lastCheckedBlock);
              const ret = listSinceBlock(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, lastCheckedBlock);
              txs = ret.transactions;
              lastCheckedBlock = ret.lastblock;
              logConfirm('updating meta lastCheckedBlock',lastCheckedBlock)
              addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
          }

          console.log('checking txs')
          txs.forEach(tx => {
              console.log('checking tx',tx.txid)
              if(tx) { //&& !isConfirmedMemCacheTransaction){
                //  if(block)scan_Doichain(false,block) //do not complete rescan - just index block for statistics TODO check this do we need this here?

                  tx.details.forEach((detail) => { //each tx can have many outputs
                      const address = detail.address
                      // const amount = detail.amount
                      // const category = detail.category
                      // const fee = detail.fee
                      const n = detail.vout
                      const name = detail.name
                      let nameId
                      let nameValue
                      //TODO please check if this is a block and not our transaction
                      const isOwnerMyMAddress = validateAddress(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, address) //address of this output
                      const processedTxInOptIns = OptIns.findOne({txid: tx.txid})
                      if (name && name.startsWith("doi: " + TX_NAME_START)) { //doi permission e/ or email verification es/
                          nameId = name.substring(("doi: " + TX_NAME_START).length);
                          logConfirm("nameId: " + nameId, tx.txid);
                          const nameRawTxVouts = getRawTransaction(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT,tx.txid).vout[n]
                          nameValue  = nameRawTxVouts.scriptPubKey.nameOp.value
                          logConfirm("nameValue: " + nameValue, nameValue);
                          if (!processedTxInOptIns && isOwnerMyMAddress.ismine)
                              addNameTx(nameId, nameValue, address, tx.txid);
                      } else if (name && name.startsWith("doi: " + TX_VERIFIED_EMAIL_NAME_START)) {
                          nameId = name.substring(("doi: " + TX_VERIFIED_EMAIL_NAME_START).length);
                          const nameRawTxVouts = getRawTransaction(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT,tx.txid).vout[n]
                          nameValue  = nameRawTxVouts.scriptPubKey.nameOp.value
                          logConfirm("nameValue: " + nameValue, nameValue);
                          if (!processedTxInOptIns && isOwnerMyMAddress.ismine){
                             addVerifyEmailTx(nameId, nameValue, address, tx.txid)
                          }
                      }
                      /*let publicKey
                      let firstOutsAddress = 'coinbase'
                      if (!publicKey) publicKey = getPublicKeyOfOriginTxId(tx.txid) //in case we have a confirmed block
                      if (!publicKey) { //handle Coinbase transaction please refactor with the same procedure in memcache tx
                          const rawTx = getRawTransaction(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, tx.txid)
                          const txIdOfInput = rawTx.vin[0].txid
                          if (txIdOfInput) {
                              const rawTxInput = getRawTransaction(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, txIdOfInput)
                              firstOutsAddress = rawTxInput.vout[0].scriptPubKey.addresses[0]
                              console.log('getting first outputs address of the coinbase transaction:' + firstOutsAddress)
                          }
                      }*/
                  });
                  addCoinTx(tx,tx.confirmations)
                  console.log('end checking tx',tx.txid)
              }
          console.log('doing another round on checking tx')
          }) //foreach tx

         // addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
         // logConfirm("transactions updated - lastCheckedBlock:", lastCheckedBlock);
      }
  } catch(exception) {
        throw new Meteor.Error('doichain.checkNewTransactions.exceptiondoichain.checkNewTransactions.exception', exception);
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
    console.log('adding NamTx',txid)
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
 *
 * This method should add an incoing coin transaction weather its coming through memcash (unconfirmed) or in a new block (confirmed)
 *
 * @param value
 * @param address
 * @param txid
 */
function addCoinTx(tx,confirmations) {
    const insertTx = (ourTx) => {
        ourTx._id?ourTx._id=undefined:null //we need to do this otherwise it cannot get added another time
        ourTx.createdAt?ourTx.createdAt=undefined:null
        const query = {txid: ourTx.txid, n:ourTx.n, address: ourTx.address}
       // console.log(Transactions.find({txid: ourTx.txid, n:ourTx.n}).fetch())
        //1. First remove data from memcache if this is
        Transactions.remove(query) //when a block gets created we need to delete the old transaction before adding it aagain
        const recordId = Transactions.insert(ourTx)
        if(recordId){
           // if(ourTx.amount>0) console.log(ourTx.senderAddress + " sent " + ourTx.amount + " DOI to address " + ourTx.address + " in txid:", ourTx.txid)
           // else console.log(ourTx.senderAddress + " received " + ourTx.amount + " DOI from "+ourTx.address+" in txid:", ourTx.txid)
        }
    }

    const rawTx = getRawTransaction(SEND_CLIENT,tx.txid)
    rawTx.vin.forEach(inTx => {
        const ourTx = {
            type: 'in',
            confirmations: confirmations,
        }

        ourTx.txid = inTx.txid
        ourTx.category = "send"
        ourTx.senderAddress = 'coinbase'

        let ourInTx
        if(!inTx.coinbase) {
            ourInTx = getRawTransaction(SEND_CLIENT, inTx.txid)
            //   console.log('inTx.vout'+inTx.vout)
            //console.log("ourInTx.vout",ourInTx.vout)
            ourTx.amount = ourInTx.vout[inTx.vout].value * -1
            // console.log('ourInTx.amount',tx.amount)
            ourTx.txid = inTx.txid

            if (inTx.scriptSig) { //try to get the public key from the input of this transaction
                const asm = inTx.scriptSig.asm
                const indexOfPubKey = inTx.scriptSig.asm.indexOf('[ALL] ')
                const lengthOfAsm = inTx.scriptSig.asm.length
                const senderPublicKey = (indexOfPubKey != -1) ? asm.substring(indexOfPubKey + 6, lengthOfAsm) : undefined
                ourTx.senderAddress = senderPublicKey ? getAddress({publicKey: senderPublicKey}) : senderPublicKey
                ourTx.address = ourInTx.vout[inTx.vout].scriptPubKey.addresses[0]
            }

            const isMyAddress = validateAddress(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, ourTx.senderAddress)
            if (isMyAddress.isvalid && isMyAddress.ismine) {
                insertTx(ourTx)
            }

            if (isMyAddress.isvalid && isMyAddress.iswatchonly) {
                insertTx(ourTx)
            }
        }

    })

    rawTx.vout.forEach(outTx => {

        if(outTx.scriptPubKey.type!=='nulldata'){ //nulldata outputs don't have an address and other data
            const myTx = {
                type: 'out',
                txid: rawTx.txid,
                confirmations: confirmations
            }

            myTx.n = outTx.n
            myTx.fee = outTx.fee?outTx.fee:0
            myTx.nameId = outTx.nameId
            myTx.nameValue = outTx.nameValue
            myTx.address = outTx.scriptPubKey.addresses[0]
            myTx.amount  = outTx.value?outTx.value:0
            myTx.category = "receive"

            const isMyMAddress = validateAddress(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, myTx.address)

            if(isMyMAddress.isvalid && isMyMAddress.ismine) {
                myTx.category = "receive"
                myTx.amount  = outTx.value<0?(outTx.value*-1):outTx.value
                insertTx(myTx)
            }

            if(isMyMAddress.isvalid && isMyMAddress.iswatchonly) {
                myTx.category = "receive"
                myTx.amount  = outTx.value<0?(outTx.value*-1):outTx.value
                insertTx(myTx)
            }

            //update local dApp in case address belongs to this wallet
            if(confirmations>0 && isMyMAddress.ismine){
                const valueCount = Meta.findOne({key: BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI})
                let value = myTx.amount
                if (valueCount) {
                    const oldValue = parseFloat(valueCount.value);
                    value += oldValue;
                }
                storeMeta(BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI, value);
            }
        }
    })
}

export default checkNewTransaction;

