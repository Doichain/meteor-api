import {Meta} from "../../../api/meta/meta";

function storeMeta(blockchainInfoVal,data) {
    let val = data;
    let id = (Meta.findOne({key:blockchainInfoVal}))?Meta.findOne({key:blockchainInfoVal})._id:null
  //  if(Meta.findOne({key:blockchainInfoVal})) Meta.remove({key:blockchainInfoVal});

    if(val instanceof Object){ //if the data are an object
        val = data[blockchainInfoVal];
        if(val===undefined || val === null){ //e.g. in case its an array
            val = data;
            if(id) Meta.update({_id:id},{$set:{value: val,key:blockchainInfoVal}});
            else  Meta.insert({key:blockchainInfoVal, value: val});
        }else {
            if(id)Meta.update({_id:id},{$set:{value: val,key:blockchainInfoVal}});
            else Meta.insert({key:blockchainInfoVal, value: val});
        }
    }
    else {  //if its not an object
        if(id)Meta.update({_id:id},{$set:{value: val,key:blockchainInfoVal,stateDate:new Date()}});
        else Meta.insert({key:blockchainInfoVal, value: val});
    }
   // console.log("id:"+id+" val:"+val+" key:"+blockchainInfoVal)

}

export default storeMeta;
