import { Meteor } from 'meteor/meteor';
import { Job } from 'meteor/vsivsi:job-collection';
import SimpleSchema from 'simpl-schema';
import { MailJobs } from '../../../../server/api/mail_jobs.js';

const AddSendMailJobSchema = new SimpleSchema({
  /*from: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },*/
  to: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  subject: {
    type: String,
  },
  message: {
    type: String,
  },
  contentType: {
    type: String,
    optional: true
  },
  returnPath: {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  }
});

const addSendMailJob = (mail) => {
  try {
    const ourMail = mail;
    AddSendMailJobSchema.validate(ourMail);
    const job = new Job(MailJobs, 'send', ourMail);
    job.retry({retries: 5, wait: 60*1000 }).save();
  } catch (exception) {
    throw new Meteor.Error('jobs.addSendMail.exception', exception);
  }
};

export default addSendMailJob;
