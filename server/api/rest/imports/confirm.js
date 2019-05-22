import { Api, DOI_CONFIRMATION_ROUTE } from '../rest.js';
import confirmOptIn from '../../../../imports/modules/server/opt-ins/confirm.js'

import {logConfirm} from "../../../../imports/startup/server/log-configuration";
//doku of meteor-restivus https://github.com/kahmali/meteor-restivus
Api.addRoute(DOI_CONFIRMATION_ROUTE+'/:hash', {authRequired: false}, {
  get: {
    action: function() {
      const hash = this.urlParams.hash;
      try {
        let ip = this.request.headers['x-forwarded-for'] ||
          this.request.connection.remoteAddress ||
          this.request.socket.remoteAddress ||
          (this.request.connection.socket ? this.request.connection.socket.remoteAddress: null);

          if(ip.indexOf(',')!=-1)ip=ip.substring(0,ip.indexOf(','));

          logConfirm('REST opt-in/confirm :',{hash:hash, host:ip});
          const redirect = confirmOptIn({host: ip, hash: hash});

        return {
          statusCode: 303,
          headers: {'Content-Type': 'text/plain', 'Location': redirect},
          body: 'Location: '+redirect
        };
      } catch(error) {
        return {statusCode: 500, body: {status: 'fail', message: error.message}};
      }
    }
  }
});