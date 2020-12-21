//import bitcore from "bitcore-doichain"
import bitcoin from "bitcoinjs-lib"
import doichain from "doichain"
import base58 from 'bs58'
import conv from 'binstring'
import addOptIn from '../../../../imports/modules/server/opt-ins/add_and_write_to_blockchain.js';
import updateOptInStatus from '../../../../imports/modules/server/opt-ins/update_status.js';
import getDoiMailData from '../../../../imports/modules/server/dapps/get_doi-mail-data.js';
import {logConfirm, logError, logSend} from "../../../../imports/startup/server/log-configuration";
import {
    DOI_EXPORT_ROUTE, DOI_NAME_SHOW, DOI_TESTFUNDING_ROUTE,
    DOICHAIN_BROADCAST_TX,
    DOICHAIN_GET_PUBLICKEY_BY_PUBLIC_DNS,
    DOICHAIN_LIST_TXS,
    DOICHAIN_LIST_UNSPENT, EMAIL_VERIFY_ROUTE,
    Api, DOI_FETCH_ROUTE, DOI_CONFIRMATION_NOTIFY_ROUTE
} from "../rest";
import exportDois from "../../../../imports/modules/server/dapps/export_dois";
import {OptIns} from "../../../../imports/api/opt-ins/opt-ins";
import {Transactions} from "../../../../imports/api/transactions/transactions";
import {OPT_IN_KEY, OPT_IN_KEY_TESTNET, } from "../../dns";
import {isRegtest, isTestnet} from "../../../../imports/startup/server/dapp-configuration";
import {SEND_CLIENT} from "../../../../imports/startup/server/doichain-configuration";
// import verifySignature from "../../../../imports/modules/server/doichain/verify_signature";
import getOptInKey from "../../../../imports/modules/server/dns/get_opt-in-key";
import {Meta} from "../../../../imports/api/meta/meta";
import {BLOCKCHAIN_INFO_VAL_BLOCKS} from "../../../../imports/startup/both/constants";
import getPublicKeyAndAddress from "../../../../imports/modules/server/doichain/get_publickey_and_address_by_domain";
import getSignature from "../../../../imports/modules/server/doichain/get_signature";
import encryptMessage from "../../../../imports/modules/server/doichain/encrypt_message";
import getPrivateKeyFromWif from "../../../../imports/modules/server/doichain/get_private-key_from_wif";
import {IPFS} from "../../ipfs";
import getAddress from "../../../../imports/modules/server/doichain/get_address";
import getPublicKeyOfOriginTxId, {getPublicKeyOfRawTransaction}
    from "../../../../imports/modules/server/doichain/getPublicKeyOfOriginTransaction";
import {verifySignature} from "doichain";
import {
    getRawTransaction,
    importAddress,
    listUnspent,
    sendRawTransaction,
    getNewAddress,
    validateAddress, getWif,
    getaddressesbylabel, generateToAddress, doichainSendToAddress,getBalance
} from "../../doichain";

