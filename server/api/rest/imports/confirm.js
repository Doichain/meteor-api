import { Api, DOI_CONFIRMATION_ROUTE } from '../rest.js';
import confirmOptIn from '../../../../imports/modules/server/opt-ins/confirm.js'
import {logConfirm} from "../../../../imports/startup/server/log-configuration";
import {EMAIL_VERIFY_CONFIRMATION_ROUTE} from "../rest";
import {getWif, nameDoi} from "../../doichain";
import {CONFIRM_CLIENT, SEND_CLIENT} from "../../../../imports/startup/server/doichain-configuration";
import decryptMessage from "../../../../imports/modules/server/doichain/decrypt_message";
import getPrivateKeyFromWif from "../../../../imports/modules/server/doichain/get_private-key_from_wif";
import {IPFS} from "../../ipfs";
//doku of meteor-restivus https://github.com/kahmali/meteor-restivus
Api.addRoute(DOI_CONFIRMATION_ROUTE + '/:token', {authRequired: false}, {
  get: {
    action: function () {
      // const hash = this.urlParams.hash;
      const token = this.urlParams.token
      try {
        let ip = getRemoteIP(this.request)
        if (ip.indexOf(',') != -1) ip = ip.substring(0, ip.indexOf(','));

        logConfirm('REST opt-in/confirm :', {token: token, host: ip});
        const redirect = confirmOptIn({host: ip, token: token});

        return {
          statusCode: 303,
          headers: {'Content-Type': 'text/plain', 'Location': redirect},
          body: 'Location: ' + redirect
        };
      } catch (error) {
        return {statusCode: 500, body: {status: 'fail', message: error.message}};
      }
    }
  }
});

Api.addRoute(EMAIL_VERIFY_CONFIRMATION_ROUTE + '/:token/:cid/:address', {authRequired: false}, {
  get: {
    action: function () {
      const token = this.urlParams.token
      const cid = this.urlParams.cid
      const address = this.urlParams.address
      try {
        let ip = getRemoteIP(this.request)

        if (ip.indexOf(',') != -1) ip = ip.substring(0, ip.indexOf(','));
        logConfirm('REST email/confirm :', {token: token , cid: cid, address: address, host: ip});
        const privateKeyWif = getWif(CONFIRM_CLIENT, address) //TODO incase we support multiple private keys we should check which one we are using here (which address)
        const privateKey = getPrivateKeyFromWif({wif: privateKeyWif})
        logConfirm('privateKey',privateKey)

        const ipfsData = Async.runSync((done) => {
          getFromIPFS(cid).then((ipfsData) => {
            done(null, ipfsData);
          })
        }).result

        logConfirm('ipfsData',ipfsData.toString())
        const decryptedDataObjectFromIPFS = decryptMessage({
          message: ipfsData.toString(),
          privateKey: privateKey
        })
        logConfirm('decryptedDataObjectFromIPFS',decryptedDataObjectFromIPFS)
        const dataObjectFromIPFS = JSON.parse(decryptedDataObjectFromIPFS)
        let status = 'fail'
        if(dataObjectFromIPFS.confirmationToken === token){ //confirm in blockchain
          status='success'
          const nameDoiTx = nameDoi(CONFIRM_CLIENT, dataObjectFromIPFS.nameId, 'verified',false);
          logConfirm('writing to blockchain',nameDoiTx)
        }

        logConfirm("dataFromIPFS (confirmed email token", JSON.parse(decryptedDataObjectFromIPFS));
        return {
          headers: {'Content-Type': 'application/json'},
          body: {status: status, data:JSON.parse(decryptedDataObjectFromIPFS)}
        }
      } catch (error) {
        return {statusCode: 500, body: {status: 'fail', message: error.message}};
      }
    }
  }
});

const getFromIPFS = async (cid) => {
  console.log('getting data for cid',cid)
    const lite = await IPFS()
    const our_data = await lite.getFile(cid)
    return our_data
}

const getRemoteIP = (request) => {
  return request.headers['x-forwarded-for'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      (request.connection.socket ? request.connection.socket.remoteAddress: null);
}
