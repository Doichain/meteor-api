import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { OptIns } from '../../../api/opt-ins/opt-ins.js';
import { Recipients } from '../../../api/recipients/recipients.js';
import { Senders } from '../../../api/senders/senders.js';
import getOptInProvider from '../dns/get_opt-in-provider.js';
import getOptInKey from '../dns/get_opt-in-key.js';
import verifySignature from '../doichain/verify_signature.js';
import { getHttpGET } from '../../../../server/api/http.js';
import { DOI_MAIL_FETCH_URL } from '../../../startup/server/email-configuration.js';
import { logSend } from "../../../startup/server/log-configuration";
import { Accounts } from 'meteor/accounts-base'
import {getUrl} from "../../../startup/server/dapp-configuration";
import getDataHash from "../doichain/get_data-hash";

const GetDoiMailDataSchema = new SimpleSchema({
  name_id: {
    type: String
  },
  signature: {
    type: String
  },
  validatorPublicKey: {
    type: String,
    optional:true
  }
});

const userProfileSchema = new SimpleSchema({
  subject: {
    type: String,
    optional:true
  },
  redirect: {
    type: String,
    regEx: "@(https?|ftp)://(-\\.)?([^\\s/?\\.#-]+\\.?)+(/[^\\s]*)?$@",
    optional:true
  },
  returnPath: {
    type: String,
    regEx: SimpleSchema.RegEx.Email,
    optional:true
  },
  templateURL: {
    type: String,
    regEx: "@(https?|ftp)://(-\\.)?([^\\s/?\\.#-]+\\.?)+(/[^\\s]*)?$@",
    optional:true
  }
});

/**
 * getDoiMailData
 *
 * - is called by the validator (bob)
 * - transmits parameter nameId, publicKey and signature created by Peters temporary privateKey for this transaction
 * - we get sender and recipient out of the database and gather the public key of the responsible validator from dns
 * - we verify the transmitted signature if the responsible validator was sending the request for this template. (only give it to him)
 *
 * @param data nameId, signature
 * @returns {{redirect: *, returnPath: *, subject: *, recipient: *, contentType: (*|string), content: *}}
 */
