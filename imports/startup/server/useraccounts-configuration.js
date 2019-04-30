import { Accounts } from 'meteor/accounts-base';
import {getSettings } from 'meteor/doichain:settings';

//TODO please manage this over settings.json! since this causes security problems - forbidlientAccountCreation should be false
//when installed on a dapp
/*const accounts_sendVerificationEmail = getSettings('accounts.sendVerificationEmail',true);
const accounts_forbidClientAccountCreation = getSettings('accounts.forbidClientAccountCreation',false);

console.log(Accounts.config.toString())
Accounts.config({
    sendVerificationEmail: accounts_sendVerificationEmail,
    forbidClientAccountCreation: accounts_forbidClientAccountCreation
});
*/


Accounts.emailTemplates.from=getSettings('Accounts.emailTemplates.from','doichain@le-space.de');