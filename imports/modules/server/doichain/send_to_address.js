import { Meteor } from 'meteor/meteor';
import {doichainSendToAddress} from "../../../../server/api/doichain";
import {CONFIRM_CLIENT, SEND_CLIENT} from "../../../startup/server/doichain-configuration";

const sendToAddress = (address,amount) => {
  try {
    console.log("sendToAddress address:"+address+" amount:"+amount)
      doichainSendToAddress(SEND_CLIENT,address,amount)
  } catch(exception) {
    throw new Meteor.Error('doichain.sendToAddress.exception', exception);
  }
};

export default sendToAddress;
