import {Meteor} from 'meteor/meteor'
import SimpleSchema from 'simpl-schema'
const bitcoin = require('bitcoinjs-lib')

import {DOI_FETCH_ROUTE, DOI_CONFIRMATION_ROUTE, API_PATH, VERSION} from '../../../../server/api/rest/rest.js'
import {getUrl} from '../../../startup/server/dapp-configuration.js'
import {CONFIRM_CLIENT, CONFIRM_ADDRESS} from '../../../startup/server/doichain-configuration.js'
import {getHttpGET} from '../../../../server/api/http.js'
import {OptIns} from '../../../../imports/api/opt-ins/opt-ins.js'
import parseTemplate from '../emails/parse_template.js'
import generateDoiToken from '../opt-ins/generate_doi-token.js'
import generateDoiHash from '../emails/generate_doi-hash.js'
import addOptIn from '../opt-ins/add.js'
import addSendMailJob from '../jobs/add_send_mail.js'
import {logConfirm, logError} from "../../../startup/server/log-configuration"
import updateDoichainEntry from "../opt-ins/update_doichain_entry"
import decryptMessage from "../doichain/decrypt_message";
import {getRawTransaction, getWif, validateAddress} from "../../../../server/api/doichain";
import getPublicKeyOfOriginTxId from "../doichain/getPublicKeyOfOriginTransaction";
//import getPrivateKeyFromWif from "../doichain/get_private-key_from_wif";
import {network, getPrivateKeyFromWif, getSignature, decryptStandardECIES} from "doichain"
import {isRegtest} from "../../../startup/server/dapp-configuration";
import {getSettings} from "meteor/doichain:settings";

const FetchDoiMailDataSchema = new SimpleSchema({
    name: {
        type: String
    },
    domain: {
        type: String
    },
    txId: {
        type: String
    },
    validatorPublicKey : {
        type: String,
        optional: true
    }
});

/**
 *
 * Is called in validator when a DOI transaction hits the dApp. (validator - Bob)
 *  - requests the template from the dApp in send mode (Alice) (getHttpGet)
 *
 * @param data
 */
