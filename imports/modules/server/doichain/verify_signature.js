import {Meteor} from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {network} from "doichain"
const bitcoin = require('bitcoinjs-lib')
const bitcoinMessage = require('bitcoinjs-message')
import {logVerify} from "../../../startup/server/log-configuration";

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

const verifySignature = (data) => {
    try {
        const ourData = data;
        logVerify('verifySignature:', ourData);
        VerifySignatureSchema.validate(ourData);
        var publicKeyBuffer = Buffer.from(ourData.publicKey, 'hex')
        var keyPair = bitcoin.ECPair.fromPublicKey(publicKeyBuffer)
        logVerify("publicKey",keyPair.publicKey.toString('hex'))
      //  logVerify('GLOBAL.DEFAULT_NETWORK',GLOBAL.DEFAULT_NETWORK)
        const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: GLOBAL.DEFAULT_NETWORK  });
        logVerify('address',address)
        logVerify('doichain.network.DEFAULT_NETWORK.messagePrefix',GLOBAL.DEFAULT_NETWORK.messagePrefix)
        const verified = bitcoinMessage.verify(ourData.data, address, ourData.signature, GLOBAL.DEFAULT_NETWORK.messagePrefix) //doichainVerifySignature(ourData.data,address,ourData.signature)
        logVerify("verified",'_'+verified+'_')
        return verified
    } catch (exception) {
        throw new Meteor.Error('doichain.verifySignature.exception', exception);
    }
};

export default verifySignature;
