import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import { Job } from 'meteor/vsivsi:job-collection';
import { BlockchainJobs } from '../../../../server/api/blockchain_jobs.js';

const AddUpdateBlockchainJobSchema = new SimpleSchema({
  nameId: {
    type: String
  },
  value: {
    type: String
  },
  fromHostUrl: {
    type: String
  },
  host: {
      type: String
  }
});

const addUpdateBlockchainJob = (entry) => {
  try {
    const ourEntry = entry;
    AddUpdateBlockchainJobSchema.validate(ourEntry);
    const job = new Job(BlockchainJobs, 'update', ourEntry);
    job.retry({retries: 360, wait: 1*10*1000 }).save();
  } catch (exception) {
    throw new Meteor.Error('jobs.addUpdateBlockchain.exception', exception);
  }
};

export default addUpdateBlockchainJob;
