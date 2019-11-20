import { Api } from '../rest.js';
Api.addRoute('debug/mail', {authRequired: false}, {
  get: {
    action: function() {
      const data = {
        "from": "noreply@doichain.org",
        "subject": "Doichain.org Newsletter Bestätigung",
        "redirect": "thank-you-de.html",
        "contentType": "html",
        "returnPath": "noreply@doichain.org",
        "content":"<html><body>" +
            "<h5>Hi, </h5><p>Please confirm the following link, so we are allowed send you emails! ${confirmation_url}</p><p>Kind regards your Doichain.org team</p>"+
            "</body></html>"
      }

      return {"status": "success", "data": data};
    }
  }
});
