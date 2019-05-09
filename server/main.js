import '../imports/startup/server';
import './api/index.js';
import {isTestnet,isRegtest} from "../imports/startup/server/dapp-configuration";
console.log("dapp running "+(isTestnet()?'testnet':'')+''+(isRegtest()?'regtest':''));
