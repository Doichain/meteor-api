import { Api, DOI_FETCH_ROUTE, DOI_CONFIRMATION_NOTIFY_ROUTE } from '../rest.js';
import addOptIn from '../../../../imports/modules/server/opt-ins/add_and_write_to_blockchain.js';
import updateOptInStatus from '../../../../imports/modules/server/opt-ins/update_status.js';
import getDoiMailData from '../../../../imports/modules/server/dapps/get_doi-mail-data.js';
import {logError, logSend} from "../../../../imports/startup/server/log-configuration";
import {
    DOI_EXPORT_ROUTE,
    DOICHAIN_BROADCAST_TX,
    DOICHAIN_GET_PUBLICKEY_BY_PUBLIC_DNS, DOICHAIN_IMPORT_PUBKEY, DOICHAIN_LIST_TXS,
    DOICHAIN_LIST_UNSPENT
} from "../rest";
import exportDois from "../../../../imports/modules/server/dapps/export_dois";
import {OptIns} from "../../../../imports/api/opt-ins/opt-ins";
import {Roles} from "meteor/alanning:roles";
import {OPT_IN_KEY, OPT_IN_KEY_TESTNET, resolveTxt} from "../../dns";
import {isRegtest, isTestnet} from "../../../../imports/startup/server/dapp-configuration";
import {
    getRawTransaction,
    importAddress,
    listTransactions,
    listUnspent,
    sendRawTransaction,
    validateAddress
} from "../../doichain";
import {SEND_CLIENT} from "../../../../imports/startup/server/doichain-configuration";
import verifySignature from "../../../../imports/modules/server/doichain/verify_signature";
import getOptInKey from "../../../../imports/modules/server/dns/get_opt-in-key";
import getPublicKeyOfOriginTxId, {getPublicKeyOfRawTransaction}
    from "../../../../imports/modules/server/doichain/getPublicKeyOfOriginTransaction";

Api.addRoute(DOI_CONFIRMATION_NOTIFY_ROUTE, {
  post: {
    authRequired: true,
    action: function() {
      const qParams = this.queryParams;
      const bParams = this.bodyParams;
      let params = {}
      if(qParams !== undefined) params = {...qParams}
      if(bParams !== undefined) params = {...params, ...bParams}

      const uid = this.userId;

      if(!Roles.userIsInRole(uid, 'admin') || //if its not an admin always use uid as ownerId
          (Roles.userIsInRole(uid, 'admin') && (params["ownerId"]==null || params["ownerId"]==undefined))) {  //if its an admin only use uid in case no ownerId was given
          params["ownerId"] = uid;
      }

      logSend('parameter received from browser:',params);
      if(params.sender_mail.constructor === Array){ //this is a SOI with co-sponsors first email is main sponsor
          return prepareCoDOI(params);
      }else{
         return prepareAdd(params);
      }
    }
  },
  put: {
    authRequired: false,
    action: function() {
      const qParams = this.queryParams;
      const bParams = this.bodyParams;

      logSend('qParams:',qParams);
      logSend('bParams:',bParams);

      let params = {}
      if(qParams !== undefined) params = {...qParams}
      if(bParams !== undefined) params = {...params, ...bParams}
      try {
        const val = updateOptInStatus(params);
        logSend('opt-In status updated',val);
        return {status: 'success', data: {message: 'Opt-In status updated'}};
      } catch(error) {
        return {statusCode: 500, body: {status: 'fail', message: error.message}};
      }
    }
  }
});

