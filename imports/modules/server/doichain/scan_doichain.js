import { CONFIRM_CLIENT} from '../../../startup/server/doichain-configuration.js';
import {
    getBlock, getBlockCount,
    getBlockHash,
    getTransaction,
    getWif,getRawTransaction,
    nameList, nameShow
} from "../../../../server/api/doichain";
import storeMeta from "./store_meta";
import {
    BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS, BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDEMAILVERIFICATIONS,
    BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS, BLOCKCHAIN_INFO_VAL_ALLREQUESTEDEMAILVERIFICATIONS,
    BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS,
    BLOCKCHAIN_INFO_VAL_OURRECEIVEDDOIS, BLOCKCHAIN_INFO_VAL_OURREQUESTEDANDCONFIRMEDDOIS,
    BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS,
    BLOCKCHAIN_SCAN_STATE,
    BLOCKCHAIN_SCAN_STATE_RUNNING,
    BLOCKCHAIN_SCAN_STATE_STOPPED,
    LAST_CHECKED_BLOCK_KEY
} from "../../../startup/both/constants";
import {Meta} from "../../../api/meta/meta";
import {OptIns} from "../../../api/opt-ins/opt-ins";
import decryptMessage from "./decrypt_message";
import {logMain,logError} from "../../../startup/server/log-configuration";
import getPrivateKeyFromWif from "./get_private-key_from_wif";
import getPublicKeyOfOriginTxId from "./getPublicKeyOfOriginTransaction";
import checkNewTransaction, {TX_NAME_START, TX_VERIFIED_EMAIL_NAME_START} from "./check_new_transactions";
import updateMeta from "./update_meta";


const scan_Doichain = async (rescan,firstBlock) => {

    if(!firstBlock)
        firstBlock = getBlockHash(CONFIRM_CLIENT,0)

    if(!rescan && Meta.findOne({key: LAST_CHECKED_BLOCK_KEY})){
        firstBlock = Meta.findOne({key: LAST_CHECKED_BLOCK_KEY}).value;
    }

    const allrequestedDoisCount = Meta.findOne({key: BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS})
    if(!allrequestedDoisCount || !allrequestedDoisCount.value || allrequestedDoisCount.value===0)rescan = true

    //const blockChainState = Meta.findOne({key: BLOCKCHAIN_SCAN_STATE})
    //console.log("blockChainState",blockChainState)
    //if(blockChainState===undefined || blockChainState.value!==BLOCKCHAIN_SCAN_STATE_RUNNING){
        console.log('new blockchain scan started')
        if(!scanRunning){
            await scan_DoichainOwn(rescan,firstBlock) //.then(function () {
                console.log('scan own dois complete')
            await scan_DoichainComplete(rescan,firstBlock) //.then(function () {
                console.log('scan whole blockchain dois complete')
        }
        else console.log("scan already running?")
            //})
        //})
    //}
    console.log('scan doichain finished. ')
    updateMeta();
}

/**
 * Check name_list (all name_id's of this node and try to find out
 * 1. Is it a requested DOI by us (address is not ours)
 * 2. Is it a received DOI by us (address is ours)
 * 3. Is it a confirmed DOI by us  (signature available)
 */
var scanRunning

