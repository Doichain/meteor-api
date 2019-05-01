import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {logConfirm} from "../../../startup/server/log-configuration";
import { DOI_MAIL_DEFAULT_EMAIL_FROM } from '../../../startup/server/email-configuration.js';

const SendMailSchema = new SimpleSchema({
  from: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  to: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  subject: {
    type: String,
  },
  message: {
    type: String,
  },
  contentType: {
    type: String,
  },
  returnPath: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  }
});

const sendMail = (mail) => {
  try {

    mail.from = DOI_MAIL_DEFAULT_EMAIL_FROM;

    const ourMail = mail;
    logConfirm('sending email with data:',{to:mail.to, subject:mail.subject});
    SendMailSchema.validate(ourMail);
    //TODO: Text fallback
    let emailToSend={
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      headers: {
        'Return-Path': mail.returnPath,
      }
    }
    
    switch (mail.contentType) {
      case "text":
        emailToSend.text=mail.message;
        break;
      case "html":
        emailToSend.html=mail.message;
        break;
        case "json":
        let mailParts=JSON.parse(mail.message);
        emailToSend.text=mailParts.text;
        emailToSend.html=mailParts.html;
        break;
      default:
        break;
    }
    if(!emailToSend.html&&!emailToSend.text){
      throw new Meteor.Error('No email message provided');
    }
    if(emailToSend){
      Email.send(emailToSend);
    }
    else{
      throw new Meteor.Error('Error creating email');
    }
  } catch (exception) {
    throw new Meteor.Error('emails.send.exception', exception);
  }
};

export default sendMail;
