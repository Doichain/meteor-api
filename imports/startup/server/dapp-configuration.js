import { Meteor } from 'meteor/meteor';
import { getSettings} from "meteor/doichain:settings";
import {getInfo} from "../../../server/api/doichain";
import {CONFIRM_CLIENT, SEND_CLIENT} from "./doichain-configuration";

export function isDebug() {
    return getSettings('app.debug',true);
}

export function isRegtest() {
    const data = getInfo(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
    return data.chain === "regtest";
}

export function isTestnet() {
    const data = getInfo(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
    return data.chain === "test";
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