const fetchDoiMailData = (data) => {
    const ourData = data;
    try {
        console.log('Bob: fetchDoiMailData params',data)
        FetchDoiMailDataSchema.validate(ourData);
        if(isRegtest()) ourData.domain = "http://localhost:3000/"

        const url = ourData.domain + API_PATH + VERSION + "/" + DOI_FETCH_ROUTE

        const rawTransaction = getRawTransaction(CONFIRM_CLIENT,ourData.txId)
        let address = ''
        let validatorPublicKey = ''
        rawTransaction.vout.forEach(function (output) {
            if(!address){
                const our_address = output.scriptPubKey.addresses[0]
                const validatAddress = validateAddress(CONFIRM_CLIENT,our_address)
                if(validatAddress.ismine){ //TODO please validate more efficiently using own internal publicKeySet
                    address = our_address
                    validatorPublicKey  = validatAddress.pubkey
                }
            }
        })

        //we sign the nameId of this permission request with the correct privateKey so the requested can see it was us and not somebody else
        //const privateKey = getWif(CONFIRM_CLIENT,address)  //we need the correct address otherwise - we might sign with the wrong privatKey
        //const signature = Message(ourData.name).sign(new bitcore.PrivateKey.fromString(privateKey));
        console.log('address',address)
        const privateKeyWif = getWif(CONFIRM_CLIENT,address)
        console.log('privateKeyWif',privateKeyWif)
       // const privateKey = getPrivateKeyFromWif(privateKeyWif)
        const keyPair = bitcoin.ECPair.fromWIF(privateKeyWif,GLOBAL.DEFAULT_NETWORK)
        const signature = getSignature(ourData.name,keyPair)
        if(!signature){
            const error = 'Could not create signature with configured CONFIRM_ADDRESS in settings. Wrong address or missing private key'
            OptIns.upsert({nameId: ourData.name},{$push:{status:'error', error:error}})
            throw error;
        }

        const query = "name_id=" + encodeURIComponent(ourData.name) + "&signature=" +
            encodeURIComponent(signature)+"&validatorPublicKey=" +
            encodeURIComponent(validatorPublicKey);
        logConfirm('calling for doi-email-template:' + url + ' query:', query);

        const response = getHttpGET(url, query);
        if (response === undefined || (response.data === undefined && response.encryptedData === undefined)) throw "Bad response";
        let responseData
        let decryptedData
        if(response.data) responseData = response.data
        if(response.data.encryptedData){  //in case data coming from a mobile client (not from a dApp)
            const privateKey = getPrivateKeyFromWif(privateKeyWif);
            const decryptedMessage =  decryptStandardECIES(privateKey,response.data.encryptedData) //decryptMessage({publicKey: publicKey, privateKey:privateKey, message: response.data.encryptedData})
            decryptedData = JSON.parse(decryptedMessage)  //TODO getWif is not good here... we need to ask the correct address!
            responseData.data = decryptedData
        }

        logConfirm('response while getting getting email template from URL:', response.data.status);

        if (responseData.status !== "success") {
            if (responseData.error === undefined){
                const error = "Bad response"
                OptIns.upsert({nameId: ourData.name},{$push:{status:'error', error:error}})
                throw error;
            }
            if (responseData.error.includes("Opt-In not found")) {
                //Do nothing and don't throw error so job is done
                const error = 'bad response from send dApp:'
                OptIns.upsert({nameId: ourData.name},{$push:{status:'error', error:error+"\n"+responseData.error}})
                logError('bad response from send dApp', responseData.error);
                return;
            }
            OptIns.upsert({nameId: ourData.name},{$push:{status:'error', error:responseData.error}})
            throw responseData.error;
        }
        OptIns.upsert({nameId: ourData.name},{$push:{status:'mail data fetched'}});
        logConfirm('DOI Mail data fetched - recipient:',
            (responseData.data&&responseData.data.recipient)?responseData.data.recipient:decryptedData?decryptedData.to:'unknown');

        //in case this is the responsible doichain node for this email domain store the hash between the recipient and sender email
        //don't safe anything on fallback servers (nothing should arrive here)
        if ((responseData && responseData.data && responseData.data.verifyLocalHash)  //classic dApp was sending the data
            || (decryptedData && decryptedData.verifyLocalHash))
        {
            updateDoichainEntry({name: ourData.name, verifyLocalHash: responseData.data.verifyLocalHash});
            logConfirm('verifyLocalHash stored:', responseData.data.verifyLocalHash);
        }

        const optInId = addOptIn({name: ourData.name});
        const optIn = OptIns.findOne({_id: optInId});
        logConfirm('opt-in found:', optIn);
        if (optIn.confirmationToken !== undefined) return;

        const token = generateDoiToken({id: optIn._id})
        logConfirm('generated confirmationToken:', token)
        OptIns.update({_id: optInId},{$set:{token: token, redirect:responseData.data.redirect}})
        const confirmationUrl = getUrl() + API_PATH + VERSION + "/" + DOI_CONFIRMATION_ROUTE + "/" + encodeURIComponent(token);
        logConfirm('confirmationUrl:' + confirmationUrl);
        let template = undefined;

        if(responseData.encryptedData===undefined) {
            if (responseData.data.contentType == "json") {   //Encoding needs to be considered before parsing
                let jsonContent = JSON.parse(responseData.data.content);
                const templateText = parseTemplate({
                    template: jsonContent.text, data: {
                        confirmation_url: confirmationUrl
                    }
                });
                const templateHtml = parseTemplate({
                    template: jsonContent.html,
                    data: {
                        confirmation_url: confirmationUrl
                    }
                });
                template = JSON.stringify({"text": templateText, "html": templateHtml});
            } else {
                template = parseTemplate({
                    template: responseData.data.content,
                    data: {
                        confirmation_url: confirmationUrl
                    }
                });
            }
        }else{
            template = parseTemplate({
                template: decryptedData.content,
                data: {
                    confirmation_url: confirmationUrl
                }
            });
        }
        console.log("responseData.data",responseData.data)
        logConfirm('sending email to peter for confirmation over bobs dApp',responseData);

        //TODO please fix (conventional dApp requests use responseData.data and direct txs of mobile clients use the other

        const publicKey = responseData.data.publicKey?responseData.data.publicKey:responseData.publicKey

        const defaultFrom = getSettings('confirm.smtp.defaultFrom','doichain@localhost')
        const from = responseData.data.sender?responseData.data.sender:responseData.sender?responseData.sender:defaultFrom
        const to = responseData.data.recipient?responseData.data.recipient:responseData.recipient
        const senderName = responseData.data.senderName?responseData.data.senderName:responseData.senderName

        addSendMailJob({
            from: from,
            to: to,
            senderName: senderName,
            subject: responseData.data.subject,
            message: template,
            contentType: responseData.data.contentType,
            returnPath: responseData.data.returnPath,
            nameId: ourData.name, //we need this to verify a DOI from every Doichain node
            publicKey: publicKey, //we need this to verify a DOI from every Doichain node
        });
        OptIns.upsert({nameId: ourData.name},{$push:{status:'added to email queue'}});
    } catch (ex) {
        OptIns.upsert({nameId: ourData.name},{$push:{status:'error', error:ex.message, date: new Date()}})
        throw new Meteor.Error('dapps.fetchDoiMailData.exception', ex);
    }
};

export default fetchDoiMailData;