/**
 * Verifies a sender email to belong to a certain wallet.
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
            let ourAddress = params.address

            if(!ourAddress) ourAddress = getaddressesbylabel(SEND_CLIENT)[0]
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

            if (senderEmail.constructor !== Array)
                emailsToVerify.push(senderEmail)
            try {
                let ipfsHashes = []
                emailsToVerify.forEach((our_sender_email) => {
                    console.log('preparing email for verification', our_sender_email)
                    const parts = our_sender_email.split("@");
                    const domain = parts[parts.length - 1];
                    const publicKeyAndAddressOfValidator = getPublicKeyAndAddress({domain: domain});

                    //1. create a signature with our_sender_email and our private_key, use it as our nameId
                    const signature = getSignature({
                        message: our_sender_email,
                        privateKey: getPrivateKeyFromWif({wif: ourPrivateKey})
                    })
                    console.log('ourPrivateKey',ourPrivateKey)
                    console.log('signature',signature)
                    const retSignature = verifySignature({data: our_sender_email,
                        publicKey:"0201bfa745b03a3e46fe014a219a7326dac611ac5b75e20c4cd69c012ae844a73e",
                        signature:signature})
                    logConfirm("retSignature "+retSignature);


                    console.log(ourAddress + ' signature for ' + our_sender_email, ourPrivateKey)
                    //2. store encrypted entry on ipfs and call name_doi on Doichain. Encrypted with PublicKey of validator
                    // - recipient address is public key gathered by domain name (dns) - responsible validator (Bob)
                    let nameId = "es/" + signature
                    const encryptedObjectAsString = encryptMessage({
                        message: JSON.stringify({
                            sender_mail: our_sender_email,
                            address: ourAddress
                        }),
                        publicKey: publicKeyAndAddressOfValidator.publicKey
                    })

                    const utxos = Async.runSync((done) => {
                        const nodeUtxos = listOurUnspent(retValidateAddress) //retValidateAddress
                        const offchainUtxos = Transactions.find({address:ourAddress,confirmations:0}).fetch() //TODO

                        console.log('got utxos from node for:' + retValidateAddress.address, nodeUtxos.length>0?nodeUtxos:offchainUtxos)

                            bitcore.getUTXOs4EmailVerificationRequest(
                                ourAddress, offchainUtxos, nodeUtxos).then((retUTXOs) => {
                                done(undefined, retUTXOs)
                            })

                    }).result

                    console.log('utxos', utxos)
                    if (utxos && utxos.utxos.length > 0) {
                        logSend('utxos found on Doichain node', utxos)
                        const our_data = Async.runSync((done) => {
                            addIPFS(encryptedObjectAsString).then((nameValue) => {
                                try {
                                    logSend('nameValue (cid) from ipfs is', nameValue)
                                    const destAddress = publicKeyAndAddressOfValidator.destAddress
                                    const changeAddress = ourAddress //TODO always create a new address (from a new privateky) for now just send change back to us.
                                    const DOICHAIN = {
                                        messagePrefix: '\x19Doichain Signed Message:\n',
                                        bech32: 'dc',
                                        bip32: {
                                            public: 0x0488b21e,
                                            private: 0x0499ade4
                                        },
                                        pubKeyHash: 52, //D=30 d=90 (52=N) https://en.bitcoin.it/wiki/List_of_address_prefixes
                                        scriptHash: 13,
                                        wif: 180, //???
                                    };

                                    const DOICHAIN_TESTNET = {
                                        messagePrefix: '\x19Doichain-Testnet Signed Message:\n',
                                        bech32: 'dt',
                                        bip32: {
                                            public: 0x043587cf,
                                            private: 0x04358394
                                        },
                                        pubKeyHash: 111, //D=30 d=90 (52=N) https://en.bitcoin.it/wiki/List_of_address_prefixes
                                        scriptHash: 196,
                                        wif: 239, //???
                                    };

                                    const DOICHAIN_REGTEST = {
                                        messagePrefix: '\x19Doichain-Testnet Signed Message:\n',
                                        bech32: 'dcrt',
                                        bip32: {
                                            public: 0x043587cf,
                                            private: 0x04358394
                                        },
                                        pubKeyHash: 111, //D=30 d=90 (52=N) https://en.bitcoin.it/wiki/List_of_address_prefixes
                                        scriptHash: 196,
                                        wif: 239, //???
                                    };

                                    //  const keyPair = bitcoin.ECPair.makeRandom({ network: DOICHAIN_TESTNET });
                                    //  console.log('keyPair',keyPair)
                                    //  const { address } = bitcoin.payments.p2pkh({
                                    //      pubkey: keyPair.publicKey,
                                    //      network: DOICHAIN,
                                    //  });
                                    //  console.log('adddress',address)
                                    const keypair = bitcoin.ECPair.fromWIF(ourPrivateKey, DOICHAIN_REGTEST);
                                    let nameIdPart2 = ''
                                    if (nameId.length > 57) //we have only space for 77 chars in the name in case its longer as in signatures put the rest into the value
                                    {
                                        nameIdPart2 = nameId.substring(57, nameId.length)
                                        nameId = nameId.substring(0, 57)
                                        nameValue = nameIdPart2 + ' ' + nameValue
                                    }
                                    const op_name = conv(nameId, {in: 'binary', out: 'hex'})
                                    let op_value = conv(nameValue, {in: 'binary', out: 'hex'})
                                    const op_address = base58.decode(destAddress).toString('hex').substr(2, 40);
                                    const opCodesStackScript = bitcoin.script.fromASM(
                                        `
                                              OP_10
                                              ${op_name}
                                              ${op_value}
                                              OP_2DROP
                                              OP_DROP
                                              OP_DUP
                                              OP_HASH160
                                              ${op_address}
                                              OP_EQUALVERIFY
                                              OP_CHECKSIG
                                        `.trim().replace(/\s+/g, ' '),
                                    )

                                    const input = utxos.utxos[0]
                                    const inputTxId = input.txid
                                    const n = (input.vout!==undefined)?input.vout:input.n //in case of unconfirmed (local) utxos we use n
                                    //const inputRawTx = getRawTransaction(SEND_CLIENT, inputTxId)
                                    //const scriptPubKey = input.scriptPubKey
                                    /*  console.log(
                                        inputRawTx.hex + "\n"+
                                        (input.amount * 100000000).toString(16) + "\n" +// value in satoshis (Int64LE) = 0x015f90 = 90000
                                        (scriptPubKey.length/2).toString(16) + "\n"+
                                        scriptPubKey +"\n"+
                                        // locktime
                                        '00000000') */
                                    const txb = new bitcoin.TransactionBuilder(DOICHAIN_REGTEST)
                                    txb.addInput(inputTxId, n)
                                    txb.addOutput(destAddress, bitcore.constants.EMAIL_VERIFICATION_FEE.satoshis)
                                    txb.addOutput(opCodesStackScript, bitcore.constants.NETWORK_FEE.satoshis)
                                    txb.addOutput(changeAddress, parseInt(((utxos.change) * 100000000)) - 50000)
                                    txb.setVersion(0x7100) //TODO add this to constants
                                    txb.sign(0, keypair)
                                    const txSignedSerialized = txb.build().toHex()
                                    /*
                                    const psbt = new bitcoin.Psbt({network: DOICHAIN_REGTEST})
                                        .addInput({
                                            hash: inputTxId, index: n,
                                            nonWitnessUtxo: Buffer.from(
                                                inputRawTx.hex +
                                                (input.amount * 100000000).toString(16) +  // value in satoshis (Int64LE) = 0x015f90 = 90000
                                                (scriptPubKey.length/2).toString(16) +
                                                scriptPubKey +
                                                // locktime
                                                '00000000',
                                                'hex')
                                        })
                                        .addOutput({
                                            address: destAddress,
                                            value: bitcore.constants.EMAIL_VERIFICATION_FEE.satoshis
                                        })
                                       .addOutput({
                                            script: opCodesStackScript,
                                            value: bitcore.constants.NETWORK_FEE.satoshis
                                        })
                                        .addOutput({
                                            address: changeAddress,
                                            value: parseInt(utxos.change) * 100000000 //-1500000
                                        })
                                        .signInput(0, keypair); //https://bitcoin.stackexchange.com/posts/86118/revisions
                                    psbt.setMaximumFeeRate(15000)

                                    psbt.finalizeAllInputs();
                                    const txSignedSerialized = psbt.extractTransaction().toHex()
                                      */
                                    // return

                                    nameDoiTx = sendRawTransaction(SEND_CLIENT, txSignedSerialized)
                                    logSend('got response from Doichain after sending txid', nameDoiTx)

                                    if (!nameDoiTx) {
                                        logError("problem with transaction no txid", nameDoiTx)
                                    }
                                    const txRaw = getRawTransaction(SEND_CLIENT, nameDoiTx)
                                    console.log('got raw tx', txRaw)
                                    // const utxosResponse = bitcore.getOffchainUTXOs(changeAddress, txRaw)
                                    //logSend('utxos from after sending rawTx for changeAddress' + changeAddress, utxosResponse)

                                    senderPublicKey = getPublicKeyOfOriginTxId(nameDoiTx)
                                    const sender = getAddress({publicKey: senderPublicKey});
                                    const our_data = {
                                        tx: nameDoiTx,
                                        nameId: nameId,
                                        nameValue: nameValue,
                                        senderAddress: sender,
                                        senderPublicKey: senderPublicKey
                                    }

                                    ipfsHashes.push(our_data)
                                    done(false, true);
                                } catch (e) {
                                    console.log(e)
                                    done(e, undefined);
                                }
                            }) //addIpfs
                        }).result
                        logSend('nameDoi sent to Doichain node to initiate email verification tx:', ipfsHashes)
                    }
                })
                return {
                    status: 'success', data: {
                        address: ourAddress,
                        ipfsHashes: ipfsHashes,
                        message: 'Email address sent to validator(s)'
                    }
                };
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


