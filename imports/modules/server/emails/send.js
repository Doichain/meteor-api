import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {logConfirm} from "../../../startup/server/log-configuration";
import { getSettings} from "meteor/doichain:settings";
import {OptIns} from "../../../api/opt-ins/opt-ins";
import {getUrl} from "../../../startup/server/dapp-configuration";
import {
  API_PATH,
  DOI_EXPLORER,
  DOI_VERIFY_ROUTE,
  VERSION
} from "../../../../server/api/rest/rest";

const SendMailSchema = new SimpleSchema({
  from: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  to: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  senderName: {
    type: String,
    optional: true
  },
  subject: {
    type: String,
  },
  message: {
    type: String,
  },
  contentType: {
    type: String,
    optional: true
  },
  returnPath: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  nameId: {
    type: String,
  },
  publicKey: {
    type: String,
  }
});

const sendMail = (mail) => {
  try {

    const ourMail = mail;
    logConfirm('sending email with data:',{from: mail.from, to:mail.to, senderName: mail.senderName, subject:mail.subject,returnPath:mail.returnPath});
    SendMailSchema.validate(ourMail);

    const doiVerificationUrl = getUrl() + API_PATH + VERSION + "/" + DOI_VERIFY_ROUTE + "?recipient_mail="+mail.to+"&sender_mail="+
        mail.from+"&name_id="+mail.nameId+"&public_key="+mail.publicKey;

    const nameIdVerificationUrl = getUrl() + API_PATH + VERSION + "/" + DOI_EXPLORER + "?nameId="+mail.nameId;

    logConfirm('confirmationUrl:' + doiVerificationUrl);
    let doichainEmailFooterText = "\n\nAn email permission will be stored on Doichain for:\n"
    doichainEmailFooterText+="Sender Email: "+mail.senderName+" ("+mail.from+")"+"\n"
    doichainEmailFooterText+="Recipient Email: "+mail.to+"\n"
    doichainEmailFooterText+="NameId on Doichain: "+mail.nameId+"\n"
    doichainEmailFooterText+="PublicKey of Requester: "+mail.publicKey+"\n"
    doichainEmailFooterText+="You can proof the current state of your DOI permission on any Doichain node or click "+doiVerificationUrl+"\n"

    let doichainEmailFooterHTML = "<p>An email permission will be stored on Doichain for:<br>"
    doichainEmailFooterHTML+="<ul><li>Sender Email: "+mail.from+"</li>"
    doichainEmailFooterHTML+="<li>Sender Name: "+mail.senderName+"</li>"
    doichainEmailFooterHTML+="<li>Recipient Email: "+mail.to+"</li>"
    doichainEmailFooterHTML+="<li>NameId on Doichain: "+nameIdVerificationUrl+"</li>"
    doichainEmailFooterHTML+="<li>PublicKey of Sender: "+mail.publicKey+"</li>"
    doichainEmailFooterHTML+="You can proof the current state of your DOI permission on any Doichain node or click "+doiVerificationUrl+"</p>"

    //overwrite from with from from validator (right now we use the validators email address to send the email)
    mail.from = getSettings('confirm.smtp.defaultFrom','doichain@localhost')
    const from = mail.senderName?mail.senderName+"<"+mail.from+">":mail.from //use a senderName if given

    let emailToSend={
      from: from,
      to: mail.to,
      subject: mail.subject,
      headers: {
        'Return-Path': mail.returnPath,
      }
    }

    switch (mail.contentType) {
      case "text":
        emailToSend.text=mail.message //+"\n"+doichainEmailFooterText //TODO enable this again
        break;
      case "html":
        emailToSend.html=mail.message //+"<table><tr><td>"+doichainEmailFooterHTML+"</td></tr></table>" //TODO enable this again
        break;
      case "json":
        let mailParts=JSON.parse(mail.message);
        emailToSend.text=mailParts.text //+"\n"+doichainEmailFooterText; //TODO enable this again
        emailToSend.html=mailParts.html //+"<table><tr><td>"+doichainEmailFooterHTML+"</td></tr></table>" //TODO enable this again
        break;
      default:
        emailToSend.html=mail.message+doichainEmailFooterText; //downward compatible to 0.0.8
        break;
    }

    if(!emailToSend.html&&!emailToSend.text){
      const error = 'No email message provided'
      OptIns.update({nameId: mail.nameId},{$push:{status:'error sending email', error: error}})
      throw new Meteor.Error(error);
    }

    if(emailToSend){
      Email.send(emailToSend);
      OptIns.update({nameId: mail.nameId},{$push:{status:'email sent'}});
    }
    else{
      const error = 'Error creating email'
      OptIns.update({nameId: mail.nameId},{$push:{status:'error fetching template', error:error }})
      throw new Meteor.Error(error);
    }
  } catch (exception) {
    OptIns.update({nameId: mail.nameId},{$push:{status:'error sending email', error:exception.toString()}})
    throw new Meteor.Error('emails.send.exception', exception);
  }
};

export default sendMail;
