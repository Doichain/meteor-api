import {Meta} from "../../../api/meta/meta";

function storeMeta(blockchainInfoVal,data) {
    let val = data;
    if(val instanceof Object) val = data[blockchainInfoVal];
    console.log(val);
    if(Meta.find({key:blockchainInfoVal}).count() > 0){
        Meta.remove({key:blockchainInfoVal});
    }
    console.log("updating meta:"+blockchainInfoVal,val)
    if(!data[blockchainInfoVal]){
        console.log(data)
    }
    Meta.insert({key:blockchainInfoVal, value: val});
}

export default storeMeta;