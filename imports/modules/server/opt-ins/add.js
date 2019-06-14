import {Meteor} from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import {OptIns} from '../../../api/opt-ins/opt-ins.js';
import {logConfirm} from "../../../startup/server/log-configuration";

const AddOptInSchema = new SimpleSchema({
    name: {
        type: String
    }
});

const addOptIn = (optIn) => {
    try {
        const ourOptIn = optIn;
        AddOptInSchema.validate(ourOptIn);
        logConfirm('validating ourOptIn:', ourOptIn);
        const optIns = OptIns.find({nameId: ourOptIn.name}).fetch();
        if (optIns.length > 0) return optIns[0]._id;
        const optInId = OptIns.insert({
            nameId: ourOptIn.name,
            status: ['added']
        });

        return optInId;
    } catch (exception) {
        throw new Meteor.Error('opt-ins.add.exception', exception);
    }
};

export default addOptIn;
