import { Meteor } from 'meteor/meteor';
import { CONFIRM_CLIENT} from '../../../startup/server/doichain-configuration.js';
import {
    getBlock, getBlockCount,
    getBlockHash, getRawTransaction,
    getTransaction,
    getWif,
    nameList
} from "../../../../server/api/doichain";
import storeMeta from "./store_meta";
import {
    BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS,
    BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS,
    BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS,
    BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS,
    BLOCKCHAIN_SCAN_STATE,
    BLOCKCHAIN_SCAN_STATE_RUNNING,
    BLOCKCHAIN_SCAN_STATE_STOPPED,
    LAST_CHECKED_BLOCK_KEY
} from "../../../startup/both/constants";
import {Meta} from "../../../api/meta/meta";
import {OptIns} from "../../../api/opt-ins/opt-ins";
import decryptMessage from "./decrypt_message";
import {logConfirm} from "../../../startup/server/log-configuration";
import getPrivateKeyFromWif from "./get_private-key_from_wif";


const scan_Doichain = (rescan) => {

    let firstBlock = getBlockHash(CONFIRM_CLIENT,0)

    if(Meta.findOne({key: LAST_CHECKED_BLOCK_KEY})){
        firstBlock = Meta.findOne({key: LAST_CHECKED_BLOCK_KEY}).value;
    }

    const allrequestedDoisCount = Meta.findOne({key: BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS})
    if(!allrequestedDoisCount || !allrequestedDoisCount.value || allrequestedDoisCount.value===0)rescan = true

    const blockChainState = Meta.findOne({key: BLOCKCHAIN_SCAN_STATE})
    console.log(blockChainState)
    if(blockChainState===undefined || blockChainState.value!==BLOCKCHAIN_SCAN_STATE_RUNNING){
        console.log('new blockchain scan started')
        storeMeta(BLOCKCHAIN_SCAN_STATE, BLOCKCHAIN_SCAN_STATE_RUNNING)
        scan_DoichainOwn(rescan,firstBlock).then(function () {
            scan_DoichainComplete(rescan,firstBlock).then(function () {
                console.log('scan complete')
                storeMeta(BLOCKCHAIN_SCAN_STATE, BLOCKCHAIN_SCAN_STATE_STOPPED)
            })
        })
    }
    console.log('scan doichain called. ')
}

const scan_DoichainOwn = async (rescan,firstBlock) => {
    let lastBlockHeight = getBlock(CONFIRM_CLIENT,firstBlock).height

    if(rescan){
        OptIns.remove({})
        lastBlockHeight = 0;
    }

    let ourRequestedDois = 0;
    let ourConfirmedDois = 0;
    let wif
    const addressesByAccount  = Meta.findOne({key: "addresses_by_account"})
    if(addressesByAccount !== undefined){
            wif = getWif(CONFIRM_CLIENT, addressesByAccount.value[0]);
    }
    //1. get all our nameId's from the wallet
    //0. get all nameId's which ever touched this node
    const ourNameIds = nameList(CONFIRM_CLIENT)
    //2. loop through the names and get and store detail information in dApp
    ourNameIds.forEach(function (nameId) {

            if(lastBlockHeight<=nameId.height) {

                const tx = getTransaction(CONFIRM_CLIENT, nameId.txid)
                console.log(nameId.name,nameId.value)
                const nameValue = JSON.parse(nameId.value)
                const address = nameId.address
                const hasSignature = nameValue.signature ? true : false
                const hasDoiSignature = nameValue.doiSignature ? true : false

                if (hasDoiSignature) ourConfirmedDois++
                if (hasSignature) ourRequestedDois++
                let domain

                if (!hasDoiSignature) {
                    const privateKey = getPrivateKeyFromWif({wif: wif}); //TODO it could happen that this privkey of this address doesn't have the correct key of the first address - should try all keys
                    let i = 0
                    while (!domain) {
                        try {
                            domain = decryptMessage({privateKey: privateKey, message: nameValue.from});
                        } catch (e) {
                            //console.log(i,addressesByAccount.value.length)
                            if (i === addressesByAccount.value.length) break;
                            const thisAddress = addressesByAccount.value[i++]
                            wif = getWif(CONFIRM_CLIENT, thisAddress);
                            if (wif === undefined) break;
                        }
                    }
                }

                logConfirm('decrypted opt-in from dapp url:' + domain, ourConfirmedDois);
                const status = ['transaction sent']
                const optInFound = {
                    nameId: nameId.name,
                    address: address,
                    txId: nameId.txid,
                    createdAt: new Date(tx.time * 1000),
                    value: nameId.value,
                    status: status,
                    confirmations: tx.confirmations,
                    domain: domain
                }

                if (hasDoiSignature) {
                    optInFound.confirmedAt = new Date(tx.blocktime * 1000);
                    optInFound.status.push('DOI written')
                }

                OptIns.insert(optInFound)
                // OptIns.upsert({nameId:nameId}, {$set: optInFound })
                //3. count requested and confirmed DOI's
                console.log("ourRequestedDois",ourRequestedDois)
                console.log("ourConfirmedDois",ourConfirmedDois)
                storeMeta(BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS, ourRequestedDois)
                storeMeta(BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS, ourConfirmedDois)
            } //if lastblockheight
    })
}

