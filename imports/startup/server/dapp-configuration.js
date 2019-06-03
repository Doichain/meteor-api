import { Meteor } from 'meteor/meteor';
import { getSettings} from "meteor/doichain:settings";
import {CONFIRM_CLIENT, SEND_CLIENT} from "./doichain-configuration";
import {getInfo} from "../../../server/api/doichain";


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

  let ssl = getSettings('app.ssl',false); //default true!
  let port = getSettings('app.port',3000);
  let host = getSettings('app.host','localhost');
  let protocol = "http://";
  if(ssl===true) protocol = "https://";
  console.log("ssl:",ssl)
  console.log('url:',protocol+host+":"+port+"/")
  if(host!==undefined) return protocol+host+":"+port+"/";

  return Meteor.absoluteUrl();
}