import { Meteor } from 'meteor/meteor';
import { randomBytes } from "crypto";
import { getRawTransaction} from '../../../../server/api/doichain.js';
import { getUrl } from "../../../startup/server/dapp-configuration";
import {
    SEND_CLIENT,
    CONFIRM_CLIENT
} from '../../../startup/server/doichain-configuration.js';
import addDoichainEntry from './add_entry_and_fetch_data.js'
import addOrUpdateMeta from '../meta/addOrUpdate.js';
import { Meta} from '../../../api/meta/meta.js';
import { OptIns} from "../../../api/opt-ins/opt-ins";
import { Transactions } from "../../../api/transactions/transactions";
import { logConfirm } from "../../../startup/server/log-configuration";
import storeMeta from "./store_meta";
import {
    getBlockHash,
    getWif,
    listSinceBlock,
    getAddressInfo
} from "../../../../server/api/doichain";
import {
    LAST_CHECKED_BLOCK_KEY,
    BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI
} from "../../../startup/both/constants"
import {
    API_PATH,
    EMAIL_VERIFY_CONFIRMATION_ROUTE,
    VERSION
} from "../../../../server/api/rest/rest";
import getFromIPFS from "../ipfs/get_from_ipfs";
import { IPFS } from "../../../../server/api/ipfs";
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
            //   if(block) logConfirm("blocknotfiy called", block);
            //  if(txid)logConfirm("walletnotfiy called", txid);
            let txs = []
            if (txid) {
                try {
                    const txMemcache = getRawTransaction(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, txid, true)
                    txs = [txMemcache]
                } catch (e) {
                    logConfirm("exception", e);
                }
            } else {
                //txs = getBlock(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, block).tx
                let lastCheckedBlock = Meta.findOne({
                    key: LAST_CHECKED_BLOCK_KEY
                }); //TODO if dapp gets initialized first time nothing gets called
                if (lastCheckedBlock) lastCheckedBlock = lastCheckedBlock.value;
                else lastCheckedBlock = getBlockHash(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, 1)
                // logConfirm("lastCheckedBlock", lastCheckedBlock);
                const ret = listSinceBlock(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, lastCheckedBlock);
                txs = ret.transactions;
                lastCheckedBlock = ret.lastblock;
                // logConfirm('updating meta lastCheckedBlock', lastCheckedBlock)
                addOrUpdateMeta({
                    key: LAST_CHECKED_BLOCK_KEY,
                    value: lastCheckedBlock
                });
            }

            txs.forEach(tx => {
                // console.log("tx",tx)
                tx.vout.forEach((vout) => { //each tx can have many outputs
                    const address = vout.scriptPubKey.addresses[0]
                    // console.log(address)
                    // const n = vout.n
                    let nameOp
                    let nameId
                    let nameValue
                    let name
                    if (vout.scriptPubKey.nameOp) {
                        nameOp = vout.scriptPubKey.nameOp.op
                        name = vout.scriptPubKey.nameOp.name
                        nameValue = vout.scriptPubKey.nameOp.value
                        console.log('nameOp', nameOp)
                        console.log('name', name)
                        console.log('nameValue', nameValue)
                    }
                    const isOwnerMyMAddress = getAddressInfo(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, address) //address of this output

                    const processedTxInOptIns = OptIns.findOne({
                        txid: tx.txid
                    })
                    if (isOwnerMyMAddress.ismine || isOwnerMyMAddress.iswatchonly) {
                        if (nameOp === 'name_doi' && name.startsWith(TX_NAME_START)) { //doi permission e/ or email verification es/
                            nameId = name.substring((TX_NAME_START).length, name.length);
                            logConfirm("nameId: " + nameId, tx.txid);
                            logConfirm("nameValue: " + nameValue, nameValue);
                            if (!processedTxInOptIns)
                                addNameTx(nameId, nameValue, address, tx.txid);
                        } else if (nameOp === 'name_doi' && name.startsWith(TX_VERIFIED_EMAIL_NAME_START)) {
                            nameId = name.substring((TX_VERIFIED_EMAIL_NAME_START).length, name.length);
                            logConfirm("nameValue: " + nameValue, nameValue);
                            if (!processedTxInOptIns) {
                                addVerifyEmailTx(nameId, nameValue, address, tx.txid)
                            }
                        }
                    }
                })
                addCoinTx(tx, tx.confirmations) //we store all coin transactions which the node notifies  
            }) //foreach tx

            // addOrUpdateMeta({key: LAST_CHECKED_BLOCK_KEY, value: lastCheckedBlock});
            // logConfirm("transactions updated - lastCheckedBlock:", lastCheckedBlock);
        }
    } catch (exception) {
        throw new Meteor.Error('doichain.checkNewTransactions.exceptiondoichain.checkNewTransactions.exception', exception);
    }
    return true;
};

