import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { OptIns } from '../../../api/opt-ins/opt-ins.js';
import { Recipients } from '../../../api/recipients/recipients.js';
import getOptInProvider from '../dns/get_opt-in-provider.js';
import getOptInKey from '../dns/get_opt-in-key.js';
import verifySignature from '../doichain/verify_signature.js';
import { getHttpGET } from '../../../../server/api/http.js';
import { DOI_MAIL_FETCH_URL } from '../../../startup/server/email-configuration.js';
import { logSend } from "../../../startup/server/log-configuration";
import { Accounts } from 'meteor/accounts-base'

const GetDoiMailDataSchema = new SimpleSchema({
  name_id: {
    type: String
  },
  signature: {
    type: String
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

const getDoiMailData = (data) => {
  try {
    const ourData = data;
    GetDoiMailDataSchema.validate(ourData);
    const optIn = OptIns.findOne({nameId: ourData.name_id});
    if(optIn === undefined) throw "Opt-In with name_id: "+ourData.name_id+" not found";
    logSend('Opt-In found',optIn);

    const recipient = Recipients.findOne({_id: optIn.recipient});
    if(recipient === undefined) throw "Recipient not found";
    logSend('Recipient found', recipient);

    const parts = recipient.email.split("@");
    const domain = parts[parts.length-1];

    let publicKey = getOptInKey({ domain: domain});

    if(!publicKey){
      const provider = getOptInProvider({domain: ourData.domain });
      logSend("using doichain provider instead of directly configured publicKey:", { provider: provider });
      publicKey = getOptInKey({ domain: provider}); //get public key from provider or fallback if publickey was not set in dns
    }

    logSend('queried data: (parts, domain, provider, publicKey)', '('+parts+','+domain+','+publicKey+')');

    //TODO: Only allow access one time
    // Possible solution:
    // 1. Provider (confirm dApp) request the data
    // 2. Provider receive the data
    // 3. Provider sends confirmation "I got the data"
    // 4. Send dApp lock the data for this opt in
    logSend('verifying signature...');
    if(!verifySignature({publicKey: publicKey, data: ourData.name_id, signature: ourData.signature})) {
      throw "signature incorrect - access denied";
    }
    
    logSend('signature verified');

    //TODO: Query for language
    let doiMailData;
    try {

      doiMailData = getHttpGET(DOI_MAIL_FETCH_URL, "").data;
      let defaultReturnData = {
        "recipient": recipient.email,
        "content": doiMailData.data.content,
        "redirect": doiMailData.data.redirect,
        "subject": doiMailData.data.subject,
        "returnPath": doiMailData.data.returnPath
      }

    let returnData = defaultReturnData;

    try{
      let owner = Accounts.users.findOne({_id: optIn.ownerId});
      let mailTemplate = owner.profile.mailTemplate;
      let redirParamString=null;
      let templParamString=null;
      try{
        let optinData = JSON.parse(optIn.data);
        let redirParam = optinData.redirectParam ? optinData.redirectParam:null;
        let templParam = optinData.templateParam ? optinData.templateParam:null;

        //parse template params
      let str = [];
      for (let tParam in templParam){
        if (templParam.hasOwnProperty(tParam)) {
          str.push(encodeURIComponent(tParam) + "=" + encodeURIComponent(templParam[tParam]));
          logSend("tmplParam added:",tParam+"="+templParam[tParam]);
        }
        templParamString=str.join("&");
      }
      //parse redirect params
      str = [];
      for (let rParam in redirParam){
        if (redirParam.hasOwnProperty(rParam)) {
          str.push(encodeURIComponent(rParam) + "=" + encodeURIComponent(redirParam[rParam]));
          logSend("redirParam added:",rParam+"="+redirParam[rParam]);
        }
        redirParamString=str.join("&");
      }
      }
      catch(e){
        logSend("Couldn't retrieve parameters")
      }
      userProfileSchema.validate(mailTemplate);

      //Appends parameter to redirect-url
      let tmpRedirect = mailTemplate["redirect"] ? (redirParamString === null ? mailTemplate["redirect"] : (mailTemplate["redirect"].indexOf("?")==-1 ? mailTemplate["redirect"]+"?"+redirParamString : mailTemplate["redirect"]+"&"+redirParamString)):null;
      let tmpTemplate = mailTemplate["templateURL"] ? (templParamString === null ? mailTemplate["templateURL"] : (mailTemplate["templateURL"].indexOf("?")==-1 ? mailTemplate["templateURL"]+"?"+templParamString : mailTemplate["templateURL"]+"&"+templParamString)):null;

      returnData["redirect"] = tmpRedirect || defaultReturnData["redirect"];
      returnData["subject"] = mailTemplate["subject"] || defaultReturnData["subject"];
      returnData["returnPath"] = mailTemplate["returnPath"] || defaultReturnData["returnPath"];
      returnData["content"] = tmpTemplate ? (getHttpGET(tmpTemplate).content || defaultReturnData["content"]) : defaultReturnData["content"];
      logSend("Redirect Url set to:",returnData["redirect"]);
      logSend("Template Url set to:",(tmpTemplate ? tmpTemplate : "Default"));

    }
    catch(error) {
      returnData=defaultReturnData;
    }

      logSend('doiMailData and url:', DOI_MAIL_FETCH_URL, returnData);

      return returnData

    } catch(error) {
      throw "Error while fetching mail content: "+error;
    }

  } catch(exception) {
    throw new Meteor.Error('dapps.getDoiMailData.exception', exception);
  }
};

export default getDoiMailData;
