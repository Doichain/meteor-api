import { Meteor } from 'meteor/meteor';
import { Job } from 'meteor/vsivsi:job-collection';
import SimpleSchema from 'simpl-schema';
import { MailJobs } from '../../../../server/api/mail_jobs.js';

const AddSendVerifyEmailMailJobSchema = new SimpleSchema({
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
  }
});

const addSendVerifyEmailMailJob = (mail) => {
  try {
    const ourMail = mail;
    AddSendVerifyEmailMailJobSchema.validate(ourMail);
    const job = new Job(MailJobs, 'sendVerifyEmail', ourMail);
    job.retry({retries: 5, wait: 60*1000 }).save();
  } catch (exception) {
    throw new Meteor.Error('jobs.addSendMail.exception', exception);
  }
};

export default addSendVerifyEmailMailJob;
