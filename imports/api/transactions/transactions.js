import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

class TransactionsCollection extends Mongo.Collection {
    insert(transaction, callback) {
        const ourTransaction = transaction;
        ourTransaction.createdAt = ourTransaction.createdAt || new Date();
        const result = super.insert(ourTransaction, callback);
        return result;
    }
    update(selector, modifier) {
        const result = super.update(selector, modifier);
        return result;
    }
    remove(selector) {
        const result = super.remove(selector);
        return result;
    }
}

export const Transactions = new TransactionsCollection('transactions');

// Deny all client-side updates since we will be using methods to manage this collection
Transactions.deny({
    insert() { return true; },
    update() { return true; },
    remove() { return true; },
});

Transactions.schema = new SimpleSchema({
    _id: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
    },
    txid: {
        type: String
    },
    n: {
      type: Number
    },
    category: {
        type: String
    },
    amount: {
        type: Number
    },
    fee: {
        type: Number
    },
    confirmations : {
        type: Number
    },
    senderAddress:{
        type: String,
        optional:true
    },
    address:{
        type:String
    },
    nameId: {
        type: String,
        optional:true
    },
    nameValue: {
        type: String,
        optional: true
    },
    createdAt: {
        type: Date
    }
});

Transactions.attachSchema(Transactions.schema);

Transactions.publicFields = {
    txid: 1,
    createdAt: 1
};