const scan_DoichainOwn = async (rescan,firstBlock) => {

   // storeMeta(BLOCKCHAIN_SCAN_STATE, BLOCKCHAIN_SCAN_STATE_RUNNING)
    scanRunning = true
    //OptIns.remove({})
    let lastBlockHeight = getBlock(CONFIRM_CLIENT,firstBlock).height
    //we always rescan at this point no matter what if we got a new tx from mempool
    rescan = true
    if(rescan){
        lastBlockHeight = 0;
    }

    const ourRequestedDoisObj = Meta.findOne({key:BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS})
    const ourRequestedAndConfirmedDoisObj = Meta.findOne({key:BLOCKCHAIN_INFO_VAL_OURREQUESTEDANDCONFIRMEDDOIS})
    const ourConfirmedDoisObj = Meta.findOne({key:BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS})
    const ourReceivedDoisObj = Meta.findOne({key:BLOCKCHAIN_INFO_VAL_OURRECEIVEDDOIS})

    let ourRequestedDois = (ourRequestedDoisObj && !rescan)?ourRequestedDoisObj.value:0
    let ourRequestedAndConfirmedDois = (ourRequestedAndConfirmedDoisObj && !rescan)?ourRequestedAndConfirmedDoisObj.value:0
    let ourConfirmedDois = (ourConfirmedDoisObj && !rescan)?ourConfirmedDoisObj.value:0
    let ourReceivedDois = (ourReceivedDoisObj && !rescan)?ourReceivedDoisObj.value:0

    let wif
    const addressesByAccount  = Meta.findOne({key: "addresses_by_account"})
    if(addressesByAccount !== undefined){
            wif = getWif(CONFIRM_CLIENT, addressesByAccount.value[0]);
    }
    //1. get all our nameId's from the wallet
    //0. get all nameId's which ever touched this node
    const ourNameIds = nameList(CONFIRM_CLIENT)
    //2. loop through the names and get and store detail information in dApp
    //console.log('ourNameIds',ourNameIds)
    ourNameIds.forEach(function (nameId) {
        try {
            console.log("lastlastBlockHeight "+lastBlockHeight + " height:" + nameId.height, nameId.name)

            if (lastBlockHeight <= nameId.height) {
                const tx = getTransaction(CONFIRM_CLIENT, nameId.txid,true)

                if(nameId.name.startsWith(TX_VERIFIED_EMAIL_NAME_START)){ //TODO count own email verification requests and confirmations
                    console.log("seems to be a email verification name_op please count separately \n"+nameId.name,nameId.value?'confirmed':'not confirmed')
                }else {
                    const nameValue = JSON.parse(nameId.value)
                    const address = nameId.address
                    const thisNameId = nameId.name.substring(2)
                    const foundExistingOptIn = OptIns.findOne({nameId: thisNameId})

                    const isOurAddress = Meta.findOne({key: "addresses_by_account", value: {"$in": [address]}})

                    const hasSignature = nameValue.signature ? true : false
                    const hasDoiSignature = nameValue.doiSignature ? true : false

                    let domain

                    if (!hasDoiSignature && isOurAddress) {
                        let i = 1
                        wif = getWif(CONFIRM_CLIENT, addressesByAccount.value[0]);
                        while (!domain) {
                            const privateKey = getPrivateKeyFromWif({wif: wif});
                            try {
                                const publicKey = getPublicKeyOfOriginTxId(nameId.txid);
                                domain = decryptMessage({
                                    publicKey: publicKey,
                                    privateKey: privateKey,
                                    message: nameValue.from
                                });
                            } catch (e) {
                                //console.log(i,addressesByAccount.value.length)
                                if (i === addressesByAccount.value.length) break;
                                const thisAddress = addressesByAccount.value[i++]
                                wif = getWif(CONFIRM_CLIENT, thisAddress);
                                if (wif === undefined) break;
                            }
                        }
                        logMain('decrypted opt-in from dapp url:' + domain, ourConfirmedDois);
                    }


                    const optInFound = {
                        nameId: thisNameId,
                        address: address,
                        txId: nameId.txid,
                        createdAt: new Date(tx.time * 1000),
                        value: nameId.value,
                        status: (foundExistingOptIn && foundExistingOptIn.status) ? foundExistingOptIn.status : ['scanned'],
                        confirmations: tx.confirmations,
                        domain: domain
                    }

                    //validator
                    //if a nameId has our address, a signature and no doi signature its only received an not confirmed
                    //if a nameId has our address, a signature and a doi signature it was also confirmed by us.
                    //TODO this is not yet 100% correct in all cases e.g. when transaction send to another doicoin address for later use
                    //in this yase we must extend 'isOurAddress' in order to check name_history if this name was once our address
                    if (hasSignature && isOurAddress && !hasDoiSignature) {
                        ourReceivedDois++  //by validator
                        optInFound.receivedByValidator = true
                    }
                    if (hasDoiSignature && !isOurAddress) {
                        ourReceivedDois++ //one day we must have received it
                        ourConfirmedDois++
                        optInFound.confirmedByValidator = true
                    }
                    if (hasSignature && !isOurAddress && !hasDoiSignature) {
                        ourRequestedDois++ //send dApp reqestes
                        optInFound.ourRequestedDoi = true
                    }
                    if (!hasDoiSignature) {  //if nameId has no DOI signature in the own local record (name_list) but in the current blockchain (name_show) then it got confirmed
                        const nameShowDetail = JSON.parse(nameShow(CONFIRM_CLIENT, nameId.name).value)
                        if (nameShowDetail.doiSignature) {
                            optInFound.ourRequestedAndConfirmedDois = true
                            ourRequestedAndConfirmedDois++
                        }
                    }

                    if (hasDoiSignature) optInFound.confirmedAt = new Date(tx.blocktime * 1000);
                    //only update when its really the same not when it has a different txId (could be a DOI!)
                    if (foundExistingOptIn && optInFound.txId === foundExistingOptIn.txId) {
                        OptIns.update({nameId: thisNameId}, {$set: optInFound})
                    } else //if database was corrupted or only private key is available*/
                        OptIns.insert(optInFound)

                    // OptIns.upsert({nameId:nameId}, {$set: optInFound })
                    //3. count requested and confirmed DOI's
                    /*   console.log("ourRequestedDois", ourRequestedDois)
                       console.log("ourRequestedAndConfirmedDois", ourRequestedAndConfirmedDois)
                       console.log("ourReceivedDois", ourReceivedDois)
                       console.log("ourConfirmedDois", ourConfirmedDois) */

                    storeMeta(BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS, ourRequestedDois)
                    storeMeta(BLOCKCHAIN_INFO_VAL_OURREQUESTEDANDCONFIRMEDDOIS, ourRequestedAndConfirmedDois)
                    storeMeta(BLOCKCHAIN_INFO_VAL_OURRECEIVEDDOIS, ourReceivedDois)
                    storeMeta(BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS, ourConfirmedDois)
                }
            } //if lastblockheight

        }catch(exception){
            logError('problem while scanning nameId exception - not counting:'+exception,nameId)
            scanRunning=false
        }
    })//for each nameId
  //  storeMeta(BLOCKCHAIN_SCAN_STATE, BLOCKCHAIN_SCAN_STATE_STOPPED)
    scanRunning=false
}