Api.addRoute(DOI_FETCH_ROUTE, {authRequired: false}, {
  get: {
    action: function() {
      const params = this.queryParams;
      try {
          logSend('REST API - ${DOI_FETCH_ROUTE} called by the validator to request email template',JSON.stringify(params));
          const optIn = OptIns.findOne({nameId:params.name_id})
          logSend('found DOI in db',optIn)
          if (optIn.templateDataEncrypted!==undefined) { //if this was send from an offchain app - it contains a validatorPublicKey and templateDataEncrypted
              const validatorPublicKey = optIn.validatorPublicKey
              console.log('getting public key of origin transaction for later use',optIn.txId)
              const recipientPublicKey = getPublicKeyOfOriginTxId(optIn.txId);  //TODO  //recipient here means peters public key (which funnily is not the recipient but the sender in this case (!!?!!)
              const templateDataEncrypted = optIn.templateDataEncrypted //TODO make sure its not getting too big and data are deleted after a certain time in any case and / or when template was picked up

              //check signature of the calling party (we allow only the repsonsible validator to ask for templateData
              if(!verifySignature({publicKey: validatorPublicKey, data: optIn.nameId, signature: params.signature})) throw "validator signature incorrect - template access denied";

              logSend("return encrypted template data for nameId",{nameId:optIn.nameId});
              return {status: 'success',  encryptedData:templateDataEncrypted, publicKey: recipientPublicKey};
          }
          else{ //classic template request stored by a dApp
              const data = getDoiMailData(params);
              logSend('got doi-mail-data (including template) returning to validator',{subject:data.subject, recipient:data.recipient, redirect:data.redirect});
              return {status: 'success', data};
          }
      } catch(error) {
        logError('error while getting DoiMailData',error);
        return {status: 'fail', error: error.message};
      }
    }
  }
});

Api.addRoute(DOI_EXPORT_ROUTE, {
    get: {
        authRequired: true,
        //roleRequired: ['admin'],
        action: function() {
            let params = this.queryParams;
            const uid = this.userId;
            if(!Roles.userIsInRole(uid, 'admin')){
                params = {userid:uid,role:'user'};
            }
            else{
                params = {...params,role:'admin'}
            }
            try {
                logSend('rest api - DOI_EXPORT_ROUTE called',JSON.stringify(params));
                const data = exportDois(params);
                logSend('got dois from database',JSON.stringify(data));
                return {status: 'success', data};
            } catch(error) {
                logError('error while exporting confirmed dois',error);
                return {status: 'fail', error: error.message};
            }
        }
    }
});

/**
 * Makes a DNS request and requests for the doichain public-key for the given domain and network
 * Method: GET
 * Params:
 * - domain  (e.g. your-domain.org)
 *  Example: https://localhost:3000/api/v1/getpublickeybypublicdns?domain=le-space.de
 */
Api.addRoute(DOICHAIN_GET_PUBLICKEY_BY_PUBLIC_DNS, {
    get: {
        authRequired: false,
        action: function() {
            const params = this.queryParams;
            const domain = params.domain

            let ourOPT_IN_KEY=OPT_IN_KEY;
            if(isRegtest() || isTestnet()){
                ourOPT_IN_KEY = OPT_IN_KEY_TESTNET;
            }
            try {
                const data = getOptInKey({domain:domain})
                return {status: 'success', data};
            } catch(error) {
                logError('requesting public key from public dns',error);
                return {status: 'fail', error: error.message};
            }
        }
    }
});

/**
 * Requests all transaction of a Doichain address (watchOnly or not)
 */
