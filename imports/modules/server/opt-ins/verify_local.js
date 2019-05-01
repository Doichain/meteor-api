import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {logVerify} from "../../../startup/server/log-configuration";
import {DoichainEntries} from "../../../api/doichain/entries";
import getDataHash from "../doichain/get_data-hash";

const VerifyLocalSchema = new SimpleSchema({
  recipient_mail: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  sender_mail: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  }
});

const verifyLocal = (data) => {
  try {
    const ourData = data;
    VerifyLocalSchema.validate(ourData);
    logVerify('VerifyLocalSchema:',ourData);

    const emailString = ourData.sender_mail+ourData.recipient_mail;
    const dataHash =  getDataHash({data: emailString});
    logVerify('datahash of given sender_mail+recipient_mail:',dataHash)
    const entry =  DoichainEntries.find({"verifyLocalHash": dataHash}).fetch();
    logVerify("found entry", entry);
    return (entry.length>0);
  } catch (exception) {
    throw new Meteor.Error('opt-ins.verify.exception', exception);
  }
};

export default verifyLocal
