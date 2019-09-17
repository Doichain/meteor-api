import {CONFIRM_CLIENT} from "../../../startup/server/doichain-configuration";
import {getRawTransaction} from "../../../../server/api/doichain";

const getPublicKeyOfOriginTransaction = (txid) => {
    const rawTx = getRawTransaction(CONFIRM_CLIENT,txid)
    console.log("rawTx",rawTx)
    const asm = rawTx.vin[0].scriptSig.asm;
    console.log("asm",asm)
    const publicKey = asm.substring(asm.indexOf('[ALL] ')+6)
    console.log("publicKey",publicKey)
    return publicKey;
}

export default getPublicKeyOfOriginTransaction