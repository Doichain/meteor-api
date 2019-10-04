import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {logConfirm} from "../../../startup/server/log-configuration";
import { getSettings} from "meteor/doichain:settings";
import {OptIns} from "../../../api/opt-ins/opt-ins";

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
    optional: true
  },
  returnPath: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  nameId: {
    type: String,
  }
});

const sendMail = (mail) => {
  try {

    const doicheinEmailFooter = "Doichain Footer"
    mail.from = getSettings('confirm.smtp.defaultFrom','doichain@localhost')

    const ourMail = mail;
    logConfirm('sending email with data:',{from: mail.from, to:mail.to, subject:mail.subject,returnPath:mail.returnPath});
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
        emailToSend.text=mail.message+"\n"+doicheinEmailFooter;
        break;
      case "html":
        emailToSend.html=mail.message+doicheinEmailFooter;
        break;
      case "json":
        let mailParts=JSON.parse(mail.message);
        emailToSend.text=mailParts.text+"\n"+doicheinEmailFooter;
        emailToSend.html=mailParts.html+doicheinEmailFooter;
        break;
      default:
        emailToSend.html=mail.message+doicheinEmailFooter; //downward compatible to 0.0.8
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
