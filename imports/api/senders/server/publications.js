import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/alanning:roles';
import { Senders } from '../senders.js';
import { OptIns} from '../../opt-ins/opt-ins.js'

Meteor.publish('senders.byOwner',function (){
  let pipeline=[];

  if(!Roles.userIsInRole(this.userId, ['admin'])){
    pipeline.push(
        {$redact:{
            $cond: {
              if: { $cmp: [ "$ownerId", this.userId ] },
              then: "$$PRUNE",
              else: "$$KEEP" }}});
  }

  pipeline.push({ $lookup: { from: "senders", localField: "sender", foreignField: "_id", as: "SenderEmail" } });
  pipeline.push({ $unwind: "$SenderEmail"});
  pipeline.push({ $project: {"SenderEmail._id":1}});

  const result = OptIns.aggregate(pipeline);
  let rIds=[];
  result.forEach(element => {
    rIds.push(element.SenderEmail._id);
  });
  return Senders.find({"_id":{"$in":rIds}},{fields:Senders.publicFields});
});

Meteor.publish('senders.all', function sendersAll() {
  if(!this.userId || !Roles.userIsInRole(this.userId, ['admin'])) {
    return this.ready();
  }

  return Senders.find({}, {
    fields: Senders.publicFields,
  });
});
