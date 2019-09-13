import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { resolveTxt } from '../../../../server/api/dns.js';
import { FALLBACK_PROVIDER } from '../../../startup/server/dns-configuration.js';
import {isRegtest, isTestnet} from "../../../startup/server/dapp-configuration";
import {logSend} from "../../../startup/server/log-configuration";
import getOptInProvider from "./get_opt-in-provider";
import {OPT_IN_KEY, OPT_IN_KEY_TESTNET} from "../../../../server/api/dns";
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

    if(key === undefined){
      //try delegatedKey
      const provider = getOptInProvider({domain: ourData.domain});
      logSend("Using doichain delegated provider instead of directly configured publicKey:",{provider:provider});
      const delegatedKey = resolveTxt(ourOPT_IN_KEY, provider);
      if(delegatedKey) return  {type: 'delegated', key: delegatedKey} ;

      //use fallback
      if(key===undefined && delegatedKey===undefined){
        const fallbackKey = resolveTxt(ourOPT_IN_KEY, FALLBACK_PROVIDER);
        if(fallbackKey) return {type: 'fallback', key: fallbackKey}
        else{
          logSend("Key not defined. Using fallback: ",FALLBACK_PROVIDER);
          throw new Meteor.Error("Fallback has no key defined!");
        }
      }
    }
    else
      return {type: 'default', key: key}

  } catch (exception) {
    throw new Meteor.Error('dns.getOptInKey.exception', exception);
  }
};


export default getOptInKey;
