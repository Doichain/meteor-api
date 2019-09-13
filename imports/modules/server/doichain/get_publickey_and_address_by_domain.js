import SimpleSchema from 'simpl-schema';
import {logSend} from "../../../startup/server/log-configuration";

import getOptInKey from "../dns/get_opt-in-key";
import getOptInProvider from "../dns/get_opt-in-provider";
import getAddress from "./get_address";

const GetPublicKeySchema = new SimpleSchema({
    domain: {
        type: String
    }
});

const getPublicKeyAndAddress = (data) => {

    const ourData = data;
    GetPublicKeySchema.validate(ourData);

    let publicKey = getOptInKey({domain: ourData.domain}).key;
    const destAddress =  getAddress({publicKey: publicKey});
    logSend('publicKey and destAddress ', {publicKey:publicKey,destAddress:destAddress});
    return {publicKey:publicKey,destAddress:destAddress};
};

export default getPublicKeyAndAddress;