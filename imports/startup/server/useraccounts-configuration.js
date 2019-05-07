import { Accounts } from 'meteor/accounts-base';
import {getSettings } from 'meteor/doichain:settings';

    const accounts_disableConfig = getSettings('accounts.disableConfig');
    if(accounts_disableConfig === undefined || accounts_disableConfig===false){
        const accounts_sendVerificationEmail = getSettings('accounts.sendVerificationEmail',true);
        const accounts_forbidClientAccountCreation = getSettings('accounts.forbidClientAccountCreation',true);
        Accounts.config({
            sendVerificationEmail: accounts_sendVerificationEmail,
            forbidClientAccountCreation: accounts_forbidClientAccountCreation
        });
        Accounts.emailTemplates.from=getSettings('Accounts.emailTemplates.from','doichain@le-space.de');
    }
