import {getAddressesByAccount, getBalance, getInfo} from "../../../../server/api/doichain";
import {CONFIRM_CLIENT, SEND_CLIENT} from "../../../startup/server/doichain-configuration";
import storeMeta from "./store_meta";
import {BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI} from "../../../../server/api/rest/imports/status";
import checkNewTransaction from "./check_new_transactions";

function initMeta(){

    const data = getInfo(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT)

    const BLOCKCHAIN_INFO_VAL_CHAIN = "chain"
    storeMeta(BLOCKCHAIN_INFO_VAL_CHAIN,data)

    const BLOCKCHAIN_INFO_VAL_DIFFICULTY = "difficulty"
    storeMeta(BLOCKCHAIN_INFO_VAL_DIFFICULTY,data)

    const BLOCKCHAIN_INFO_VAL_BLOCKS = "blocks"
    storeMeta(BLOCKCHAIN_INFO_VAL_BLOCKS,data)

    const BLOCKCHAIN_INFO_VAL_SIZE = "size_on_disk"
    storeMeta(BLOCKCHAIN_INFO_VAL_SIZE,data);

    const BLOCKCHAIN_INFO_VAL_BALANCE = "balance"
    const balance=getBalance(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
    storeMeta(BLOCKCHAIN_INFO_VAL_BALANCE,balance)

    const unconfirmedBalance=0 //TODO if a new block comes in unconfirmed balance is usually 0 (but not always)  //getBalance(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
    storeMeta(BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI,unconfirmedBalance)

    const ADDRESSES_BY_ACCOUNT = "addresses_by_account"
    const addresses_by_account=getAddressesByAccount(SEND_CLIENT?SEND_CLIENT:CONFIRM_CLIENT);
    console.log("ADDRESSES_BY_ACCOUNT",addresses_by_account.length)
    storeMeta(ADDRESSES_BY_ACCOUNT,addresses_by_account)

    checkNewTransaction(null,null); //always put this to the end otherwise data might not yet got saved
}

export default initMeta