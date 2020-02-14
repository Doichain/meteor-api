import { Api } from '../rest.js';
import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base'
import SimpleSchema from 'simpl-schema';
import {Roles} from "meteor/alanning:roles";
import {logMain, logSend} from "../../../../imports/startup/server/log-configuration";

const mailTemplateSchema = new SimpleSchema({
    subject: {
        type: String,
        optional:true
    },
    senderName: {
        type: String,
        optional:true
    },
    redirect: {
        type: String,
   //    regEx: "@(https?|http)://(-\\.)?([^\\s/?\\.#-]+\\.?)+(/[^\\s]*)?$@",
        optional:true
    },
    returnPath: {
        type: String,
        regEx: SimpleSchema.RegEx.Email,
        optional:true
    },
    templateURL:{
        type: String,
    //    regEx: "@(https?|http)://(-\\.)?([^\\s/?\\.#-]+\\.?)+(/[^\\s]*)?$@",
        optional:true
    }
});

const createUserSchema = new SimpleSchema({
    username: {
      type: String,
      regEx: "^[A-Z,a-z,0-9,!,_,$,#]{4,24}$"  //Only usernames between 4-24 characters from A-Z,a-z,0-9,!,_,$,# allowed
    },
    email: {
      type: String,
      regEx: SimpleSchema.RegEx.Email
    },
    password: {
      type: String,
      regEx: "^[A-Z,a-z,0-9,!,_,$,#]{8,24}$" //Only passwords between 8-24 characters from A-Z,a-z,0-9,!,_,$,# allowed
    },
    mailTemplate:{
        type: mailTemplateSchema,
        optional:true
    }
  });

  const updateUserSchema = new SimpleSchema({
    mailTemplate:{
        type: mailTemplateSchema
    }
});

const collectionOptions =
  {
    path:"users",
    routeOptions:
    {
        authRequired : true
    },
    excludedEndpoints: ['patch','deleteAll'],
    endpoints:
    {
        get:
        {
            roleRequired : "admin",
            action: function(){
                const qParams = this.queryParams;
                const bParams = this.bodyParams;
                let params = {};
                if(qParams !== undefined) params = {...qParams}
                if(bParams !== undefined) params = {...params, ...bParams}

                try{
                    const userList = Meteor.users.find().fetch()
                    return {status: 'success', data: userList};
                } catch(error) {
                    return {statusCode: 400, body: {status: 'fail', message: error.message}};
                }
            }
        },
        delete:{roleRequired : "admin"},
        post:
        {
            roleRequired : "admin",
            action: function(){
                const qParams = this.queryParams;
                const bParams = this.bodyParams;
                let params = {};
                if(qParams !== undefined) params = {...qParams}
                if(bParams !== undefined) params = {...params, ...bParams}
                try{
                    let userId;
                    createUserSchema.validate(params);
                    logMain('validated',params);
                    if(params.mailTemplate !== undefined){
                        userId = Accounts.createUser({username:params.username,
                            email:params.email,
                            password:params.password,
                            profile:{mailTemplate:params.mailTemplate}});
                    }
                    else{
                        userId = Accounts.createUser({username:params.username,email:params.email,password:params.password, profile:{}});
                    }
                    return {status: 'success', data: {userid: userId}};
                } catch(error) {
                  return {statusCode: 400, body: {status: 'fail', message: error.message}};
                }

            }
        },
        put:
        {
            roleRequired : "admin",
            action: function(){
                const qParams = this.queryParams;
                const bParams = this.bodyParams;
                let params = {};
                let uid=this.userId;
                const paramId=this.urlParams.id;
                if(qParams !== undefined) params = {...qParams}
                if(bParams !== undefined) params = {...params, ...bParams}

                try{
                    logSend('received params to update user:'+uid,params);
                    updateUserSchema.validate(params);

                    const retValue = Meteor.users.update(this.urlParams.id,{$set:{"profile.mailTemplate":params.mailTemplate}});
                    if(!retValue){
                        throw Error("Failed to update user - user "+uid+" not found?");
                    }
                    return {status: 'success', data: {userid: this.urlParams.id, mailTemplate:params.mailTemplate}};
                } catch(error) {
                  return {statusCode: 400, body: {status: 'fail', message: error.message}};
                }
            }
        }
    }
}
Api.addCollection(Meteor.users,collectionOptions);
