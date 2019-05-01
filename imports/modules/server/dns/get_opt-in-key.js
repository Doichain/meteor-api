import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { resolveTxt } from '../../../../server/api/dns.js';
import { FALLBACK_PROVIDER } from '../../../startup/server/dns-configuration.js';
import {isRegtest, isTestnet} from "../../../startup/server/dapp-configuration";
import {logSend} from "../../../startup/server/log-configuration";

const OPT_IN_KEY = "doichain-opt-in-key";
const OPT_IN_KEY_TESTNET = "doichain-testnet-opt-in-key";

const GetOptInKeySchema = new SimpleSchema({
  domain: {
    type: String
  }
});


const getOptInKey = (data) => {
  try {
    const ourData = data;
    GetOptInKeySchema.validate(ourData);

    let ourOPT_IN_KEY=OPT_IN_KEY;

    if(isRegtest() || isTestnet()){
        ourOPT_IN_KEY = OPT_IN_KEY_TESTNET;
        logSend('Using RegTest:'+isRegtest()+" Testnet: "+isTestnet()+" ourOPT_IN_KEY",ourOPT_IN_KEY);
    }
    const key = resolveTxt(ourOPT_IN_KEY, ourData.domain);
    logSend('DNS TXT configured public key of recipient email domain and confirmation dapp',{foundKey:key, domain:ourData.domain, dnskey:ourOPT_IN_KEY});

    if(key === undefined) return {type: 'fallback', key: useFallback(ourData.domain)} ;
    return {type: 'default', key: key}

  } catch (exception) {
    throw new Meteor.Error('dns.getOptInKey.exception', exception);
  }
};

const useFallback = (domain) => {
  if(domain === FALLBACK_PROVIDER) throw new Meteor.Error("Fallback has no key defined!");
    logSend("Key not defined. Using fallback: ",FALLBACK_PROVIDER);
  return getOptInKey({domain: FALLBACK_PROVIDER});
};

export default getOptInKey;