Api.addRoute(DOI_CONFIRMATION_NOTIFY_ROUTE, {authRequired: false}, {
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
/**
 * This url is called from the validator (bob) on the DOI requesting party (alice)
 */
Api.addRoute(DOI_FETCH_ROUTE, {authRequired: false}, {
  get: {
    action: function() {
      const params = this.queryParams;
      try {
          logSend(`REST API - ${DOI_FETCH_ROUTE} called by the validator to request email template`,JSON.stringify(params));
          const optIn = OptIns.findOne({nameId:params.name_id})
          logSend('found DOI in db',optIn)
          if (optIn && optIn.templateDataEncrypted!==undefined) { //if this was send from an offchain app - it contains a validatorPublicKey and templateDataEncrypted
              const validatorPublicKey = params.validatorPublicKey  //gets transmitted by the mobile Wallet - but could be also send via the parameter
              logSend('alice: getting public key of origin transaction for later use',optIn.txId)
              const recipientPublicKey = getPublicKeyOfOriginTxId(optIn.txId);  //TODO  //recipient here means peters public key (which funnily is not the recipient but the sender in this case (!!?!!)
              const templateDataEncrypted = optIn.templateDataEncrypted //TODO make sure its not getting too big and data are deleted after a certain time in any case and / or when template was picked up

              //check signature of the calling party (we allow only the responsible validator to ask for templateData
            //   if(!verifySignature({publicKey: validatorPublicKey, data: optIn.nameId, signature: params.signature})) throw "validator signature incorrect - template access denied";
            var publicKeyBuffer = Buffer.from(validatorPublicKey, 'hex')
            var keyPair = bitcoin.ECPair.fromPublicKey(publicKeyBuffer)
            logSend("publicKey",keyPair.publicKey.toString('hex'))
          //  logVerify('GLOBAL.DEFAULT_NETWORK',GLOBAL.DEFAULT_NETWORK)
            const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: GLOBAL.DEFAULT_NETWORK  });
              if(!verifySignature(optIn.nameId, address, params.signature)) throw "validator signature incorrect - template access denied";

              logSend("alice: return encrypted template data for nameId",{nameId:optIn.nameId});
              return {status: 'success',  encryptedData:templateDataEncrypted, publicKey: recipientPublicKey};
          }
          else{ //classic template request stored by a dApp
              const data = getDoiMailData(params);
              logSend('alice: got doi-mail-data (including template) returning to validator',{senderName: data.senderName, subject:data.subject, recipient:data.recipient, redirect:data.redirect});
              return {status: 'success', data};
          }
      } catch(error) {
        logError('alice: Error while getting DoiMailData',error);
        return {status: 'fail', error: error.message};
      }
    }
  }
});

