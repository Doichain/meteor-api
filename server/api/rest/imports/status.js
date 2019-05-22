import { Api } from '../rest.js';
import {getBalance, getInfo} from "../../doichain";
import { CONFIRM_CLIENT,SEND_CLIENT} from "../../../../imports/startup/server/doichain-configuration";
import {DOI_BLOCKNOTIFY_ROUTE, DOI_WALLETNOTIFY_ROUTE} from "../rest";
import {logConfirm} from "../../../../imports/startup/server/log-configuration";
import checkNewTransaction from "../../../../imports/modules/server/doichain/check_new_transactions";
import {Meta} from "../../../../imports/api/meta/meta";

Api.addRoute('status', {authRequired: false}, {
  get: {
    action: function() {
      try {
        const data = getInfo(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
        return {"status": "success", "data":data};
      }catch(ex){
            return {"status": "failed", "data": ex.toString()};
      }
    }
  }
});

Api.addRoute(DOI_WALLETNOTIFY_ROUTE, {
  get: {
    authRequired: false,
    action: function() {
      const params = this.queryParams;
      const tx = params.tx;

      try {
        logConfirm('checking transaction with tx:',{tx});
        checkNewTransaction(tx,null);
        //logConfirm('checked transaction with tx:',{tx});
        return {status: 'success',  data:'tx:'+tx+' was read from blockchain'};
      } catch(error) {
        return {status: 'fail', error: error.message};
      }
    }
  }
});

function storeMeta(blockchainInfoVal,data) {
    let val = data;
    if(val instanceof Object) val = data[blockchainInfoVal];
    if(Meta.find({key:blockchainInfoVal}).count() > 0){
        Meta.remove({key:blockchainInfoVal});
    }
  console.log("updating meta:"+blockchainInfoVal,val)
  if(!data[blockchainInfoVal]){
    console.log(data)
  }
  Meta.insert({key:blockchainInfoVal, value: val});
}

Api.addRoute(DOI_BLOCKNOTIFY_ROUTE, {
  get: {
    authRequired: false,
    action: function() {
      try {
          logConfirm('new block has arrrived','');
          const data = getInfo(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);

          const BLOCKCHAIN_INFO_VAL_CHAIN = "chain";
          storeMeta(BLOCKCHAIN_INFO_VAL_CHAIN,data);

          const BLOCKCHAIN_INFO_VAL_DIFFICULTY = "difficulty";
          storeMeta(BLOCKCHAIN_INFO_VAL_DIFFICULTY,data);

          const BLOCKCHAIN_INFO_VAL_BLOCKS = "blocks";
          storeMeta(BLOCKCHAIN_INFO_VAL_BLOCKS,data);

          const BLOCKCHAIN_INFO_VAL_SIZE = "size_on_disk";
          storeMeta(BLOCKCHAIN_INFO_VAL_SIZE,data);

          const BLOCKCHAIN_INFO_VAL_BALANCE = "balance";
          const balance=getBalance(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
          storeMeta(BLOCKCHAIN_INFO_VAL_BALANCE,balance);


        return {status: 'success',  data:data};
      } catch(error) {
        return {status: 'fail', error: error.message};
      }
    }
  }
});
