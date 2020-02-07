import bitcore from "bitcore-doichain";
import { Api, DOI_FETCH_ROUTE, DOI_CONFIRMATION_NOTIFY_ROUTE } from '../rest.js';
import addOptIn from '../../../../imports/modules/server/opt-ins/add_and_write_to_blockchain.js';
import updateOptInStatus from '../../../../imports/modules/server/opt-ins/update_status.js';
import getDoiMailData from '../../../../imports/modules/server/dapps/get_doi-mail-data.js';
import {logError, logSend} from "../../../../imports/startup/server/log-configuration";
import {
    DOI_EXPORT_ROUTE, DOI_NAME_SHOW,
    DOICHAIN_BROADCAST_TX,
    DOICHAIN_GET_PUBLICKEY_BY_PUBLIC_DNS,
    DOICHAIN_LIST_TXS,
    DOICHAIN_LIST_UNSPENT, EMAIL_VERIFY_ROUTE
} from "../rest";
import exportDois from "../../../../imports/modules/server/dapps/export_dois";
import {OptIns} from "../../../../imports/api/opt-ins/opt-ins";
import {Transactions} from "../../../../imports/api/transactions/transactions";
import {OPT_IN_KEY, OPT_IN_KEY_TESTNET, } from "../../dns";
import {isRegtest, isTestnet} from "../../../../imports/startup/server/dapp-configuration";
import {SEND_CLIENT} from "../../../../imports/startup/server/doichain-configuration";
import verifySignature from "../../../../imports/modules/server/doichain/verify_signature";
import getOptInKey from "../../../../imports/modules/server/dns/get_opt-in-key";
import {Meta} from "../../../../imports/api/meta/meta";
import {BLOCKCHAIN_INFO_VAL_BLOCKS} from "../../../../imports/startup/both/constants";
import getPublicKeyAndAddress from "../../../../imports/modules/server/doichain/get_publickey_and_address_by_domain";
import getSignature from "../../../../imports/modules/server/doichain/get_signature";
import {nameShow} from "../../doichain"
import encryptMessage from "../../../../imports/modules/server/doichain/encrypt_message";
import getPrivateKeyFromWif from "../../../../imports/modules/server/doichain/get_private-key_from_wif";
import {IPFS} from "../../ipfs";
import getAddress from "../../../../imports/modules/server/doichain/get_address";
import getPublicKeyOfOriginTxId, {getPublicKeyOfRawTransaction}
    from "../../../../imports/modules/server/doichain/getPublicKeyOfOriginTransaction";
import {
    getRawTransaction,
    importAddress,
    listTransactions,
    listUnspent, nameDoi,
    sendRawTransaction,
    validateAddress,getWif
} from "../../doichain";

/**
 * Verifies and sender email to belong to a certain wallet.
 * Params:
 * - sender_email: the sender email address to be verified
 * - address (optional): a Doichain address of this wallet (if undefined) we use the first entry in the wallet (can be wrong!)
 */
