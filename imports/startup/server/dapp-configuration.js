import { Meteor } from 'meteor/meteor';
import { getSettings} from "meteor/doichain:settings";

export function isDebug() {
    return getSettings('app.debug',true);
}

export function isRegtest() {
    return getSettings('app.regtest',false);
}

export function isTestnet() {
    return getSettings('app.testnet',false);
}

export function getUrl() {

  let ssl = getSettings('app.ssl',true); //default true!
  let port = getSettings('app.port',3000);
  let host = getSettings('app.host','localhost');
  let protocol = "https://";
  if(!ssl) protocol = "http://";

  if(host!==undefined) return protocol+host+":"+port+"/";

  return Meteor.absoluteUrl();
}