const getDoiMailData = (data) => {

  let optIn
  try {

    const ourData = data;
    console.log('GetDoiMailDataSchema',data)
    GetDoiMailDataSchema.validate(ourData);
    optIn = OptIns.findOne({nameId: ourData.name_id});

    if (optIn === undefined) throw "Opt-In with name_id: " + ourData.name_id + " not found";
    OptIns.update({_id: optIn._id}, {$push: {status: 'template requested'}})
    logSend('Opt-In found', optIn);

    const sender = Senders.findOne({_id: optIn.sender});
    if (sender === undefined) throw "Sender not found";

    const recipient = Recipients.findOne({_id: optIn.recipient});
    if (recipient === undefined) throw "Recipient not found";
    logSend('Recipient found', recipient);

    //TODO the following 13 lines are obviously more then one time implemented in the code - needs to be abstracted
    const parts = recipient.email.split("@");
    const domain = parts[parts.length - 1];
    let optInKeyData = getOptInKey({domain: domain});
    let publicKey = optInKeyData.key;
    let optInType = optInKeyData.type;

    if (!publicKey) {
      const provider = getOptInProvider({domain: ourData.domain});
      logSend("using doichain provider instead of directly configured publicKey:", {provider: provider});
      optInKeyData = getOptInKey({domain: provider}).key; //get public key from provider or fallback if publickey was not set in dns
      publicKey = optInKeyData.key;
      optInType = optInKeyData.type;
    }

    logSend('queried data: (parts, domain, provider, publicKey)', '(' + parts + ',' + domain + ',' + publicKey + ')');

    //TODO: Only allow access one time
    // Possible solution:
    // 1. Provider (confirm dApp) request the data
    // 2. Provider receive the data
    // 3. Provider sends confirmation "I got the data"
    // 4. Send dApp lock the data for this opt in
    logSend('verifying signature...');

    /* TODO as soon as verified email is activated please activate
    if (!verifySignature({publicKey: publicKey, data: ourData.name_id, signature: ourData.signature})) {
      throw "signature incorrect - access denied";
    }
    OptIns.update({_id: optIn._id}, {$push: {status: 'signature verified'}})
    logSend('signature verified');*/

    //TODO: Query for language
    let doiMailData;
    try {

      doiMailData = getHttpGET(DOI_MAIL_FETCH_URL, "").data;
      let redirectUrl = doiMailData.data.redirect;

      if (!redirectUrl.startsWith("http://") && !redirectUrl.startsWith("https://")) {
        redirectUrl = getUrl() + "templates/pages/" + redirectUrl;
      }
      logSend('redirectUrl:', redirectUrl);

      let defaultReturnData = {
        "sender": sender.email,
        "recipient": recipient.email,
        "publicKey": recipient.publicKey,
        "content": doiMailData.data.content,
        "redirect": redirectUrl,
        "senderName": doiMailData.data.senderName,
        "subject": doiMailData.data.subject,
        "contentType": (doiMailData.data.contentType || 'html'),
        "returnPath": doiMailData.data.returnPath
      }

      //in case we don't send data to a fallback server, send sender email to destination fallback.
      if (optInType === "default") {
        defaultReturnData.verifyLocalHash = getDataHash({data: (sender.email + recipient.email)}); //verifyLocalHash = verifyLocalHash
      }
      OptIns.update({_id: optIn._id}, {$push: {status: 'email configured'}})
      logSend('defaultReturnData:', defaultReturnData);

      let returnData = defaultReturnData;

      try {

        let owner = Accounts.users.findOne({_id: optIn.ownerId});
        let mailTemplate = owner.profile.mailTemplate;
        let redirParamString = null;
        let templParamString = null;

        try {

          let optinData = JSON.parse(optIn.data);
          let redirParam = optinData.redirectParam ? optinData.redirectParam : null;
          let templParam = optinData.templateParam ? optinData.templateParam : null;

          //parse template params
          let str = [];
          for (let tParam in templParam) {
            if (templParam.hasOwnProperty(tParam)) {
              str.push(encodeURIComponent(tParam) + "=" + encodeURIComponent(templParam[tParam]));
              logSend("tmplParam added:", tParam + "=" + templParam[tParam]);
            }
            templParamString = str.join("&");
          }
          //parse redirect params
          str = [];
          for (let rParam in redirParam) {
            if (redirParam.hasOwnProperty(rParam)) {
              str.push(encodeURIComponent(rParam) + "=" + encodeURIComponent(redirParam[rParam]));
              logSend("redirParam added:", rParam + "=" + redirParam[rParam]);
            }
            redirParamString = str.join("&");
          }
        } catch (e) {
          logSend("Couldn't retrieve parameters")
        }
        userProfileSchema.validate(mailTemplate);

        //Appends parameter to redirect-url
        let tmpRedirect = mailTemplate["redirect"] ? (redirParamString === null ? mailTemplate["redirect"] : (mailTemplate["redirect"].indexOf("?") == -1 ? mailTemplate["redirect"] + "?" + redirParamString : mailTemplate["redirect"] + "&" + redirParamString)) : null;
        let tmpTemplate = mailTemplate["templateURL"] ? (templParamString === null ? mailTemplate["templateURL"] : (mailTemplate["templateURL"].indexOf("?") == -1 ? mailTemplate["templateURL"] + "?" + templParamString : mailTemplate["templateURL"] + "&" + templParamString)) : null;

        returnData["redirect"] = tmpRedirect || defaultReturnData["redirect"];
        returnData["subject"] = mailTemplate["subject"] || defaultReturnData["subject"];
        returnData["returnPath"] = mailTemplate["returnPath"] || defaultReturnData["returnPath"];
        let templateResult = getHttpGET(tmpTemplate);
        let message = false;
        let contentType = templateResult.headers["content-type"];
        switch (contentType.split(";")[0]) {
          case "text/plain":
            contentType = "text"
            message = templateResult.content;
            break;
          case "text/html":
            contentType = "html"
            message = templateResult.content;
            break;
          case "application/json":
            //check if json has fields text and html
            if (templateResult.data && templateResult.data.text && templateResult.data.html) {
              //console.log(templateResult.data.html);
              message = templateResult.content;
              contentType = "json";
            }
            break;
          default:
            break;
        }
        logSend("contentType", contentType);
        //returnData["content"] = tmpTemplate ? (templateResult.content || defaultReturnData["content"]) : defaultReturnData["content"];
        returnData["content"] = tmpTemplate ? (message || defaultReturnData["content"]) : defaultReturnData["content"];
        returnData["contentType"] = contentType && message ? contentType : "html";
        logSend("Redirect Url set to:", returnData["redirect"]);
        logSend("Template Url set to:", (tmpTemplate ? tmpTemplate : "Default"));

      } catch (error) {
        returnData = defaultReturnData;
      }

      OptIns.update({_id: optIn._id}, {$push: {status: 'template fetched'}})  //TODO please abstract status changes of an OptIn
      logSend('doiMailData and url:', DOI_MAIL_FETCH_URL, returnData);
      return returnData

    } catch (error) {
      throw "Error while fetching mail content: " + error;
    }

  } catch (exception) {
    if (optIn !== undefined) OptIns.update({_id: optIn._id}, {
      $push: {
        status: 'problem template fetch',
        error: exception
      }
    })
    throw new Meteor.Error('dapps.getDoiMailData.exception', exception);
  }
  if (optIn !== undefined) OptIns.update({_id: optIn._id}, {$push: {status: 'template fetched'}})
};

export default getDoiMailData;
