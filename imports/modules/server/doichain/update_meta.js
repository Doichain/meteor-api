import {getaddressesbylabel, getBalance, getInfo} from "../../../../server/api/doichain";
import {CONFIRM_CLIENT, SEND_CLIENT} from "../../../startup/server/doichain-configuration";
import storeMeta from "./store_meta";
import {logError,logBlockchain} from "../../../../imports/startup/server/log-configuration"
import {
    BLOCKCHAIN_INFO_VAL_CHAIN, BLOCKCHAIN_INFO_VAL_BLOCKS,
    BLOCKCHAIN_INFO_VAL_DIFFICULTY, BLOCKCHAIN_INFO_VAL_SIZE,
    BLOCKCHAIN_INFO_VAL_BALANCE, ADDRESSES_BY_ACCOUNT, BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI
} from "../../../startup/both/constants";

function updateMeta(){
    logBlockchain('updating meta')
    try {
        const data = getInfo(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT)

        storeMeta(BLOCKCHAIN_INFO_VAL_CHAIN,data)
        storeMeta(BLOCKCHAIN_INFO_VAL_DIFFICULTY,data)
        storeMeta(BLOCKCHAIN_INFO_VAL_BLOCKS,data)
        storeMeta(BLOCKCHAIN_INFO_VAL_SIZE,data);

        const balance=getBalance(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
        storeMeta(BLOCKCHAIN_INFO_VAL_BALANCE,balance)
        const unconfirmedBalance=0 //TODO if a new block comes in unconfirmed balance is usually 0 (but not always)  //getBalance(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
        storeMeta(BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI,unconfirmedBalance)
        const addresses_by_account=getaddressesbylabel(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
        storeMeta(ADDRESSES_BY_ACCOUNT,addresses_by_account)
        logBlockchain('updated meta data blocks:',data)
    }catch (e) {
        logError("error while updating blockchain meta data",e)
    }

}

export default updateMeta