Api.addRoute(EMAIL_VERIFY_ROUTE, {
        post: {
        authRequired: true,
        action: function() {
            const qParams = this.queryParams;
            const bParams = this.bodyParams;
            let params = {}
            if(qParams !== undefined) params = {...qParams}
            if(bParams !== undefined) params = {...params, ...bParams}
            logSend('parameter received from rpc client:',params);
            const senderEmail = params.sender_mail
            const ourAddress = params.address

            const retValidateAddress = validateAddress(SEND_CLIENT,ourAddress)

            retValidateAddress.ismine?console.log("retValidateAddress.ismine:"+retValidateAddress.ismine):retValidateAddress
            retValidateAddress.isvalid?console.log("retValidateAddress.valid:"+retValidateAddress.isvalid):'not valid'

            if(!retValidateAddress.isvalid || !retValidateAddress.ismine){
                return {statusCode: 500, body: {
                        status: 'fail',
                        message: 'address: '+ourAddress+
                            ' valid: '+ retValidateAddress.isvalid+
                            ' mine: '+retValidateAddress.ismine}};
            }
            const ourPrivateKey = getWif(SEND_CLIENT,ourAddress) //TODO this works only when we use the Doichain Node wallet in case we use mobile wallet this cannot work
            const ourPublicKey = retValidateAddress.pubkey

            let emailsToVerify = []
            let nameDoiTx = ''
            let senderPublicKey = ''

            if(senderEmail.constructor !== Array)
                emailsToVerify.push(senderEmail)
                try {
                    let ipfsHashes = []
                    emailsToVerify.forEach((our_sender_email) => {
                        console.log('preparing email for verification', our_sender_email)
                        const parts = our_sender_email.split("@");
                        const domain = parts[parts.length - 1];
                        const publicKeyAndAddressOfValidator = getPublicKeyAndAddress({domain: domain});

                        //1. create a signature with our_sender_email and our private_key, use it as our nameId
                        const signature =  getSignature({
                                message: our_sender_email,
                                privateKey:getPrivateKeyFromWif({wif:ourPrivateKey})
                            })
                        console.log(ourAddress+' signature for '+our_sender_email,ourPrivateKey)
                        //2. store encrypted entry on ipfs and call name_doi on Doichain. Encrypted with PublicKey of validator
                        // - recipient address is public key gathered by domain name (dns) - responsible validator (Bob)
                        const nameId = "es/" + signature
                        const encryptedObjectAsString =  encryptMessage({
                                message: JSON.stringify({
                                    sender_mail:our_sender_email,
                                    address: ourAddress
                                }),
                                publicKey: publicKeyAndAddressOfValidator.publicKey})

                        //TODO 1. when executing mameDoi make sure you send it from the above stated Doichain address otherwise things get confusing.
                        const utxos = Async.runSync((done) => {
                            const nodeUtxos = listOurUnspent(retValidateAddress) //retValidateAddress
                            console.log('got utxos from node for'+retValidateAddress,nodeUtxos)
                            bitcore.getUTXOs4EmailVerificationRequest(
                                ourAddress,undefined,nodeUtxos).then((retUTXOs) => {
                                    done(undefined, retUTXOs)
                                }) //TODO we have no offchain-utxos here so far, but every transaction creates change we need to reuse in case we want another transacition before next block
                        }).result
                        if(!utxos)
                            return {statusCode: 500, body: {status: 'fail', message: 'insufficient funds or wait for next block'}};
                        logSend('utxos found on Doichain node',utxos)
                        const our_data = Async.runSync((done) => {

                            addIPFS(encryptedObjectAsString).then((nameValue)=>{
                                const destAddress = publicKeyAndAddressOfValidator.destAddress
                                const changeAddress = ourAddress //TODO always create a new address (from a new privateky) for now just send change back to us.

                                //TODO createRawDoichainTX is nice but not nice enough, here we don't want a DOI-Request TX we want a EmailVerification TX
                                const txSignedSerialized = bitcore.createRawDoichainTX(
                                    nameId,
                                    nameValue,
                                    destAddress,
                                    changeAddress,
                                    ourPrivateKey,
                                    utxos, //here's the necessary utxos and the balance and change included
                                    bitcore.constants.NETWORK_FEE.satoshis, //for storing this record
                                    bitcore.constants.EMAIL_VERIFICATION_FEE.satoshis //for validator bob (0.01), to validate (reward) and store (0.01) the email verification
                                )
                                logSend('created signed doichain transaction for email verifcation',txSignedSerialized)
                                try {
                                    nameDoiTx = sendRawTransaction(SEND_CLIENT,txSignedSerialized)
                                    logSend('got response from Doichain after sending txid',nameDoiTx)

                                    if(!nameDoiTx) logError("problem with transaction no txid",nameDoiTx)
                                    const txRaw = getRawTransaction(SEND_CLIENT,nameDoiTx)
                                    console.log('got raw tx',txRaw)
                                    const utxosResponse = bitcore.getOffchainUTXOs(changeAddress,txRaw)
                                    logSend('utxos from after sending rawTx for changeAddress'+changeAddress,utxosResponse)

                                    senderPublicKey = getPublicKeyOfOriginTxId(nameDoiTx)
                                    const sender = getAddress({publicKey: senderPublicKey});
                                    const our_data =  {
                                        tx:nameDoiTx,
                                        nameId:nameId,
                                        nameValue:nameValue,
                                        senderAddress:sender,
                                        senderPublicKey: senderPublicKey
                                    }

                                    ipfsHashes.push(our_data)
                                    done(false, true);
                                }catch (e) {
                                    console.log(e)
                                    done(e, undefined);
                                }
                            })
                        }).result
                        logSend('nameDoi sent to Doichain node to initiate email verification tx:',ipfsHashes)
                    })
                    return {status: 'success', data: {
                            ipfsHashes: ipfsHashes,
                            status: 'success',
                            message: 'Email address sent to validator(s)'}};
                } catch (error) {
                    return {statusCode: 500, body: {status: 'fail', message: error.message}};
                }
        } //action
    }
});

