import namecoin from 'namecoin';
import {getaddressesbylabel, getNewAddress, getAddressInfo} from "../../../server/api/doichain";
import {logError, logMain} from "./log-configuration";
import { getSettings} from "meteor/doichain:settings";


var sendClient = createClient("send");

export const SEND_CLIENT = sendClient;

var confirmClient = undefined;
var confirmAddress = undefined;
//if(isAppType(CONFIRM_APP)) {
confirmClient = createClient("confirm");
let addressesOfAccount = []
  try {
       addressesOfAccount = getaddressesbylabel(confirmClient);
  }catch(ex){
      logError('new wallet need to create an address first');
  } 
  if(addressesOfAccount.length>0)   confirmAddress = getSettings('confirm.doichain.address',addressesOfAccount[0]);
  else confirmAddress = getSettings('confirm.doichain.address',getNewAddress(confirmClient,""));  
  
  try{
    //TODO find a better place to validate this address in future
    const validateAddressOutput = getAddressInfo(confirmClient,confirmAddress)
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
