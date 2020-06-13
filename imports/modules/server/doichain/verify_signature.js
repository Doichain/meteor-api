import {Meteor} from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
const bitcoin = require('bitcoinjs-lib')
import {verifySignature as doichainVerifySignature, network} from 'doichain'
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
        var publicKey = bitcoin.ECPair.fromPublicKey(publicKeyBuffer)
        const { address } = bitcoin.payments.p2pkh({ pubkey: publicKey.publicKey });
        //const { address } = bitcoin.payments.p2pkh({ pubkey: ourData.publicKey })
        const verified = doichainVerifySignature(ourData.data,address,ourData.signature)
        return verified
    } catch (exception) {
        throw new Meteor.Error('doichain.verifySignature.exception', exception);
    }
};

export default verifySignature;