/**
 * Adds data to IPFS
 *
 * @param ipfsData
 * @returns {Promise<string>}
 */
const addIPFS = async (ipfsData) => {

    let data
    await (async function() {
        const lite = await IPFS()
        logSend('adding encrypted object ipfsData')
        const source = [{
            path: 'nameId',
            content: ipfsData,
        }]
        data =  await lite.addFile(source)
        logSend('added file with CID:',data.cid.toString())
        logSend(data.cid.toString())
        let retdata = await lite.getFile(data.cid)
        logSend("returned file content from ifps",retdata.toString())

       // setTimeout(() => {lite.stop()}, 10000)
    })()
    return data.cid.toString()
}

Api.addRoute(DOI_NAME_SHOW, {authRequired: false}, {
    get: {
        action: function() {
            const params = this.queryParams;
            const nameId = decodeURIComponent(params.nameId);
            logSend('name_show called with nameId',nameId)

            try {
                const val = Transactions.findOne({"nameId":nameId})
                //const val = nameShow(SEND_CLIENT,nameId)
                logSend('returned',val);
                if(val)
                    return {status: 'success', data: {val}};
                else
                    return {statusCode: 500, body: {status: 'fail', message: 'nameId not found in local transaction list'}};
            } catch(error) {
                return {statusCode: 500, body: {status: 'fail', message: error.message}};
            }
        }
    }}
)


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
            if(isRegtest() || isTestnet())  ourOPT_IN_KEY = OPT_IN_KEY_TESTNET;

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
                console.log('list transactions for address',ourAddress)
                const data = Transactions.find({address:ourAddress},{sort: { createdAt: -1 }}).fetch()
                console.log('data:',data)
                if(data)
                    return {status: 'success',data};
                else
                    return {status: 'success',data:[]};

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
 * 3. TODO remark to 2. - interesting conecept, but in order to verify an email somebody else must pay the fee for it, if this wallet can't list unspents it cannot spend either! (!)
 * Method: GET
 * Params: doichain address: address
 * Example: https://localhost:3000/api/v1/listunspent?address=mj1FQKeXxdUrWJkrRti8iy2utHqarcrSoB
 */
Api.addRoute(DOICHAIN_LIST_UNSPENT, {
    get: {
        authRequired: false,
        action: function() {
            const params = this.queryParams
            const address = params.address

            try {
                const addressValidation = validateAddress(SEND_CLIENT,address);

                if(!addressValidation.isvalid){
                    logError('doichain address not valid: '+address);
                    return {status: 'fail', error: 'doichain address not valid: '+address};
                }

                if(addressValidation.isvalid && (addressValidation.ismine || addressValidation.iswatchonly))
                    return listOurUnspent(addressValidation)
                if(addressValidation.isvalid && (!addressValidation.ismine && addressValidation.iswatchonly))
                    return listOurUnspent(addressValidation)
                if(addressValidation.isvalid && (!addressValidation.ismine && !addressValidation.iswatchonly)){
                    importAddress(SEND_CLIENT,address)
                    return listOurUnspent(addressValidation,'address imported sucessfully')
                }
            } catch(error) {
                logError('error getting utxo from adddress '+address,error)
                return {status: 'fail', error: error.message}
            }
        }
    }
});

const listOurUnspent = (addressValidation,msg) =>{

    const blocksCount = Meta.findOne({key: BLOCKCHAIN_INFO_VAL_BLOCKS}).value
    console.log(blocksCount)
    let data = (!addressValidation)?listUnspent(SEND_CLIENT):listUnspent(SEND_CLIENT,addressValidation.address)
    const retVale =
        {status: 'success',
            msg: msg,
            block: blocksCount,
            ismine:addressValidation?addressValidation.ismine:true,
            iswatchonly: addressValidation?addressValidation.iswatchonly:true,
            data}

    return retVale;
}

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
    logSend('prepare CoDoi because got array ',params.sender_mail);
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
