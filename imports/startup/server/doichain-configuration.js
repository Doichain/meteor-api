import namecoin from 'namecoin';
import { SEND_APP, CONFIRM_APP, VERIFY_APP, isAppType } from './type-configuration.js';
import {validateAddress} from "../../../server/api/doichain";
import {logError, logMain} from "./log-configuration";
import { getSettings} from "meteor/doichain:settings";

var sendClient = undefined;
if(isAppType(SEND_APP)) {
  sendClient = createClient(SEND_APP);
  logMain('created client for send-mode',sendClient);
}
export const SEND_CLIENT = sendClient;

var confirmClient = undefined;
var confirmAddress = undefined;
if(isAppType(CONFIRM_APP)) {
  //if(!confirmSettings || !confirmSettings.doichain) //TODO report error to dApp
  //&&  throw new Meteor.Error("config.confirm.doichain", "Confirm app doichain settings not found")
  confirmClient = createClient(CONFIRM_APP);
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
if(isAppType(VERIFY_APP)) {
    verifyClient = createClient(VERIFY_APP);
}

export const VERIFY_CLIENT = verifyClient;

function createClient(settings) {
  return new namecoin.Client({
    host: getSettings(settings+'.doichain.host'),
    port: getSettings(settings+'.doichain.port'),
    user: getSettings(settings+'.doichain.username'),
    pass: getSettings(settings+'.doichain.password')
  });
}