const addVerifyEmailTx = async (nameId, nameValue, validatorAddress, txid) => {
    nameId = nameId + nameValue.substring(0, nameValue.indexOf(" "))
    const parentIpfsCid = nameValue.substring(nameValue.indexOf(" ") + 1, nameValue.length)
    console.log("adding nameId to validator and requesting email verification: " + nameId, parentIpfsCid)
    const dataFromIPFS = await getFromIPFS(parentIpfsCid)
    const privateKeyWif = getWif(CONFIRM_CLIENT, validatorAddress)
    const privateKey = getPrivateKeyFromWif({
        wif: privateKeyWif
    })
    const decryptedDataObjectFromIPFS = decryptMessage({
        message: dataFromIPFS,
        privateKey: privateKey
    })

    const publicKey = getAddressInfo(CONFIRM_CLIENT, validatorAddress).pubkey
    const confirmationToken = randomBytes(32).toString('hex');
    const dataObjectFromIPFS = JSON.parse(decryptedDataObjectFromIPFS)
    console.log('dataObjectFromIPFS', dataObjectFromIPFS)
    const signature = nameId
    console.log('signature to verify', signature)
    const senderPublicKey = getPublicKeyOfOriginTxId(txid)
    console.log('senderPublicKey', senderPublicKey)

    const retSignature = verifySignature({
        data: dataObjectFromIPFS.sender_mail,
        publicKey: senderPublicKey,
        signature: signature
    })
    logConfirm("retSignature " + retSignature);

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
    console.log('added encrypted object ipfsData with cid', data.cid.toString())
    const confirmationUrl = getUrl() + API_PATH + VERSION + "/" +
        EMAIL_VERIFY_CONFIRMATION_ROUTE + "/" +
        encodeURIComponent(confirmationToken) + "/" +
        encodeURIComponent(data.cid.toString()) + "/" +
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
    console.log('adding NameTx', name)
    //cut away 'e/' in case it was delivered in a mempool transaction otherwise its not included.
    //const txName = name.startsWith(TX_NAME_START)?name.substring(TX_NAME_START.length):name;
    const txName = name.startsWith(TX_NAME_START) ? name : "e/" + name
    addDoichainEntry({
        name: txName,
        value: value,
        address: address,
        txId: txid
    });
}

/**
 *
 * This method should add an incoing coin transaction 
 * wether its coming through memcash (unconfirmed) or in a new block (confirmed)
 * 
 * @param value
 * @param address
 * @param txid
 */
