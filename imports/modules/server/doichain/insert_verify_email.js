import SimpleSchema from "simpl-schema";
import {Meteor} from "meteor/meteor";

const InsertVerifyEmail = new SimpleSchema({
    nameId: {
        type: String
    }
});

const insertVerifyEmail = (data) => {
    const ourData = data;
    try {
        InsertVerifyEmail.validate(ourData);

    } catch(exception) {
        throw new Meteor.Error('doichain.insertVerifyEmail.exception', exception);
    }
}

export default insertVerifyEmail
