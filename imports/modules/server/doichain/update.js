import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import bitcoin from 'bitcoinjs-lib';
import { getSignature } from "doichain";
import { CONFIRM_CLIENT} from '../../../startup/server/doichain-configuration.js';
import {
    getWif,
    nameDoi,
    nameShow,
    getRawTransaction,
    getAddressInfo
} from "../../../../server/api/doichain";
import {
    API_PATH,
    DOI_CONFIRMATION_NOTIFY_ROUTE,
    VERSION
} from "../../../../server/api/rest/rest";
import {
    CONFIRM_ADDRESS
} from "../../../startup/server/doichain-configuration";
import {
    getHttpPUT
} from "../../../../server/api/http";
import {
    logConfirm
} from "../../../startup/server/log-configuration";
import getPrivateKeyFromWif from "./get_private-key_from_wif";
import decryptMessage from "./decrypt_message";
import {
    OptIns
} from "../../../api/opt-ins/opt-ins";
import getPublicKeyOfOriginTxId from "./getPublicKeyOfOriginTransaction";

const UpdateSchema = new SimpleSchema({
    nameId: {
        type: String
    },
    value: {
        type: String
    },
    host: {
        type: String,
        optional: true,
    },
    fromHostUrl: {
        type: String
    }
});

const update = (data, job) => {
    try {
        const ourData = data;

        UpdateSchema.validate(ourData);
        //in case confirmation happens if DOI doesn't even is registered as SOI we need to wait for the first block first
        //so we re-run this job until we have an entry

        //in case the confirmation happens if DOI has a registered DOI - the update can happen (but the second block still needs to be written)

        //stop this update until this name as at least 1 confirmation
        const name_data = nameShow(CONFIRM_CLIENT, ourData.nameId);
        if (name_data === undefined) {
            rerun(job);
            logConfirm('name not visible - delaying name update', ourData.nameId);
            return;
        }
        //if the doi is already safed in blockchain
        if (name_data.value.indexOf('doiSignature') != -1) {
            logConfirm('doiSignature found in DOI cancelling job', name_data);
            job.cancel();
            job.done();
            return;
        }

        logConfirm('updating txtId ' + name_data.txid + ' blockchain with doiSignature:', JSON.parse(ourData.value));

        const rawTransaction = getRawTransaction(CONFIRM_CLIENT, name_data.txid)

        let address = undefined
        rawTransaction.vout.forEach(function(output) { //checking out the correct output
            if (!address) {
                const our_address = output.scriptPubKey.addresses[0]
                if (getAddressInfo(CONFIRM_CLIENT, our_address).ismine) {
                    address = our_address
                }
            }
        })

        console.log('getting wif from address', address)
        const wif = getWif(CONFIRM_CLIENT, address);
        const privateKey = getPrivateKeyFromWif({
            wif: wif
        });
        logConfirm('got private key in order to decrypt Send-dApp host url from value:', ourData.fromHostUrl);

        const publicKey = getPublicKeyOfOriginTxId(name_data.txid);
        let ourfromHostUrl = decryptMessage({
            publicKey: publicKey,
            privateKey: privateKey,
            message: ourData.fromHostUrl
        });

        if (!ourfromHostUrl.endsWith("/")) ourfromHostUrl += "/"
        logConfirm('decrypted fromHostUrl', ourfromHostUrl);
        const url = ourfromHostUrl + API_PATH + VERSION + "/" + DOI_CONFIRMATION_NOTIFY_ROUTE;

        logConfirm('creating signature with ADDRESS ' + CONFIRM_ADDRESS + " nameId:", ourData.value); //TODO CONFIRM_ADDRESS should be the related to the public key configured in the DNS
        // const signature = signMessage(CONFIRM_CLIENT, CONFIRM_ADDRESS, ourData.nameId); //second signature here over nameId
        const keyPair = bitcoin.ECPair.fromWIF(wif, GLOBAL.DEFAULT_NETWORK);
        const signature = getSignature(ourData.nameId, keyPair)
        logConfirm('signature created:', signature);

        const updateData = {
            nameId: ourData.nameId,
            signature: signature,
            host: ourData.host
        };

        try {
            const txid = nameDoi(CONFIRM_CLIENT, ourData.nameId, ourData.value, null);
            logConfirm('name_doi of transaction txid:', txid);
            OptIns.update({
                nameId: ourData.nameId
            }, {
                $push: {
                    status: 'DOI written'
                }
            });
            //here alice gets informed about the update - alice checks the signature of the DOI signature whihc is not valid at this time!
            //TODO alice should try to take the information from mempool and exract the doi signature from raw transaction
            logConfirm('contacting send dApp (Alice) about confirmed doi via url:' + url + ' with updateData' + JSON.stringify(updateData));
            const response = getHttpPUT(url, updateData);
            logConfirm("response:", response.data)
            job.done();
        } catch (exception) {
            logConfirm('this nameDOI doesn´t have a block yet and will be updated with the next block and with the next queue start:', ourData.nameId);
            if (exception.toString().indexOf("there is already a registration for this doi name") == -1) {
                OptIns.update({
                    nameId: ourData.nameId
                }, {
                    $set: {
                        error: JSON.stringify(exception.message)
                    }
                });
            }
            throw new Meteor.Error('doichain.update.exception name_doi', exception);
        }

    } catch (exception) {
        throw new Meteor.Error('doichain.update.exception', exception);
    }
};

function rerun(job) {
    logConfirm('rerunning txid in 10sec - canceling old job', '');
    job.cancel();
    logConfirm('restart blockchain doi update', '');
    job.restart({
            //repeats: 600,   //0 = only once - default forever
            // This is the default
            //wait: 10000   // Wait 10 sec between repeats
            // Default is previous setting
        },
        function(err, result) {
            if (result) {
                logConfirm('rerunning txid in 10sec:', result);
            }
        }
    );
}

export default update;