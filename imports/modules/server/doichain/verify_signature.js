import {Meteor} from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';

var bitcore = require('bitcore');
import Message from 'bitcore-message';

import {logError, logVerify} from "../../../startup/server/log-configuration";

const VerifySignatureSchema = new SimpleSchema({
    data: {
        type: String
    },
    publicKey: {
        type: String
    },
    signature: {
        type: String
    }
});

const NETWORK = bitcore.Networks.add({
    name: 'doichain',
    alias: 'doichain',
    pubkeyhash: 0x34,
    privatekey: 0xB4,
    scripthash: 13,
    networkMagic: 0xf9beb4fe,
});

const verifySignature = (data) => {
    try {
        const ourData = data;
        logVerify('verifySignature:', ourData);
        VerifySignatureSchema.validate(ourData);
        const address = bitcore.Address.fromPublicKey(new bitcore.PublicKey(ourData.publicKey), NETWORK);
        try {
            return Message(ourData.data).verify(address, ourData.signature);
        } catch (error) {
            logError(error)
        }
        return false;
    } catch (exception) {
        throw new Meteor.Error('doichain.verifySignature.exception', exception);
    }
};

export default verifySignature;
