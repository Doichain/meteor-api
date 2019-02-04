import { Meteor } from 'meteor/meteor';
import { Meta } from '../meta'

Meteor.publish('meta.all', function () {
  return Meta.find({},  {
    fields: Meta.publicFields,
  });
});