Api.addRoute(DOI_TESTFUNDING_ROUTE, {
    get: {
        action: function() {
            const params = this.queryParams
            console.log('funding params:',params)
            try {
                if(!isRegtest() && !isTestnet()) return {status: 'fail', error: 'function not available'};
                //1. create new block (if regtest)
                const balance = getBalance(SEND_CLIENT)
                doichain.network.changeNetwork(isRegtest()?'regtest':'testnet')

               //TODO please enable again if(isRegtest() && balance<=1) generateBlock(SEND_CLIENT,1)
                if(isTestnet() && balance<=1)  return {status: 'fail', error: 'testnet coin faucet empty - please inform developers via telegram'};
                //2. create new keyPair and Address

                let ourAddress = params.address
                const ourAmount = params.amount?Number(params.amount):1
                let data = {address: ourAddress,amount:ourAmount}

                if(!params.address){
                    const keyPair = bitcoin.ECPair.makeRandom({ network: doichain.network.DEFAULT_NETWORK });
                    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey , network: doichain.network.DEFAULT_NETWORK,});
                    logSend('sending to address',address)
                    ourAddress = address
                    data.address = address
                    data.wif = keyPair.toWIF()
                    data.privateKey = keyPair.privateKey.toString('hex')
                    data.publicKey = keyPair.publicKey.toString('hex')
                }

                //3.
                importAddress(SEND_CLIENT,ourAddress,false)
                //4. fund privateKey
                logSend('sending to address',ourAddress)
                const txid = doichainSendToAddress(SEND_CLIENT,ourAddress,ourAmount)
                data.txid = txid
                if(isRegtest()){
                    const aliceAddress = getNewAddress(SEND_CLIENT, "")
                    const txid = generateToAddress(SEND_CLIENT,1,aliceAddress)
                    data.txid = txid //gets overwritten later.
                }          
                return {status: 'success', data};
            } catch(error) {
                logError('error while funding account in regtest',error);
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
            const domain = params.domain?params.domain:'undefined'
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
            console.log("DOICHAIN_LIST_TXS",params)
            let ourAddress = params.address?params.address:'undefined';
            const rescan =  params.rescan?JSON.parse(params.rescan):false
            console.log('rescan is:',rescan)
            try {
                const addressValidation = validateAddress(SEND_CLIENT,ourAddress);

                if(!addressValidation.ismine && !addressValidation.iswatchonly){
                    logSend('importing address' +
                        ' to Doichain node',ourAddress) //TODO only rescan if it is not a completely new address
                    importAddress(SEND_CLIENT,ourAddress,rescan)
                }

                if(addressValidation.ismine || addressValidation.iswatchonly){
                    const data = Transactions.find({address:ourAddress},{sort: { createdAt: -1 }}).fetch()
                    if(data)
                        return {status: 'success',data};
                    else
                        return {status: 'success',data:[]};
                }else
                    return {status: 'fail',data:[],error: "address not not valid or not imported yet"+ourAddress};

            } catch(error) {
                logError('error getting transactions for address '+ourAddress,error);
                return {status: 'fail',data:[],error: "address not valid or not imported yet: "+ourAddress};
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
                    importAddress(SEND_CLIENT,address,false)
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
            var tx = bitcoin.Transaction.fromHex(params.tx); //https://github.com/you21979/node-multisig-wallet/blob/master/lib/txdecoder.js
            //var txid = tx.getId();
            //is this a standard DOI coin transaction or a DOI request transaction?
            if((!params.nameId ||
                !params.templateDataEncrypted //||
                //!params.validatorPublicKey
                )
                && params.tx){
                logSend("sending single transaction",params.tx)

                try {
                    //1. First import the address so we get notified by the node for transactions
                    // if(params.address) importAddress(SEND_CLIENT,params.address,false)
                    //2 . Send transaction to node
                    const data = sendRawTransaction(SEND_CLIENT,params.tx)
                    console.info('txid from broadcasted tx was',data)
                    if(!data) logError("problem with transaction not txid",data)
                    //3. get raw transaction of created txid in mempool
                    let txRaw = getRawTransaction(SEND_CLIENT,data)
                    console.info('raw transaction received on Doichain', txRaw)

                    //4. take spent inputs from response and mark it in our wallet as spent

                    txRaw.vin.forEach(oldInputTx => {
                        const recordId = Transactions.update({txid:oldInputTx.txid, n:oldInputTx.vout}, {$set:{spent:true}})
                        console.log('set '+oldInputTx.txid+' n'+oldInputTx.vout+' as spent',recordId)
                    })

                    return {status: 'success', txRaw};
                } catch(error) {
                    logError('error broadcasting transaction to doichain network',error);
                    return {status: 'fail', error: error.message};
                }
            }
            else{
                const nameId = params.nameId // before we cut e away params.nameId.substring(2,params.nameId.length) //the nameId (~ primarykey under which the doi permission is stored on the blockchain) //TODO please ensure this is a nameID and doesn't store a TON of books to kill the validator database
                const tx = params.tx //serialized raw transactino to broadcast
                const templateDataEncrypted = params.templateDataEncrypted  //store this template together with the nameId //TODO security please ensure ddos attacks - cleanup or make sure template size can be limited in configuration
             //   const validatorPublicKey = params.validatorPublicKey //is needed to make sure the responsible validator alone can request the template
              //  logSend("storing validatorPublicKey:"+validatorPublicKey);
                try {
                    //1. send tx to doichain
                    const data = sendRawTransaction(SEND_CLIENT,tx)
                    const txRaw = getRawTransaction(SEND_CLIENT,data)
                    const publicKey = getPublicKeyOfRawTransaction(txRaw)
                    const txId = txRaw.txid
                    //2. store templateData together with nameId temporary in doichain dApps database
                    const optInId = OptIns.insert({
                        nameId:nameId,
                        txId: txId,
                        publicKey: publicKey,
                        status: ['received'],
                        templateDataEncrypted:templateDataEncrypted, //encrypted TemplateData
                   //     validatorPublicKey: validatorPublicKey
                    });
                    logSend("optInId stored:"+optInId);

                    txRaw.vin.forEach(oldInputTx => {
                        const recordId = Transactions.update({txid:oldInputTx.txid, n:oldInputTx.n}, {$set:{spent:true}})
                        console.log('set '+oldInputTx.txid+' n'+oldInputTx.n+' as spent',recordId)
                    })

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