function addCoinTx(tx, confirmations) {
    console.log('checking coinTx with txid', tx.txid)
    const insertTx = (ourTx) => {
        console.log('preparing for processing into transactins', ourTx)
        //ourTx._id?ourTx._id=undefined:null //we need to do this otherwise it cannot get added another time
        const query = {
            txid: ourTx.txid,
            n: ourTx.n,
            type: ourTx.type,
            address: ourTx.address
        } //we shuould also not delete an output (for an input)
        //console.log("updating: ",Transactions.find(query).fetch())
        const foundUpdateTxs = Transactions.find(query).fetch()
        if (foundUpdateTxs && foundUpdateTxs.length > 0) {
            console.log(foundUpdateTxs.length + " txs found for updating (should be only 1) it should be an memcache tx")
            console.log('updating: ', ourTx)
            Transactions.update(query, {
                $set: ourTx
            }) //when a block gets created we need to delete the old transaction before adding it aagain
        } else {
            console.log('inserting: ', ourTx)
            try {
                Transactions.insert(ourTx)
            }catch(e){
                console.error(e)
            }
       
        }
    }

    console.info('current tx:',tx.txid)
    const rawTx = getRawTransaction(SEND_CLIENT, tx.txid)

    let senderAddress 
    rawTx.vin.forEach(inTx => {
        const ourTx = {
            type: 'in',
            confirmations: confirmations,
        }

        ourTx.txid = rawTx.txid //inTx.txid is obviously wrong
        console.info('txid of input:',inTx.txid)
        ourTx.category = "send"
        //ourTx.senderAddress = 'coinbase'

        let ourInTx
        if (inTx.coinbase === undefined) {

            ourInTx = getRawTransaction(SEND_CLIENT, inTx.txid)
            ourTx.amount = ourInTx.vout[inTx.vout].value * -1
            ourTx.spent = true

            try {
                console.info(`vin: rawTx.time defined: ${rawTx.time!==undefined} as Date 
                 ${(rawTx.time?new Date(rawTx.time*1000):new Date())} \n `)
            } catch (ex) {
                console.error(ex)
            }

            ourTx.createdAtTime = rawTx.time
            ourTx.createdAt = rawTx.time ? new Date(rawTx.time * 1000) : new Date()
        /*    if (inTx.scriptSig && inTx.scriptSig.asm.indexOf('[ALL] ') !== -1) { //try to get the public key from the input of this transaction

                const asm = inTx.scriptSig.asm
                const indexOfPubKey = inTx.scriptSig.asm.indexOf('[ALL] ')
                const lengthOfAsm = inTx.scriptSig.asm.length
                const senderPublicKey = (indexOfPubKey != -1) ? asm.substring(indexOfPubKey + 6, lengthOfAsm) : undefined
                // ourTx.senderAddress = senderPublicKey ? getAddress({publicKey: senderPublicKey}) : senderPublicKey
                console.info(`input has a public key: ${senderPublicKey}`)
                //console.log('global.network', GLOBAL.DEFAULT_NETWORK)
                try{
                    //console.info(getAddress(senderPublicKey, GLOBAL.DEFAULT_NETWORK))
                    ourTx.senderAddress = getAddress({publicKey:senderPublicKey})
                    console.info('senderAddress:',ourTx.senderAddress)
                }catch(ex){
                    console.error(ex)
                }
                ourInTx.vout.forEach((outn)=>{
                    console.log('ourInTx.vout:'+outn.n,outn.scriptPubKey.addresses[0])
                })
                console.warn(inTx)*/
               // ourTx.senderAddress = ourInTx.vout[inTx.vout].scriptPubKey.addresses[0]
                //ourTx.senderAddress 
                console.log("ourInTx",ourInTx)
                ourTx.address = ourInTx.vout[inTx.vout].scriptPubKey.addresses[0]  //here we find just our own address instead
             /*   if(senderAddress===undefined) senderAddress =ourInTx.vin[0].scriptPubKey.addresses[0]
                else {
                    senderAddress = []
                    senderAddress.push(ourTx.senderAddress)
                } //convert the string into an array in case more then 1 input was used 
                console.info('input senderAddress:',senderAddress) */
           // }

            try {
                const isMyAddress = getAddressInfo(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, ourTx.address)
                if (isMyAddress.ismine || isMyAddress.iswatchonly) {
                    insertTx(ourTx)
                }
            } catch (e) {
                console.warn('senderAddress was a coinbase transaction')
            }

        }
    })

    let outAddresses
    rawTx.vout.forEach(outTx => {
        // console.log('rawTx.vout',outTx)
        if (outTx.scriptPubKey.type !== 'nulldata') { //nulldata outputs don't have an address and other data
            const myTx = {
                type: 'out',
                txid: rawTx.txid,
                confirmations: confirmations
            }
            //check if we have a nameOp
            if (outTx.scriptPubKey && outTx.scriptPubKey.nameOp) {
                myTx.nameId = outTx.scriptPubKey.nameOp.name
                myTx.nameValue = outTx.scriptPubKey.nameOp.value
            }
            myTx.n = outTx.n
            myTx.fee = outTx.fee ? outTx.fee : 0

            myTx.address = outTx.scriptPubKey.addresses[0]

            if(outAddresses===undefined) outAddresses = myTx.address
            else {
                outAddresses = []
                outAddresses.push(myTx.address)
            }

            myTx.senderAddress=senderAddress
            myTx.amount = outTx.value ? outTx.value : 0
            myTx.category = "receive"

            const isMyMAddress = getAddressInfo(SEND_CLIENT ? SEND_CLIENT : CONFIRM_CLIENT, myTx.address)

            if (isMyMAddress.ismine || isMyMAddress.iswatchonly) {
                myTx.category = "receive"
                myTx.amount = outTx.value < 0 ? (outTx.value * -1) : outTx.value
                myTx.createdAtTime = rawTx.time
                myTx.createdAt = (rawTx.time !== undefined) ? new Date(rawTx.time * 1000) : new Date()
                insertTx(myTx)
            }
            //update local dApp in case address belongs to this wallet
            if (confirmations > 0 && isMyMAddress.ismine) {
                const valueCount = Meta.findOne({
                    key: BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI
                })
                let value = myTx.amount
                if (valueCount) {
                    const oldValue = parseFloat(valueCount.value);
                    value += oldValue;
                }
                storeMeta(BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI, value);
            }
        }
    })
    //update outAdresses! ?!! 
}

export default checkNewTransaction;