const scan_DoichainComplete = async (rescan,firstBlock) => {

   // storeMeta(BLOCKCHAIN_SCAN_STATE, BLOCKCHAIN_SCAN_STATE_RUNNING)
    scanRunning=true
    const allRequestedDoisObj = Meta.findOne({key:BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS})
    const allConfirmedDoisObj = Meta.findOne({key:BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS})
    const allRequestedEmailVerificationsObj = Meta.findOne({key:BLOCKCHAIN_INFO_VAL_ALLREQUESTEDEMAILVERIFICATIONS})
    const allConfirmedEmailVerificationsObj = Meta.findOne({key:BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDEMAILVERIFICATIONS})

    let allRequestedDois = (allRequestedDoisObj && !rescan)?allRequestedDoisObj.value:0
    let allConfirmedDois = (allConfirmedDoisObj && !rescan)?allConfirmedDoisObj.value:0
    let allRequestedEmailVerifications = (allRequestedEmailVerificationsObj && !rescan)?allRequestedEmailVerificationsObj.value:0
    let allConfirmedEmailVerifications = (allConfirmedEmailVerificationsObj && !rescan)?allConfirmedEmailVerificationsObj.value:0

    //1. loop through blockchain starting with 0 ending with current blockheight
    const blockCount = getBlockCount(CONFIRM_CLIENT)

    let lastBlockHeight = getBlock(CONFIRM_CLIENT,firstBlock).height
    console.log("lastBlockHeight",lastBlockHeight)
    if(rescan){
        lastBlockHeight = 1;
    }

    for(let i=lastBlockHeight;i<=blockCount;i++) {
        //2. getblockhash height
        const blockHash = getBlockHash(CONFIRM_CLIENT,i);
        //3. getblock blockhash
        const block = getBlock(CONFIRM_CLIENT,blockHash);
        const txs = block.tx
        //loop through all transactions
        txs.forEach(function (tx) {
            if(rescan) checkNewTransaction(tx) //check also transactions
            try {
                const txRawContent = getRawTransaction(CONFIRM_CLIENT,tx)
                const outputs = txRawContent.vout
                if(outputs.length===0) console.log(outputs)
                outputs.forEach(function (thisOutput) {
                    if(thisOutput.scriptPubKey.nameOp &&
                        thisOutput.scriptPubKey.nameOp.op === "name_doi"
                        && thisOutput.scriptPubKey.nameOp.name !== undefined
                    ){
                        if(thisOutput.scriptPubKey){
                            if(thisOutput.scriptPubKey.nameOp.value){
                                const nameValue =  JSON.parse(thisOutput.scriptPubKey.nameOp.value)
                                const hasSignature = nameValue.signature?true:false
                                const hasDoiSignature = nameValue.doiSignature?true:false

                                if(hasDoiSignature) allConfirmedDois++
                                if(hasSignature && !hasDoiSignature)  allRequestedDois++
                            }else{ //doesn't have a value could be a email verify request
                                if(tx.scriptPubKey.nameOp.name.startsWith(TX_VERIFIED_EMAIL_NAME_START)){
                                    allRequestedEmailVerifications++
                                    if(tx.scriptPubKey.nameOp.value!==undefined) allConfirmedEmailVerifications++
                                }
                                console.log("BLOCKCHAIN_INFO_VAL_ALLREQUESTEDEMAILVERIFICATIONS",allRequestedEmailVerifications)
                                console.log("BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDEMAILVERIFICATIONS",allConfirmedEmailVerifications)
                            }
                        }else{
                           logError("doesn't have scriptPubKey",getRawTransaction(CONFIRM_CLIENT,tx))
                        }
                    }

                    storeMeta(BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS, allRequestedDois)
                    storeMeta(BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS, allConfirmedDois)
                    storeMeta(BLOCKCHAIN_INFO_VAL_ALLREQUESTEDEMAILVERIFICATIONS, allRequestedEmailVerifications)
                    storeMeta(BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDEMAILVERIFICATIONS, allConfirmedEmailVerifications)
                })

            }catch(exception){
                scanRunning=false
                logError('problem while scanning nameId exception - not counting tx:'+exception,getRawTransaction(CONFIRM_CLIENT,tx))
            }
        })
    }
    console.log(rescan,lastBlockHeight)
    scanRunning=false
    //storeMeta(BLOCKCHAIN_SCAN_STATE, BLOCKCHAIN_SCAN_STATE_STOPPED)
    return true
}

export default scan_Doichain;

