import {BLOCKCHAIN_INFO_VAL_CHAIN as chain, BLOCKCHAIN_INFO_VAL_BLOCKS as blocks,
    BLOCKCHAIN_INFO_VAL_DIFFICULTY as difficulty, BLOCKCHAIN_INFO_VAL_SIZE as size,
    BLOCKCHAIN_INFO_VAL_BALANCE as balance, ADDRESSES_BY_ACCOUNT as account,
    BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI as unconfirmed_balance,
    BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS as allrequesteddois,
    BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS as allconfirmeddois,
    BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS as ourrequesteddoi,
    BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS as ourconfirmeddois,
    LAST_CHECKED_BLOCK_KEY as lastCheckBlockKey
} from "./imports/startup/both/constants";

import {OptIns} from "./imports/api/opt-ins/opt-ins";
import {Recipients} from "./imports/api/recipients/recipients";
import {Senders} from "./imports/api/senders/senders";
import {Meta} from "./imports/api/meta/meta";


export const OptInsCollection = OptIns
export const RecipientsCollection = Recipients
export const SendersCollection = Senders
export const MetaCollection = Meta

export const BLOCKCHAIN_INFO_VAL_CHAIN = chain
export const BLOCKCHAIN_INFO_VAL_BLOCKS = blocks
export const BLOCKCHAIN_INFO_VAL_DIFFICULTY = difficulty
export const BLOCKCHAIN_INFO_VAL_SIZE = size
export const ADDRESSES_BY_ACCOUNT = account
export const BLOCKCHAIN_INFO_VAL_BALANCE = balance
export const BLOCKCHAIN_INFO_VAL_UNCONFIRMED_DOI = unconfirmed_balance
export const BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS = allrequesteddois
export const BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS = allconfirmeddois
export const BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS = ourrequesteddoi
export const BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS = ourconfirmeddois
export const LAST_CHECKED_BLOCK_KEY = lastCheckBlockKey