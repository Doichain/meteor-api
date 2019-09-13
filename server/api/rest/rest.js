import { Restivus } from 'meteor/nimble:restivus';
import { isDebug } from '../../../imports/startup/server/dapp-configuration.js';
import { SEND_APP, CONFIRM_APP, VERIFY_APP, isAppType } from '../../../imports/startup/server/type-configuration.js';

export const DOI_CONFIRMATION_ROUTE = "opt-in/confirm";
export const DOI_CONFIRMATION_NOTIFY_ROUTE = "opt-in";
export const DOI_BLOCKNOTIFY_ROUTE = "blocknotify";
export const DOI_WALLETNOTIFY_ROUTE = "walletnotify";

export const DOICHAIN_GET_PUBLICKEY_BY_PUBLIC_DNS = "getpublickeybypublicdns";
export const DOICHAIN_IMPORT_PUBKEY = "importpubkey";
export const DOICHAIN_LIST_UNSPENT = "listunspent";
export const DOICHAIN_BROADCAST_TX = "sendrawtransaction";

export const DOI_FETCH_ROUTE = "doi-mail";
export const DOI_EXPORT_ROUTE = "export";
export const DOI_MAILTEMPLATE_ROUTE = "template";
export const API_PATH = "api/";
export const VERSION = "v1";

export const Api = new Restivus({
  apiPath: API_PATH,
  version: VERSION,
  useDefaultAuth: true,
  prettyJson: true,
  enableCors: true,
});

if(isDebug()) require('./imports/debug.js');
if(isAppType(SEND_APP)) require('./imports/send.js');
if(isAppType(CONFIRM_APP)) require('./imports/confirm.js');
if(isAppType(VERIFY_APP)) require('./imports/verify.js');
require('./imports/template.js');
require('./imports/user.js');
require('./imports/status.js');
