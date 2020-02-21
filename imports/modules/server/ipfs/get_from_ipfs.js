import {isRegtest} from "../../../startup/server/dapp-configuration";
import {IPFS} from "../../../../server/api/ipfs";

/**
 * Gets data from IPFS node (in regtest ipfs node must run on localhost, in testnet and mainnet we spin up ipfs-lite node)
 *  //TODO start ipfs-(lite)-node when starting Doichain-dApp
 * @param cid
 * @returns {Promise<string>}
 */
const getFromIPFS = async (cid) => {
    let data
    await (async function() {
        console.log('getFromIPFS with cid '+cid)
        const lite = await IPFS()
        data = await lite.getFile(cid)
        console.log("got an email from alice to verify",data.toString())
      //  await lite.stop()
    })()
    return data.toString()
}
export default getFromIPFS
