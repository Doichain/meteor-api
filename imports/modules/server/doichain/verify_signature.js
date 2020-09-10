import {Meteor} from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
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
        var publicKeyBuffer = new Buffer(ourData.publicKey, 'hex')
        var keyPair = bitcoin.ECPair.fromPublicKey(publicKeyBuffer)
        console.log(keyPair.publicKey.toString('hex'))
        console.log('GLOBAL.DEFAULT_NETWORK',GLOBAL.DEFAULT_NETWORK)
        const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: GLOBAL.DEFAULT_NETWORK  });
        console.log('address',address)
        const verified = bitcoinMessage.verify(ourData.data, address, ourData.signature) //doichainVerifySignature(ourData.data,address,ourData.signature)
        console.log("verified",verified)
        return verified
    } catch (exception) {
        throw new Meteor.Error('doichain.verifySignature.exception', exception);
    }
};

export default verifySignature;
