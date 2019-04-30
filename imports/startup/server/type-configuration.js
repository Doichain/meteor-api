export const SEND_APP = "send";
export const CONFIRM_APP = "confirm";
export const VERIFY_APP = "verify";

import { getSettings} from "meteor/doichain:settings";

export function isAppType(type) {
  const types = getSettings('app.types',[SEND_APP,VERIFY_APP]); //by default only enable send and verify mode
  return _.contains(types, type);
}
