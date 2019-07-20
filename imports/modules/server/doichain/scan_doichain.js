import { Meteor } from 'meteor/meteor';
import { CONFIRM_CLIENT} from '../../../startup/server/doichain-configuration.js';
import {getBlockHash, listSinceBlock, nameShow, validateAddress} from "../../../../server/api/doichain";
import storeMeta from "./store_meta";
import {
  BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS,
  BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS,
  BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS,
  BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS,
  LAST_CHECKED_BLOCK_KEY
} from "../../../startup/both/constants";
import {Meta} from "../../../api/meta/meta";
//import {LAST_CHECKED_BLOCK_KEY} from "../../../startup/both/constants"


const scan_Doichain = () => {
    
  //try {

    let firstBlock = getBlockHash(CONFIRM_CLIENT,0)

    if(!Meta.findOne({key: BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS})){
        firstBlock = Meta.findOne({key: LAST_CHECKED_BLOCK_KEY}).value;
    }else{

    }
    console.log('scanning doichain from block ',firstBlock)

    let allRequestedDois = 0;
    let allConfirmedDois = 0;
    let ourRequestedDois = 0;
    let ourConfirmedDois = 0;

    const blockDetails = listSinceBlock(CONFIRM_CLIENT,firstBlock)
    blockDetails.transactions.forEach(function (it) {
        if(it.name){
          const name_id = it.name.substring(5)
          const doiDetails = nameShow(CONFIRM_CLIENT,name_id)
          if(doiDetails){
            const doiValue = doiDetails.value
            const valueObject = JSON.parse(doiValue)
            const hasSignature = valueObject.signature?true:false
            const hasDoiSignature = valueObject.doiSignature?true:false

            const isOurRecord = validateAddress(CONFIRM_CLIENT,doiDetails.address).ismine

            if(isOurRecord){
              if(hasDoiSignature)ourConfirmedDois++
              if(hasSignature)  ourRequestedDois++

            }
            if(hasDoiSignature) allConfirmedDois++
            if(hasSignature) allRequestedDois++


          }else console.log(name_id+" doesn't have details")

        }
    })

    console.log("allRequestedDois",allRequestedDois)
    console.log("allConfirmedDois",allConfirmedDois)
    console.log("ourRequestedDois",ourRequestedDois)
    console.log("ourConfirmedDois",ourConfirmedDois)

    storeMeta(BLOCKCHAIN_INFO_VAL_ALLREQUESTEDDOIS,allRequestedDois)
    storeMeta(BLOCKCHAIN_INFO_VAL_ALLCONFIRMEDDOIS,allConfirmedDois)
    storeMeta(BLOCKCHAIN_INFO_VAL_OURREQUESTEDDOIS,ourRequestedDois)
    storeMeta(BLOCKCHAIN_INFO_VAL_OURCONFIRMEDDOIS,ourConfirmedDois)

 /* } catch(exception) {
    throw new Meteor.Error('doichain.scanDoichain.exception', exception);
  }*/
  return true;
};

export default scan_Doichain;

