import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/alanning:roles';
import { OptIns } from '../opt-ins.js';

Meteor.publish('opt-ins.all', function OptInsAll() {
  if(!this.userId) {
    return this.ready();
  }
  const filter = {$and: [ {recipient: {$exists: true}}, {sender: {$exists: true}}]}

  if(!Roles.userIsInRole(this.userId, ['admin'])){
    filter.ownerId=this.userId
    return OptIns.find(filter, {
      fields: OptIns.publicFields,
      sort: {createdAt: -1}
    });
  }

  return OptIns.find(filter, {
    fields: OptIns.publicFields,
    sort: {createdAt: -1}
  });
});

Meteor.publish('confirmations.all', function OptInsAll() {

  if(!this.userId) {
    return this.ready();
  }
  const filter = {} //{$and: [ {recipient: {$exists: false}}, {sender: {$exists: false}}]}

  if(!Roles.userIsInRole(this.userId, ['admin'])){
    filter.ownerId=this.userId
    return OptIns.find(filter, {
      fields: OptIns.publicFields,
      sort: {createdAt: -1}
    });
  }

  return OptIns.find(filter, {
    fields: OptIns.publicFields,
    sort: {createdAt: -1}
  });
});

