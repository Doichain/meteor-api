import {CONFIRM_CLIENT} from "../../../startup/server/doichain-configuration";
import {getRawTransaction} from "../../../../server/api/doichain";

const getPublicKeyOfOriginTxId = (txid) => {
    const rawTx = getRawTransaction(CONFIRM_CLIENT,txid)
    const asm = rawTx.vin[0].scriptSig.asm;
    const publicKey = asm.substring(asm.indexOf('[ALL] ')+6) //TODO is this safe? is this always like this? Guess not.
    return publicKey;
}
export const getPublicKeyOfRawTransaction = (rawTx) => {
   // const rawTx = getRawTransaction(CONFIRM_CLIENT,txid)
    const asm = rawTx.vin[0].scriptSig.asm;
    const publicKey = asm.substring(asm.indexOf('[ALL] ')+6) //TODO is this safe? is this always like this? Guess not.
    return publicKey;
}

export default getPublicKeyOfOriginTxId