const scan_DoichainComplete = async (rescan,firstBlock) => {

    let allRequestedDois = 0;
    let allConfirmedDois = 0;

    //1. loop through blockchain starting with 0 ending with current blockheight
    const blockCount = getBlockCount(CONFIRM_CLIENT)

    let lastBlockHeight = getBlock(CONFIRM_CLIENT,firstBlock).height
    console.log("lastBlockHeight",lastBlockHeight)
    if(rescan){
        lastBlockHeight = 1;
    }

    for(let i=lastBlockHeight;i<blockCount;i++) {
        //2. getblockhash height
        const blockHash = getBlockHash(CONFIRM_CLIENT,i);
        //3. getblock blockhash
        const block = getBlock(CONFIRM_CLIENT,blockHash);
        const txs = block.tx
        //loop through all transactions
        txs.forEach(function (tx) {
            const txRawContent = getRawTransaction(CONFIRM_CLIENT,tx)
            const outputs = txRawContent.vout
            outputs.forEach(function (thisOutput) {
                if(thisOutput.scriptPubKey.nameOp){
                    const nameValue =  JSON.parse(thisOutput.scriptPubKey.nameOp.value)
                    const hasSignature =nameValue.signature?true:false
                    const hasDoiSignature = nameValue.doiSignature?true:false

                    if(hasDoiSignature) allConfirmedDois++
                    if(hasSignature)  allRequestedDois++
                }
                console.log("allRequestedDois "+i,allRequestedDois)
                console.log("allConfirmedDois",allConfirmedDois)
                storeMeta(BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS, allRequestedDois)
                storeMeta(BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS, allConfirmedDois)
            })
        })
    }

    /*
    //const blockDetails = listSinceBlock(CONFIRM_CLIENT,firstBlock)
    blockDetails.transactions.forEach(function (it) {
        if(it.name){
          const nameId = it.name.substring(5)
          const doiDetails = nameShow(CONFIRM_CLIENT,nameId)
          if(doiDetails){
           //   console.log("doiDetails",doiDetails)
            const doiValue = doiDetails.value
            const valueObject = JSON.parse(doiValue)
            const hasSignature = valueObject.signature?true:false
            const hasDoiSignature = valueObject.doiSignature?true:false
           // console.log(valueObject.doiSignature,hasDoiSignature)

            const isOurRecord = validateAddress(CONFIRM_CLIENT,doiDetails.address).ismine
           // console.log(doiDetails.address,isOurRecord+" hasDoiSignature:"+hasDoiSignature)
              //if(hasDoiSignature) console.log(doiDetails, isOurRecord)
            if(isOurRecord){
                //console.log('is ours!',hasDoiSignature)
              const tx = getTransaction(CONFIRM_CLIENT,doiDetails.txid)
               //console.log("tx",tx)

                if(hasDoiSignature)ourConfirmedDois++
                if(hasSignature)  ourRequestedDois++

                let optInFound = OptIns.findOne({nameId:nameId})

                if(optInFound===undefined){
                    //console.log("optInFound",optInFound.nameId)
                    const status = ['re-imported']
                    //let confirmedAt = undefined
                    const createdAt = new Date( tx.time*1000)
                    //console.log("timereceived",tx.time)
                    //console.log("createdAt",createdAt)

                    let wif
                    const addressesByAccount  = Meta.findOne({key: "addresses_by_account"})
                    if(addressesByAccount !== undefined){
                        addressesByAccount.value.forEach(function (addr) {
                            wif = getWif(CONFIRM_CLIENT, addr);
                        })
                    }


                    const privateKey = getPrivateKeyFromWif({wif: wif});
                   // logConfirm('got private key (will not show it here)',allRequestedDois);

                    const domain = decryptMessage({privateKey: privateKey, message: valueObject.from});
                    logConfirm('decrypted opt-in from dapp url:'+domain,allRequestedDois);

                    let doiTimestamp = undefined
                    if(hasDoiSignature){
                        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>> DOI SIGNATURE')
                        status.push('DOI confirmed')
                        doiTimestamp = new Date(valueObject.doiTimestamp+1000)
                    }
                    //console.log(doiValue)

                    optInFound = {
                            nameId: nameId,
                            address: doiDetails.address,
                            txId: doiDetails.txid,
                            status:status,
                            createdAt: createdAt,
                            value: doiValue,
                            confirmedAt: doiTimestamp,
                            confirmations: tx.confirmations,
                            domain: domain
                    }
                   // console.log('insert',optInFound)
                    OptIns.insert(optInFound)
                }
            }

            if(hasDoiSignature) allConfirmedDois++
            if(hasSignature) allRequestedDois++

          }else console.log(nameId+" doesn't have details")

        }
    })*/

    return true
}

export default scan_Doichain;

