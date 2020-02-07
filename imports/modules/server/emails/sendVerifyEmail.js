import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {logConfirm} from "../../../startup/server/log-configuration";
import { getSettings} from "meteor/doichain:settings";

const SendMailSchema = new SimpleSchema({
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
  }
});

const sendVerifyEMail = (mail) => {
  try {
    const ourMail = mail;

    SendMailSchema.validate(ourMail);
    mail.from = getSettings('confirm.smtp.defaultFrom','doichain@localhost')
    let emailToSend={
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.message
    }

    logConfirm('sending email with data:',emailToSend);
    Email.send(emailToSend);
  } catch (exception) {
    throw new Meteor.Error('emails.send.exception', exception);
  }
};

export default sendVerifyEMail;
