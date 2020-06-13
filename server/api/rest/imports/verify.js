import { Api } from '../rest.js';
import verifyOptIn from '../../../../imports/modules/server/opt-ins/verify.js';
import verifyLocal from "../../../../imports/modules/server/opt-ins/verify_local";
import {logVerify} from "../../../../imports/startup/server/log-configuration";

Api.addRoute('opt-in/verify', {authRequired: true}, {
  get: {
    authRequired: false,
    action: function() {
        const qParams = this.queryParams;
        const bParams = this.bodyParams;
        let params = {}
        if(qParams !== undefined) params = {...qParams}
        if(bParams !== undefined) params = {...params, ...bParams}

      try {
        const val = verifyOptIn(params);
        return {status: "success", data: {val}};
      } catch(error) {
        return {statusCode: 500, body: {status: 'fail', message: error.message}};
      }
    }
  }
});

Api.addRoute('opt-in/verify-local', {authRequired: true}, {
    get: {
        authRequired: true,
        roleRequired : "admin",
        action: function() {

            const qParams = this.queryParams;
            const bParams = this.bodyParams;
            let params = {}
            if(qParams !== undefined) params = {...qParams}
            if(bParams !== undefined) params = {...params, ...bParams}

            try {
                logVerify('params:',params);
                const val = verifyLocal(params);

                return {status: "success", data: {val}};
            } catch(error) {
                return {statusCode: 500, body: {status: 'fail', message: error.message}};
            }
        }
    }
});

/**
 * Send a nameId has paramter and show current state of DOI
 * Parameters:
 *
 *  nameId: 06651D66040B72477751D4EB8D55D455D2B825E5FC912A317D58DD400F271F1F
 *  publicKey:
 *  senderEmail:
 *  recipientEmail:
 *
 * return: confirmations, SOI signature, DOI signature, DOI signature valid
 */
Api.addRoute('opt-in/verify-name', {authRequired: false}, {
    get: {
        authRequired: false,
        action: function() {
            const qParams = this.queryParams;
            const bParams = this.bodyParams;
            let params = {}
            if(qParams !== undefined) params = {...qParams}
            if(bParams !== undefined) params = {...params, ...bParams}

            try {
                const val = verifyOptIn(params);
                return {status: "success", data: {val}};
            } catch(error) {
                return {statusCode: 500, body: {status: 'fail', message: error.message}};
            }
        }
    }
});