Api.addRoute(DOICHAIN_LIST_TXS, {
    get: {
        authRequired: false,
        action: function() {
            const params = this.queryParams;
            const ourAddress = params.address;
            try {
                console.log('list transactions called - all transactions of this wallet used')
                const account = ourAddress
                if(account || account!=''){


                const data = listTransactions(SEND_CLIENT,account).filter(function (el) {
                  /*  const txid = el.txid
                    //console.log('getting txis of ',txid)
                    //get inputs and outputs to check if inputs and/or outputs belong to us
                      const rawTx = getRawTransaction(SEND_CLIENT,txid);
                       //console.log('trawTx is',rawTx)
                        rawTx.vin.forEach( (input) => {
                           //console.log('checking input with txid',input.txid)
                           if(input.txid){ //input could be coinbase then it doesn't have a txid
                           // console.log('input.txid',input.txid)
                               getRawTransaction(SEND_CLIENT,input.txid).vout.forEach((output)=>{
                                 //  console.log("input output.value",output.value)
                                 //  console.log("input output.scriptPubKey.addresses",output.scriptPubKey.addresses)
                                   const outputAdresses = output.scriptPubKey.addresses
                                  // console.log("outputAdresses inputs",outputAdresses)
                                   if(outputAdresses){
                                       for(let i = 0;i<outputAdresses.length;i++){
                                           if(outputAdresses[i]===ourAddress && el.category==='receive'){
                                               console.log("--->was our input! returning",rawTx.vin)
                                             //  el.ourInput[input.txid] = {output: output}
                                               el.ourInput = [txid, {output: output}]
                                           }
                                       }
                                   }
                               })
                           }
                        })

                    rawTx.vout.forEach((output) => {
                        //console.log("output output.value",output.value)
                        //console.log("output output.scriptPubKey.addresses",output.scriptPubKey.addresses)
                       if(output.scriptPubKey && output.scriptPubKey.addresses){
                           // console.log('checking output',output.scriptPubKey.addresses)
                            const outputAdresses = output.scriptPubKey.addresses
                            const addressesCount = outputAdresses.length
                            //console.log("outputAdresses outputs",outputAdresses)
                            for(var i = 0;i<addressesCount;i++){
                                if(outputAdresses[i]===ourAddress && el.category==='send'){
                                    console.log("--->was our output! returning",rawTx.vout)
                                  //  el.ourOutput = true
                                    el.ourInput = [txid, {output: output}]
                                }
                            }
                        }
                    })

                    return el.address === ourAddress && (el.ourInput || el.ourOutput)*/
                    return true
                });
                console.log('data:',data)
                return {status: 'success',data};
                }else   return {status: 'success',data:[]};

            } catch(error) {
                logError('error getting transactions for address '+ourAddress,error);
                return {status: 'fail', error: error.message};
            }

        }
    }
})


/**
 * Requests unspent transactions (utxo) from a given address
 * 1. Imports the given address into the nodes wallet for "watchonly" if not already imported.
 * 2. TODO only import if address is a verified address (send a signature of the email address together with the address + a publicKey)
 * Method: GET
 * Params: doichain address: address
 * Example: https://localhost:3000/api/v1/listunspent?address=mj1FQKeXxdUrWJkrRti8iy2utHqarcrSoB
 */
Api.addRoute(DOICHAIN_LIST_UNSPENT, {
    get: {
        authRequired: false,
        action: function() {
            const params = this.queryParams;
            const address = params.address;

            try {
                const addressValidation = validateAddress(SEND_CLIENT,address);
                console.log("addressValidation",addressValidation)
                if(!addressValidation.isvalid){
                    logError('doichain address not valid: '+address);
                    return {status: 'fail', error: 'doichain address not valid: '+address};
                }

                if(addressValidation.isvalid && (addressValidation.ismine || addressValidation.iswatchonly)){
                    const data = listUnspent(SEND_CLIENT,address)
                    return {status: 'success',ismine:addressValidation.ismine, iswatchonly: addressValidation.iswatchonly, data};
                }

                if(addressValidation.isvalid && (!addressValidation.ismine && addressValidation.iswatchonly)){
                    const data = listUnspent(SEND_CLIENT,address)
                    return {status: 'success',ismine:addressValidation.ismine, iswatchonly: addressValidation.iswatchonly, data};
                }

                if(addressValidation.isvalid && (!addressValidation.ismine && !addressValidation.iswatchonly)){
                    importAddress(SEND_CLIENT,address)
                    const data = listUnspent(SEND_CLIENT,address)
                    return {status: 'address imported sucessfully',ismineold:addressValidation.ismine,ismine:true, iswatchonly: addressValidation.iswatchonly, data};
                }

            } catch(error) {
                logError('error getting utxo from adddress '+address,error);
                return {status: 'fail', error: error.message};
            }
        }
    }
});

