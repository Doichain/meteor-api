import {Meteor} from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {logConfirm} from "../../../startup/server/log-configuration";
import {DoichainEntries} from "../../../api/doichain/entries";

const UpdateDoichainEntrySchema = new SimpleSchema({
    name: {
        type: String
    },
    verifyLocalHash: {
        type: String
    }
});

const updateDoichainEntry = (entry) => {
    try {
        logConfirm('updateDoichainEntry entry:', entry);
        const ourEntry = entry;
        UpdateDoichainEntrySchema.validate(ourEntry);
        logConfirm('ourEntry.verifyLocalHash:', ourEntry.verifyLocalHash);

        DoichainEntries.update({name: ourEntry.name},
            {$set:{verifyLocalHash: ourEntry.verifyLocalHash}} );

    } catch (exception) {
        throw new Meteor.Error('opt-ins.updateDoichainEntry.exception', exception);
    }
};

export default updateDoichainEntry;
