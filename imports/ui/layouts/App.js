import React from 'react';
import PropTypes from 'prop-types';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import { Meteor } from 'meteor/meteor';
import UserMenu from '../components/UserMenu.js';
import PageMenu from '../components/PageMenu.js';
import LanguageToggle from '../components/LanguageToggle.js';
import ConnectionNotification from '../components/ConnectionNotification.js';
import Loading from '../components/Loading.js';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import getMuiTheme from 'material-ui/styles/getMuiTheme';
import lightBaseTheme from 'material-ui/styles/baseThemes/lightBaseTheme';
import Item from '../components/Item.js';

const CONNECTION_ISSUE_TIMEOUT = 5000;

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      menuOpen: false,
      showConnectionIssue: false,
    };
    this.toggleMenu = this.toggleMenu.bind(this);
    this.logout = this.logout.bind(this);
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({ showConnectionIssue: true });
    }, CONNECTION_ISSUE_TIMEOUT);
  }

  toggleMenu(menuOpen = !Session.get('menuOpen')) {
    Session.set({ menuOpen });
  }

  logout() {
    Meteor.logout();
  }

  render() {
    const { showConnectionIssue } = this.state;
    const {
      user,
      connected,
      loading,
      menuOpen,
      children,
      location,
      version
    } = this.props;

    // eslint-disable-next-line react/jsx-no-bind
    const closeMenu = this.toggleMenu.bind(this, false);

    // clone route components with keys so that they can
    // have transitions
    const clonedChildren = children && React.cloneElement(children, {
      key: location.pathname
    });
    let versionInfo = version ? JSON.parse(version): null;
    return (
        <MuiThemeProvider muiTheme={getMuiTheme(lightBaseTheme)}>
          <div id="container" className={menuOpen ? 'menu-open' : ''}>
            <section id="menu">
              <LanguageToggle />
              <UserMenu user={user} logout={this.logout} />
              <PageMenu user={user}/>
              {version ? <Item
               keys={[
                 {
                   key: "branch",
                   name: "version",
                   value: versionInfo.branch},
                   {
                    key: "id",
                    name: "time",
                    value: versionInfo.timestamp},
                    {
                      key: "commit",
                      name: "commit",
                      value: versionInfo.commit}
                    ]}
              />:null}
            </section>
            {showConnectionIssue && !connected
              ? <ConnectionNotification />
              : null}
            <div className="content-overlay" onClick={closeMenu} />
            <div id="content-container">
              <ReactCSSTransitionGroup
                transitionName="fade"
                transitionEnterTimeout={200}
                transitionLeaveTimeout={200}
              >
                {loading
                  ? <Loading key="loading" />
                  : clonedChildren}
              </ReactCSSTransitionGroup>
            </div>
          </div>
      </MuiThemeProvider>
    );
  }
}

App.propTypes = {
  user: PropTypes.object,      // current meteor user
  connected: PropTypes.bool,   // server connection status
  loading: PropTypes.bool,     // subscription status
  menuOpen: PropTypes.bool,    // is side menu open?
  children: PropTypes.element, // matched child route component
  location: PropTypes.object,  // current router location
  params: PropTypes.object,    // parameters of the current route
};

App.contextTypes = {
  router: PropTypes.object,
};
