import SimpleSchema from 'simpl-schema';
import getOptInKey from "../dns/get_opt-in-key";
import getAddress from "./get_address";
import {logSend} from "../../../startup/server/log-configuration";

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
    logSend('destAddress validator via dns ', destAddress);
    return {publicKey:publicKey,destAddress:destAddress};
};

export default getPublicKeyAndAddress;
