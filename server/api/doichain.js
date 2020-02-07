import { Meteor } from 'meteor/meteor';
import {logBlockchain, logError} from "../../imports/startup/server/log-configuration";

const NAMESPACE = 'e/';
const NAMESPACE_VERIFIED_EMAIL = 'es/';
const DOI_FEE = '0.03';
const VERIEFIED_EMAIL_FEE = '0.011';

export function getWif(client, address) {
  if(!address){
        address = getAddressesByAccount(client,"")[0];
        logBlockchain('address was not defined so getting the first existing one of the wallet:',address);
  }
  if(!address){
        address = getNewAddress(client,"");
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

export function generateBlock(client, blocks) {
    const syncFunc = Meteor.wrapAsync(doichain_generateBlock);
    return syncFunc(client, blocks);
}

function doichain_generateBlock(client, blocks, callback) {
    const ourBlocks = blocks;
    client.cmd('generate', ourBlocks, function(err, data) {
        if(err)  logError('doichain_generate:',err);
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
export function nameList(client) {
    const syncFunc = Meteor.wrapAsync(doichain_nameList);
    return syncFunc(client);
}

function doichain_nameList(client, callback) {
    client.cmd('name_list', function(err, data) {
        if(err !== undefined && err !== null && err.message.startsWith("name not found")) {
            err = undefined,
                data = undefined
        }
        callback(err, data);
    });
}

export function nameShow(client, nameId) {
  const syncFunc = Meteor.wrapAsync(doichain_nameShow);
  return syncFunc(client, nameId);
}

function doichain_nameShow(client, nameId, callback) {
    console.log("name_show",nameId)
  const ourId = checkId(nameId);
    console.log("name_show",ourId)
  client.cmd('name_show', ourId, function(err, data) {
    callback(err, data);
  });
}

export function nameHistory(client,nameId) {
    const ourNameID = nameId;
    const syncFunc = Meteor.wrapAsync(doichain_nameHistory);
    return syncFunc(client,ourNameID);
}

function doichain_nameHistory(client, nameId, callback) {
    const ourNameID = nameId;
    client.cmd('name_history', ourNameID, function(err, data) {
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

export function sendRawTransaction(client, tx) {
    const syncFunc = Meteor.wrapAsync(doichain_sendrawtransaction);
    return syncFunc(client, tx);
}

function doichain_sendrawtransaction(client, tx, callback) {
    console.log('sending raw transaction',tx)
    client.cmd('sendrawtransaction', tx , function(err, data) {
        callback(err, data);
    });
}

export function getRawMemPool(client) {
    const syncFunc = Meteor.wrapAsync(doichain_getrawmempool);
    return syncFunc(client);
}

function doichain_getrawmempool(client, callback) {
    client.cmd('getrawmempool', function(err, data) {
        callback(err, data);
    });
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
export function getBlockCount(client) {
    const syncFunc = Meteor.wrapAsync(doichain_getblockcount);
    return syncFunc(client);
}

function doichain_getblockcount(client, callback) {
    client.cmd('getblockcount', function(err, data) {
        if(err)  logError('doichain_getblockcount:',err);
        callback(err, data);
    });
}


export function getBlockHash(client, height) {
    const syncFunc = Meteor.wrapAsync(doichain_getblockhash);
    return syncFunc(client, height);
}

function doichain_getblockhash(client, height, callback) {
    client.cmd('getblockhash', height, function(err, data) {
        if(err)  logError('doichain_getblockhash:',err);
        callback(err, data);
    });
}

export function getBlock(client, blockhash) {
    const syncFunc = Meteor.wrapAsync(doichain_getblock);
    return syncFunc(client, blockhash);
}

function doichain_getblock(client, blockhash, callback) {
    client.cmd('getblock', blockhash, function(err, data) {
        if(err)  logError('doichain_getblock:',err);
        callback(err, data);
    });
}

export function listTransactions(client, account) {
    const syncFunc = Meteor.wrapAsync(doichain_listtransactions);
    return syncFunc(client, account);
}

function doichain_listtransactions(client, account, callback) {
    client.cmd('listtransactions', account,100000,0,true,function(err, data) {
        if(err)  logError('doichain_listtransactions:',err);
        callback(err, data);
    });
}

export function getTransaction(client, txid) {
    const syncFunc = Meteor.wrapAsync(doichain_gettransaction);
    return syncFunc(client, txid);
}

function doichain_gettransaction(client, txid, callback) {
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
    client.cmd('getrawtransaction', txid, 1, function(err, data) {
        if(err)  logError('doichain_getrawtransaction:',err);
        callback(err, data);
    });
}

export function importAddress(client, address) {
    const syncFunc = Meteor.wrapAsync(doichain_importaddress);
    return syncFunc(client, address);
}

function doichain_importaddress(client, address, callback) {
    client.cmd('importaddress', address, address, true, function(err, data) {
        if(err) { logError('doichain_importaddress:', err);}
        callback(err, data);
    });
}

export function importPubkey(client, pubkey) {
    const syncFunc = Meteor.wrapAsync(doichain_importpubkey);
    return syncFunc(client, pubkey);
}

function doichain_importpubkey(client, pubkey, callback) {
    client.cmd('importpubkey', pubkey, function(err, data) {
        if(err) { logError('doichain_importpubkey:', err);}
        callback(err, data);
    });
}

export function listUnspentNew(client) {
    const syncFunc = Meteor.wrapAsync(list_unspent);
    return syncFunc(client);
}
export function listUnspent(client, address) {
    const syncFunc = Meteor.wrapAsync(list_unspent);
    return syncFunc(client, address);
}

function list_unspent(client, address, callback) {
    client.cmd('listunspent', 1,9999999,[address], function(err, data) {
        if(err) { logError('list_unspent:', err);}
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

/**
 * 1. checks if an id starts with doi: if yes it will be removed
 * 2. checks if an id doesn't start with e/ (DOI-permission) and not with es/ (Email signature) and optionaly putting a e/ as default
 */
function checkId(id) {
    const DOI_PREFIX = "doi: ";
    let ret_val = id; //default value
    if(id.startsWith(DOI_PREFIX)) ret_val = id.substring(DOI_PREFIX.length); //in case it starts with doi: cut  this away
    if(!id.startsWith(NAMESPACE) && !id.startsWith(NAMESPACE_VERIFIED_EMAIL)) ret_val = NAMESPACE+id; //in case it doesn't start with e/ put it in front now.
    return ret_val;
}
