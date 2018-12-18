import React from 'react';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import i18n from 'meteor/universe:i18n';
import AppContainer from '../../ui/containers/AppContainer.js';
import StartPage from '../../ui/pages/StartPage.js';
import KeyGeneratorPage from '../../ui/pages/KeyGeneratorPage.js';
import BalancePage from '../../ui/pages/BalancePage.js';
import NotFoundPage from '../../ui/pages/NotFoundPage.js';
import RecipientsPageContainer from '../../ui/containers/RecipientsPageContainer.js';
import OptInsPageContainer from '../../ui/containers/OptInsPageContainer.js';
import requireRole from './require_role.js';
import { Accounts, STATES } from 'meteor/std:accounts-ui';
Meteor.subscribe("version");


Accounts.ui.config({
    passwordSignupFields: 'USERNAME_AND_EMAIL',
    loginPath: '/signin',
    //signUpPath: '/signup',
    changePasswordPath: '/change-password',
    resetPasswordPath: '/reset-password',
    profilePath: '/profile',
    minimumPasswordLength: 8,
    forbidClientAccountCreation : true
});
i18n.setLocale('en');

export const renderRoutes = () => (
  <Router history={ browserHistory }>
    <Route path="/" component={ AppContainer }>
      <IndexRoute component={ StartPage } />
      <Route path="key-generator" component={KeyGeneratorPage} />
      <Route component={requireRole(BalancePage, ['admin'])} path="balance"/>
      <Route component={requireRole(RecipientsPageContainer, ['admin'])} path="recipients"/>
      <Route component={OptInsPageContainer} path="opt-ins"/>
      <Route path="/signin" component={() => <Accounts.ui.LoginForm />} />
      {/*<Route path="/signup" component={() => <Accounts.ui.LoginForm formState={STATES.SIGN_UP} />} />*/}
      <Route path="/change-password" component={() => <Accounts.ui.LoginForm formState={STATES.PASSWORD_CHANGE} />} />

     
      <Route path="*" component={ NotFoundPage } />
    </Route>
  </Router>
);
