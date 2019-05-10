import namecoin from 'namecoin';
import { SEND_APP, CONFIRM_APP, VERIFY_APP, isAppType } from './type-configuration.js';
import {validateAddress} from "../../../server/api/doichain";
import {logError, logMain} from "./log-configuration";
import { getSettings} from "meteor/doichain:settings";

var sendClient = undefined;
sendClient = createClient("send");

export const SEND_CLIENT = sendClient;

var confirmClient = undefined;
var confirmAddress = undefined;
confirmClient = createClient("confirm");
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
//}
export const CONFIRM_CLIENT = confirmClient;
export const CONFIRM_ADDRESS = confirmAddress;


var verifyClient = undefined;
verifyClient = createClient("verify");

export const VERIFY_CLIENT = verifyClient;

function createClient(settings) {
  return new namecoin.Client({
    host: getSettings(settings+'.doichain.host'),
    port: getSettings(settings+'.doichain.port'),
    user: getSettings(settings+'.doichain.username'),
    pass: getSettings(settings+'.doichain.password')
  });
}

console.log('doichain-config initizalized',sendClient);