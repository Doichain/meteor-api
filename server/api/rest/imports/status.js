import { Api } from '../rest.js'
import {getInfo} from "../../doichain"
import { CONFIRM_CLIENT,SEND_CLIENT} from "../../../../imports/startup/server/doichain-configuration"
import {DOI_BLOCKNOTIFY_ROUTE, DOI_WALLETNOTIFY_ROUTE} from "../rest"
import {logConfirm} from "../../../../imports/startup/server/log-configuration"
import checkNewTransaction from "../../../../imports/modules/server/doichain/check_new_transactions"
import updateMeta from "../../../../imports/modules/server/doichain/update_meta";
import {Meta} from "../../../../imports/api/meta/meta";
import {
  BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS,
  BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS,
  BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS,
  BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS,
} from "../../../../imports/startup/both/constants";
import scan_Doichain from "../../../../imports/modules/server/doichain/scan_doichain";
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

Api.addRoute(DOI_WALLETNOTIFY_ROUTE, {authRequired: false},{
  get: {
    authRequired: false,
    action: function() {
      const params = this.queryParams;
      const tx = params.tx;

      try {
        logConfirm('checking transaction with tx:',{tx});
        checkNewTransaction(tx,null);
       // scan_Doichain()
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
      try {
          logConfirm('new block has arrrived','')
          updateMeta();
        return {status: 'success',  data: Meta.findOne({"key" : "blocks"}).value}
      } catch(error) {
        return {status: 'fail', error: error.message}
      }
    }
  }
});
