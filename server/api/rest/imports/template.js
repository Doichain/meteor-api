import { DOI_MAILTEMPLATE_ROUTE, Api } from "../rest";
const DEFAULT_MAILTEMP_EN = Meteor.absoluteUrl()+"/templates/emails/doichain-anmeldung-final-EN.html";
const DEFAULT_MAILTEMP_DE = Meteor.absoluteUrl()+"/templates/emails/doichain-anmeldung-final-DE.html";

Api.addRoute(DOI_MAILTEMPLATE_ROUTE, {authRequired: false}, {
    get: {
      action: function() {
        const params = this.queryParams;
        if(params.lang=="en"){
            return {
                statusCode: 303,
                headers: {'Content-Type': 'text/plain', 'Location': DEFAULT_MAILTEMP_EN},
                body: 'Location: '+DEFAULT_MAILTEMP_EN
              };
        }
        if(params.lang=="de"){
            return {
                statusCode: 303,
                headers: {'Content-Type': 'text/plain', 'Location': DEFAULT_MAILTEMP_DE},
                body: 'Location: '+DEFAULT_MAILTEMP_DE
              };
        }
        else{
          return {
              statusCode: 303,
              headers: {'Content-Type': 'text/plain', 'Location': DEFAULT_MAILTEMP_DE},
              body: 'Location: '+DEFAULT_MAILTEMP_DE
            };
      }
      }
    }
});