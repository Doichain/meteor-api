import {Meta} from "../../../api/meta/meta";

function storeMeta(blockchainInfoVal,data) {
    let val = data;

    if(Meta.find({key:blockchainInfoVal}).count() > 0)
        Meta.remove({key:blockchainInfoVal});

    if(val instanceof String){
        Meta.insert({key:blockchainInfoVal, value: val});
    }

    if(val instanceof Object){
        val = data[blockchainInfoVal];
        if(val===undefined || val === null){ //e.g. in case its an array
            val = data;
            Meta.insert({key:blockchainInfoVal, value: val});
        }else{
            Meta.insert({key:blockchainInfoVal, value: val});
        }

    }
}

export default storeMeta;