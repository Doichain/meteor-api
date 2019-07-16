import { Meteor } from 'meteor/meteor';
import {logBlockchain, logConfirm, logError} from "../../imports/startup/server/log-configuration";

const NAMESPACE = 'e/';
const DOI_FEE = '0.03';

export function getWif(client, address) {
  if(!address){
        address = getAddressesByAccount("")[0];
        logBlockchain('address was not defined so getting the first existing one of the wallet:',address);
  }
  if(!address){
        address = getNewAddress("");
        logBlockchain('address was never defined  at all generated new address for this wallet:',address);
  }
  const syncFunc = Meteor.wrapAsync(doichain_dumpprivkey);
  return syncFunc(client, address);
}

function doichain_dumpprivkey(client, address, callback) {
  const ourAddress = address;
  client.cmd('dumpprivkey', ourAddress, function(err, data) {
    if(err)  logError('doichain_dumpprivkey:',err);
    callback(err, data);
  });
}

export function validateAddress(client, address) {
    const syncFunc = Meteor.wrapAsync(doichain_validateaddress);
    return syncFunc(client, address);
}

function doichain_validateaddress(client, address, callback) {
    const ourAddress = address;
    client.cmd('validateaddress', ourAddress, function(err, data) {
        if(err)  logError('validateaddress:',{address:address,err:err,client:client});
        callback(err, data);
    });
}

export function getAddressesByAccount(client, account) {
    const syncFunc = Meteor.wrapAsync(doichain_getaddressesbyaccount);
    const our_account = account!==undefined?account:"";
    return syncFunc(client, our_account);
}

function doichain_getaddressesbyaccount(client, account, callback) {
    const ourAccount = account;
    client.cmd('getaddressesbyaccount', ourAccount, function(err, data) {
        if(err)  logError('getaddressesbyaccount:',err);
        callback(err, data);
    });
}

export function getNewAddress(client, account) {
    const syncFunc = Meteor.wrapAsync(doichain_getnewaddress);
    return syncFunc(client, account);
}

function doichain_getnewaddress(client, account, callback) {
    const ourAccount = account;
    client.cmd('getnewaddress', ourAccount, function(err, data) {
        if(err)  logError('getnewaddress:',err);
        callback(err, data);
    });
}

export function signMessage(client, address, message) {
    const syncFunc = Meteor.wrapAsync(doichain_signMessage);
    return syncFunc(client, address, message);
}

function doichain_signMessage(client, address, message, callback) {
    const ourAddress = address;
    const ourMessage = message;
    client.cmd('signmessage', ourAddress, ourMessage, function(err, data) {
        callback(err, data);
    });
}

export function nameShow(client, id) {
  const syncFunc = Meteor.wrapAsync(doichain_nameShow);
  return syncFunc(client, id);
}

function doichain_nameShow(client, id, callback) {
  const ourId = checkId(id);
  logConfirm('doichain-cli name_show :',ourId);
  client.cmd('name_show', ourId, function(err, data) {
    if(err !== undefined && err !== null && err.message.startsWith("name not found")) {
      err = undefined,
      data = undefined
    }
    callback(err, data);
  });
}

export function feeDoi(client, address) {
    const syncFunc = Meteor.wrapAsync(doichain_feeDoi);
    return syncFunc(client, address);
}

function doichain_feeDoi(client, address, callback) {
    const destAddress = address;
    client.cmd('sendtoaddress', destAddress, DOI_FEE, function(err, data) {
        callback(err, data);
    });
}

export function nameDoi(client, name, value, address) {
    const syncFunc = Meteor.wrapAsync(doichain_nameDoi);
    return syncFunc(client, name, value, address);
}

function doichain_nameDoi(client, name, value, address, callback) {
    const ourName = checkId(name);
    const ourValue = value;
    const destAddress = address;
    if(!address) {
        client.cmd('name_doi', ourName, ourValue, function (err, data) {
            callback(err, data);
        });
    }else{
        client.cmd('name_doi', ourName, ourValue, destAddress, function(err, data) {
            callback(err, data);
        });
    }
}

export function listSinceBlock(client, block) {
    const syncFunc = Meteor.wrapAsync(doichain_listSinceBlock);
    var ourBlock = block;
    if(ourBlock === undefined) ourBlock = null;
    return syncFunc(client, ourBlock);
}

function doichain_listSinceBlock(client, block, callback) {
    var ourBlock = block;
    if(ourBlock === null) client.cmd('listsinceblock', function(err, data) {
        callback(err, data);
    });
    else client.cmd('listsinceblock', ourBlock, function(err, data) {
        callback(err, data);
    });
}

export function getTransaction(client, txid) {
    const syncFunc = Meteor.wrapAsync(doichain_gettransaction);
    return syncFunc(client, txid);
}

function doichain_gettransaction(client, txid, callback) {
    logConfirm('doichain_gettransaction:',txid);
    client.cmd('gettransaction', txid, function(err, data) {
        if(err)  logError('doichain_gettransaction:',err);
        callback(err, data);
    });
}

export function getRawTransaction(client, txid) {
    const syncFunc = Meteor.wrapAsync(doichain_getrawtransaction);
    return syncFunc(client, txid);
}

function doichain_getrawtransaction(client, txid, callback) {
    logBlockchain('doichain_getrawtransaction:',txid);
    client.cmd('getrawtransaction', txid, 1, function(err, data) {
        if(err)  logError('doichain_getrawtransaction:',err);
        callback(err, data);
    });
}

export function getBalance(client) {
    const syncFunc = Meteor.wrapAsync(doichain_getbalance);
    return syncFunc(client);
}

function doichain_getbalance(client, callback) {
    client.cmd('getbalance', function(err, data) {
        if(err) { logError('doichain_getbalance:',err);}
        callback(err, data);
    });
}

export function doichainSendToAddress(client, address, amount) {
    console.log("doichainSendToAddress now "+address+" to",amount)
    const syncFunc = Meteor.wrapAsync(doichain_send_to_address);
    return syncFunc(client, address, amount);
}

function doichain_send_to_address(client, address, amount, callback) {
    console.log("doichain_send_to_address now "+address+" to",amount)
    client.cmd('sendtoaddress', address, amount, function(err, data) {
        if(err) { logError('doichain_send_to_address:',err);}
        callback(err, data);
    });
}

export function getInfo(client) {
    const syncFunc = Meteor.wrapAsync(doichain_getinfo);
    return syncFunc(client);
}

function doichain_getinfo(client, callback) {
    client.cmd('getblockchaininfo', function(err, data) {
        if(err) { logError('doichain-getinfo:',err);}
        callback(err, data);
    });
}

function checkId(id) {
    const DOI_PREFIX = "doi: ";
    let ret_val = id; //default value

    if(id.startsWith(DOI_PREFIX)) ret_val = id.substring(DOI_PREFIX.length); //in case it starts with doi: cut  this away
    if(!id.startsWith(NAMESPACE)) ret_val = NAMESPACE+id; //in case it doesn't start with e/ put it in front now.
  return ret_val;
}
