import {isRegtest} from "../../imports/startup/server/dapp-configuration";
import {setupLibP2PHost, MemoryDatastore} from "@textile/ipfs-lite/dist/setup";
import {BlockStore, Peer} from "@textile/ipfs-lite";

var host = undefined
var store = undefined
var lite = undefined
export const IPFS = async () => {
    if(!host){
        if(isRegtest())
            host = await setupLibP2PHost(undefined, undefined, ['/ip4/0.0.0.0/tcp/0'])
        else
            host = await setupLibP2PHost()
        //let { MemoryDatastore } = require('interface-datastore')
        store = new BlockStore(new MemoryDatastore())
        lite = new Peer(store, host)
        await lite.start()
        console.log('returning new ipfs host regtest is',isRegtest())
        return lite
    }else{
        if(!store) store = new BlockStore(new MemoryDatastore())
        if(!lite) lite = new Peer(store, host)
        await lite.start()
        console.log('returning existing ipfs host')
        return lite
    }
}
