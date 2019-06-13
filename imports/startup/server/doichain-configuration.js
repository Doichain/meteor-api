import namecoin from 'namecoin';
import { SEND_APP, CONFIRM_APP, VERIFY_APP, isAppType } from './type-configuration.js';
import {getAddressesByAccount, getNewAddress, validateAddress} from "../../../server/api/doichain";
import {logError, logMain} from "./log-configuration";
import { getSettings} from "meteor/doichain:settings";


var sendClient = createClient("send");
/*var sendClient = undefined;
if(isAppType(SEND_APP)) {

}*/
export const SEND_CLIENT = sendClient;

var confirmClient = undefined;
var confirmAddress = undefined;
//if(isAppType(CONFIRM_APP)) {
  confirmClient = createClient("confirm");
  const addressesOfAccount = getAddressesByAccount(confirmClient);
  if(addressesOfAccount.length>0)   confirmAddress = getSettings('confirm.doichain.address',addressesOfAccount[0]);
  else confirmAddress = getSettings('confirm.doichain.address',getNewAddress(confirmClient,""));

  try{
    //TODO find a better place to validate this address in future
    const validateAddressOutput = validateAddress(confirmClient,confirmAddress)
    if(validateAddressOutput === undefined ||
        !validateAddressOutput ||
        !validateAddressOutput.isvalid ||
        !validateAddressOutput.ismine){

      logError('validateAddressOutput:',validateAddressOutput);
      //TODO report to dAPP!
      //throw new Meteor.Error("config.confirm.doichain.address", "Confirm Address is not configured, invalid or not yours.")
    }
  }catch(ex){
    logError('validateAddress:',ex);
  }
//}
export const CONFIRM_CLIENT = confirmClient;
export const CONFIRM_ADDRESS = confirmAddress;


var verifyClient = createClient("verify");

export const VERIFY_CLIENT = verifyClient;

function createClient(settings) {
  return new namecoin.Client({
    host: getSettings(settings+'.doichain.host'),
    port: getSettings(settings+'.doichain.port'),
    user: getSettings(settings+'.doichain.username'),
    pass: getSettings(settings+'.doichain.password')
  });
}