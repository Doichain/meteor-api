import {Meteor} from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import crypto from 'crypto';
import ecies from 'standard-ecies';
import CryptoJS from 'crypto-js'

const DecryptMessageSchema = new SimpleSchema({
    privateKey: {
        type: String
    },
    publicKey: {
        type: String,
        optional: true
    },
    message: {
        type: String
    }
});

/**
 * This method decrypts a message, right now in two different ways:
 *
 * 1. with standard-ecies (doesn't work with browsers afaik)
 * 2. through a shared secret found by ECDH and AES encryption
 * - https://www.npmjs.com/package/crypto-js
 * - https://stackoverflow.com/questions/36598638/generating-ecdh-keys-in-the-browser-through-webcryptoapi-instead-of-the-browseri
 * - https://medium.com/@dealancer/how-to-using-bitcoin-key-pairs-to-for-encrypted-messaging-a0a980e627b1
 * - https://www.reddit.com/r/btc/comments/8dhiu2/encrypt_a_private_message_to_any_bitcoin_address/
 *
 * @param data
 * @returns {*}
 */
const decryptMessage = (data) => {
    try {
        const ourData = data;
        DecryptMessageSchema.validate(ourData);
        const privateKey = Buffer.from(ourData.privateKey, 'hex');
        const ecdh = crypto.createECDH('secp256k1');
        ecdh.setPrivateKey(privateKey, 'hex');
        try {
            const message = Buffer.from(ourData.message, 'hex');
            return ecies.decrypt(ecdh, message).toString('utf8');
        } catch (exception0) {
            console.log(exception0)
            //try to decrypt with shared secret and aes (we use the following option in the javascript library - the upper in hte classic dApp
            //TODO this is an extremely dirthy hack which needs to be solved. In future we might remove the first variant
            console.log('standard dApp ecies decryption didn`t work, truying ecdh with a shared secret')
            const secret = ecdh.computeSecret(ourData.publicKey, 'hex').toString('hex')
            const bytes = CryptoJS.AES.decrypt(ourData.message, secret);
            const message = bytes.toString(CryptoJS.enc.Utf8);
            return message
        }
    } catch (exception1) {
        console.log('exception 1', exception1)
        throw new Meteor.Error('doichain.decryptMessage.exception', exception1);
    }
};

export default decryptMessage;
