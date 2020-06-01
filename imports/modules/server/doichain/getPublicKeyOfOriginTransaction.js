import {CONFIRM_CLIENT} from "../../../startup/server/doichain-configuration";
import {getRawTransaction} from "../../../../server/api/doichain";

const getPublicKeyOfOriginTxId = (txid,parent) => {
    const rawTx = getRawTransaction(CONFIRM_CLIENT,txid)
    return getPublicKeyOfRawTransaction(rawTx,parent)
}

export const getPublicKeyOfRawTransaction = (rawTx,parent) => {

    if(rawTx.vin && rawTx.vin[0].scriptSig){ //try to get the public key from the input of this transaction
        const asm = rawTx.vin[0].scriptSig.asm;
        const indexOfPubKey = rawTx.vin[0].scriptSig.asm.indexOf('[ALL] ')
        const lengthOfAsm = rawTx.vin[0].scriptSig.asm.length
        if(indexOfPubKey!=-1)
        {
            //TODO could be we have more then one vin - then we have more then one publicKey
            const publicKey = asm.substring(indexOfPubKey+6,lengthOfAsm) //TODO is this safe? is this always like this? Guess not.
            return publicKey;
        }
    }
    console.log('couldnt find publicKey origin tx is coinbase transaction? ',rawTx.txid)
    return undefined
}

export default getPublicKeyOfOriginTxId
