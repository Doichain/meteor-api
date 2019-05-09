import namecoin from 'namecoin';
import { SEND_APP, CONFIRM_APP, VERIFY_APP, isAppType } from './type-configuration.js';
import {validateAddress} from "../../../server/api/doichain";
import {logError, logMain} from "./log-configuration";
import { getSettings} from "meteor/doichain:settings";

var sendClient = undefined;
if(isAppType(SEND_APP) && Meteor.settings.send) {
  sendClient = createClient(Meteor.settings.send.doichain);
}
export const SEND_CLIENT = sendClient;

var confirmClient = undefined;
var confirmAddress = undefined;

if(isAppType(CONFIRM_APP) && Meteor.settings.confirm) {
  confirmClient = createClient(Meteor.settings.confirm.doichain);
  confirmAddress = getSettings('confirm.doichain.address');
  const validateAddressOutput = validateAddress(confirmClient,confirmAddress)
  if(validateAddressOutput === undefined ||
      !validateAddressOutput ||
      !validateAddressOutput.isvalid ||
      !validateAddressOutput.ismine){

    logError('validateAddressOutput:',validateAddressOutput);
    //TODO report to dAPP!
    //throw new Meteor.Error("config.confirm.doichain.address", "Confirm Address is not configured, invalid or not yours.")
  }
}
export const CONFIRM_CLIENT = confirmClient;
export const CONFIRM_ADDRESS = confirmAddress;


var verifyClient = undefined;
if(isAppType(VERIFY_APP) && Meteor.settings.verify) {
    verifyClient = createClient(Meteor.settings.verify.doichain);
}

export const VERIFY_CLIENT = verifyClient;

function createClient(settings) {
  return new namecoin.Client({
    host: settings.host,
    port: settings.port,
    user: settings.username,
    pass: settings.password
  });
}
