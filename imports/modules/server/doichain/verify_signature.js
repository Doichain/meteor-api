import {Meteor} from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import bitcore from 'bitcore'
import Message from 'bitcore-message';
import {logError, logVerify} from "../../../startup/server/log-configuration";
import {isRegtest, isTestnet} from "../../../startup/server/dapp-configuration";

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

/*
const NETWORK = bitcore.Networks.add({
    name: 'doichain',
    alias: 'doichain',
    pubkeyhash: 0x34,
    privatekey: 0xB4,
    scripthash: 13,
    networkMagic: 0xf9beb4fe,
}); */

var doichainMainnet = bitcore.Networks.add({
    name:  'doichain',
    alias: 'doichain',
    // https://github.com/namecoin/namecore/commit/4b33389f2ed7809404b1a96ae358e148a765ab6f
    pubkeyhash: 111, //mainnet 52  //111 testnet  //0x34 (bitcoin?)
    privatekey: 0xB4,  //TODO this doesn't seem correct
    scripthash: 13, //TODO  please double check ?
    // xpubkey: 0x043587cf,
    // xprivkey: 0x04358394,
    // xpubkey: null, // HD extended pubkey (nonexistant in namecoin o.g.)
    // xprivkey: null, // HD extended privkey (nonexistant in namecoin o.g.)
    networkMagic: 0xf9beb4fe, //TODO  please double check ?
    port: 8338,
    dnsSeeds: []
});

//TODO in case of mainnet please change this here.
const doichainTestnet = bitcore.Networks.add({
    name:  'doichain-testnet',
    alias: 'doichain-testnet',
    pubkeyhash: 111,  //mainnet 52  //111 testnet  //0x34 (bitcoin?)
    privatekey: 0xB4,  //TODO  please double check ?
    scripthash: 13, //TODO  please double check ?
    networkMagic: 0xf9beb4fe, //TODO  please double check ?
    port: 18338,
    dnsSeeds: []
});

const verifySignature = (data) => {
    try {
        const ourData = data;
        logVerify('verifySignature:', ourData);
        VerifySignatureSchema.validate(ourData);

        if(isRegtest() || isTestnet())
            bitcore.Networks.defaultNetwork =  bitcore.Networks.get('doichain-testnet')
        else
            bitcore.Networks.defaultNetwork =  bitcore.Networks.get('doichain')

        const address = bitcore.Address.fromPublicKey(new bitcore.PublicKey(ourData.publicKey));
        const verify = Message(ourData.data).verify(address, ourData.signature)
        try {
            return verify
        } catch (error) {
            logError(error)
        }
        return false;
    } catch (exception) {
        throw new Meteor.Error('doichain.verifySignature.exception', exception);
    }
};

export default verifySignature;
