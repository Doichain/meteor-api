import { Api } from '../rest.js'
import {getInfo} from "../../doichain"
import { CONFIRM_CLIENT,SEND_CLIENT} from "../../../../imports/startup/server/doichain-configuration"
import {DOI_BLOCKNOTIFY_ROUTE, DOI_WALLETNOTIFY_ROUTE} from "../rest"
import {logConfirm, logMain} from "../../../../imports/startup/server/log-configuration"
import checkNewTransaction from "../../../../imports/modules/server/doichain/check_new_transactions"
import updateMeta from "../../../../imports/modules/server/doichain/update_meta";
import {Meta} from "../../../../imports/api/meta/meta";
import {
  BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS,
  BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS,
  BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS,
  BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS,
} from "../../../../imports/startup/both/constants";

Api.addRoute('status', {authRequired: false}, {
  get: {
    action: function() {
      try {
        const data = getInfo(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
        data.allRequestedDOIs = Meta.findOne({key: BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS}).value
        data.allConfirmedDOIs = Meta.findOne({key: BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS}).value
        data.ourRequestedDOIs = Meta.findOne({key: BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS}).value
        data.ourConfirmedDOIs = Meta.findOne({key: BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS}).value
        return {"status": "success", "data":data};
      }catch(ex){
            return {"status": "failed", "data": ex.toString()};
      }
    }
  }
});

var txidFilter = []
Api.addRoute(DOI_WALLETNOTIFY_ROUTE, {authRequired: false},{
  get: {
    authRequired: false,
    action: function() {
      const params = this.queryParams;
      const tx = params.tx;
      try {
       // const foundTxs = _.find(txidFilter, (ourTx) => ourTx.tx===tx)
       // logConfirm('walletnotfiy called - checking transaction with tx:' +(tx?tx:' block arrived or no txid in parameter'),
         //   _.find(txidFilter,  (ourTx) => ourTx.tx==tx)?'found':'not found');
        if(!_.find(txidFilter, (ourTx) => ourTx.tx===tx)) {
          txidFilter.push({tx:tx, date:new Date()})
          checkNewTransaction(tx);
        }
        //we cleanup the txidFilter after we put a value inside - which should protect us for double calls (for the change) which is anyways recorded by our later logic
        for(let i = 0; i<txidFilter.length;i++ ){
          if(txidFilter[i].date.getTime()+(1000*10) <  new Date().getTime()) //if older then 1 minute we delete them from the txfilter
            logMain("deleting tx from txidFilter: "+i,txidFilter[i])
            txidFilter.splice(i, 1);
        }

        return {status: 'success',  data:'tx:'+tx+' was read from blockchain'};
      } catch(error) {
        return {status: 'fail', error: error.message};
      }
    }
  }
});

Api.addRoute(DOI_BLOCKNOTIFY_ROUTE, {authRequired: false},{
  get: {
    authRequired: false,
    action: function() {
      const params = this.queryParams;
      try {
          checkNewTransaction(undefined,params.block);
          updateMeta();
        return {status: 'success',  data: Meta.findOne({"key" : "blocks"}).value}
      } catch(error) {
        return {status: 'fail', error: error.message}
      }
    }
  }
});
