import { Meteor } from 'meteor/meteor';
import { Meta } from '../meta'

Meteor.publish('meta', function () {
  return Meta.find({},  {
    fields: Meta.publicFields,
  });
});
