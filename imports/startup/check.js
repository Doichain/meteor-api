import fetch from "node-fetch";
import { find } from "lodash";
import { Email } from "meteor/email";
const check = async () => {
    console.info('checking smtp settings and sending email'),
}
export default check;
/*
const check = async () => {
    let errors = {
        error: false
    };
    
    const Smtp = Meteor.settings.Smtp;
    
    process.env.MAIL_URL =
        "smtps://" +
        encodeURIComponent(Smtp.username) +
        ":" +
        encodeURIComponent(Smtp.password) +
        "@" +
        encodeURIComponent(Smtp.server) +
        ":" +
        encodeURIComponent(Smtp.port)

    //process.env.NODE_TLS_REJECT_UNAUTHORIZED = true;

    if (!Smtp) {
        printError(
            errors,
            "Smtp settings are missing: username, password, server, port"
        );
    } else {
        if (Smtp.username === undefined || Smtp.username === "")
            printError(errors, "Smtp.username is missing");
        if (Smtp.password === undefined || Smtp.password === "")
            printError(errors, "Smtp.password is missing");
        if (Smtp.server === undefined || Smtp.server === "")
            printError(errors, "Smtp.server is missing");
        if (Smtp.port === undefined || Smtp.port === "")
            printError(errors, "Smtp.port is missing");
    }
    if (!SendEmailtoAdmin)
        printError(errors, "SendEmailtoAdmin settings are missing: to and from");
    if (SendEmailtoAdmin.to === undefined || SendEmailtoAdmin.to === "") 
        printError(errors, "SendEmailtoAdmin.to is missing");
    if (SendEmailtoAdmin.from === undefined || SendEmailtoAdmin.from === "")
        printError(errors, "SendEmailtoAdmin.from is missing");

    if(!smtpSettingsValid(errors,SendEmailtoAdmin))
        printError(errors, "Authentication credentials invalid");
    
    if (!public) {
        printError(errors, "public settings are missing: url, email, notificationUrl, redirectUrl, BtcAddress, DoiAddress");
    } else {
        if (public.url === undefined || public.url === "")
            printError(errors, "url is missing");
        if (public.email === undefined || public.email === "")
            printError(errors, "public.email is missing");
        if (public.notificationUrl === undefined || public.notificationUrl === "")
            printError(errors, "public.notificationUrl is missing");
        if (public.redirectUrl === undefined || public.redirectUrl === "")
            printError(errors, "public.redirectUrl is missing");
        if (public.BtcAddress === undefined || public.BtcAddress === "")
            printError(errors, "public.BtcAddress is missing");
        if (public.DoiAddress === undefined || public.DoiAddress === "")
            printError(errors, "public.DoiAddress is missing");
    }
    return errors;
};

const printError = (errors, msg) => {
    console.error("Error: ", msg); 
    errors.error = true;
}

const smtpSettingsValid = (errors, SendEmailtoAdmin) => {

  if (Meteor.settings.Smtp.noValidate === true){
    console.warn("not checking smtp settings (\"noValidate\": true)- not sending startup email");
    return true;
  } 

  console.info(
    "checking smtp settings and sending a test email via",        
    `smtps://${Meteor.settings.Smtp.username}:******@${Meteor.settings.Smtp.server}:${Meteor.settings.Smtp.port}`    
  );

  var os = require("os");
  var hostname = os.hostname();
  let emailSubject = `Doi.Works SmtpCheck ${process.env.NODE_ENV} on ${hostname}.doi.works`;
  let emailBody = `Doi.Works server on https://${hostname}.doi.works started`;
  const to = SendEmailtoAdmin.to;
  const from = SendEmailtoAdmin.from;

  try {
    console.info(`sending email from:${from}, to:${to}`);
    Email.send({
      to,
      from,
      subject: emailSubject,
      text: emailBody,
    });
    return true;
  } catch (e) {
    console.error(e);
    printError(errors, e.response);
    return false;
  }
}

const snapshotAvailable = async (HetznerToken, SnapShotName, errors) => {

    const res = await fetch(
        "https://api.hetzner.cloud/v1/images?type=snapshot", {
            headers: {
                Authorization: "Bearer " + HetznerToken
            },
        }
    );

    const resObj = await res.json();
    if (resObj.error) {
        printError(errors, "Hetzner cloud authorization error " + resObj.error.message);
        return false;
    }

    const snapshot = find(resObj.images, function(o) {
        return o.description.startsWith(SnapShotName);
    })

    if (snapshot && snapshot.status === "available") {
        return true;
    } else {
        printError(errors, `Snapshot ${SnapShotName} not existing`);
        return false;
    }
    return false
}

export default check; */