/**
 * Broadcasts a serialized raw transaction to the Doichain network, stores templateData on the Doichain node.
 * Params: serialized transaction hash
 * Method: POST
 * Return: tx - the transaction id, utxo (the unconfirmed - unspent transaction of this tx)
 * Example:mExample: https://localhost:3000/api/v1/sendrawtransaction
 */
Api.addRoute(DOICHAIN_BROADCAST_TX, {
    post: {
        authRequired: false,
        action: function() {
            const params = this.bodyParams;
            //is this a standard DOI coin transaction or a DOI request transaction?
            if((!params.nameId ||
                !params.templateDataEncrypted ||
                !params.validatorPublicKey)
                && params.tx){
                logSend("sending single transaction",params.tx)

                try {
                    const data = sendRawTransaction(SEND_CLIENT,params.tx)
                    //logSend(data)
                    if(!data) logError("problem with transaction not txid",data)
                    const txRaw = getRawTransaction(SEND_CLIENT,data)
                    //if(txRaw)data.txRaw = txRaw
                    logSend(txRaw)
                    return {status: 'success', txRaw};
                } catch(error) {
                    logError('error broadcasting transaction to doichain network',error);
                    return {status: 'fail', error: error.message};
                }
            }
            else{
                const nameid = params.nameId.substring(2,params.nameId.length) //the nameId (~ primarykey under which the doi permission is stored on the blockchain) //TODO please ensure this is a nameID and doesn't store a TON of books to kill the validator database
                const tx = params.tx //serialized raw transactino to broadcast
                const templateDataEncrypted = params.templateDataEncrypted  //store this template together with the nameId //TODO security please ensure ddos attacks - cleanup or make sure template size can be limited in configuration
                const validatorPublicKey = params.validatorPublicKey //is needed to make sure the responsible validator alone can request the template //TODO please validate if this is a publickey (and not a ton of books)
                logSend("storing validatorPublicKey:"+validatorPublicKey);
                try {
                    //1. send tx to doichain
                    const data = sendRawTransaction(SEND_CLIENT,tx)
                    const txRaw = getRawTransaction(SEND_CLIENT,data)
                    const publicKey = getPublicKeyOfRawTransaction(txRaw)
                    const txId = txRaw.txid
                    //2. store templateData together with nameId temporary in doichain dApps database
                    OptIns.insert({
                        nameId:nameid,
                        txId: txId,
                        publicKey: publicKey,
                        status: ['received'],
                        templateDataEncrypted:templateDataEncrypted, //encrypted TemplateData
                        validatorPublicKey: validatorPublicKey
                    });

                    return {status: 'success', txRaw};
                } catch(error) {
                    logError('error broadcasting transaction to doichain network',error);
                    return {status: 'fail', error: error.message};
                }
            }
        }
    }
});

function prepareCoDOI(params){
    logSend('is array ',params.sender_mail);
    const senders = params.sender_mail;
    const recipient_mail = params.recipient_mail;
    const data = params.data;
    const ownerID = params.ownerId;

    let currentOptInId;
    let retResponse = [];
    let master_doi;
    senders.forEach((sender,index) => {

        const ret_response = prepareAdd({sender_mail:sender,recipient_mail:recipient_mail,data:data, master_doi:master_doi, index: index, ownerId:ownerID});
        logSend('CoDOI:',ret_response);
        if(ret_response.status === undefined || ret_response.status==="failed") throw "could not add co-opt-in";
        retResponse.push(ret_response);
        currentOptInId = ret_response.data.id;

        if(index===0)
        {
            logSend('main sponsor optInId:',currentOptInId);
            const optIn = OptIns.findOne({_id: currentOptInId});
            master_doi = optIn.nameId;
            logSend('main sponsor nameId:',master_doi);
        }

    });

    logSend(retResponse);

    return retResponse;
}

function prepareAdd(params){

    try {
        const val = addOptIn(params);
        logSend('opt-In added ID:',val);
        return {status: 'success', data: {id: val, status: 'success', message: 'Opt-In added.'}};
    } catch(error) {
        return {statusCode: 500, body: {status: 'fail', message: error.message}};
    }
}
