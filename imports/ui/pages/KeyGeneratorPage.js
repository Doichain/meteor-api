import React from 'react';
import i18n from 'meteor/universe:i18n';
import BaseComponent from '../components/BaseComponent.js';
import Header from '../components/Header.js';
import KeyGenerator from '../components/KeyGenerator.js';

class KeyGeneratorPage extends BaseComponent {
  render() {
    return (
      <div className="page key-generator">
        <Header title={i18n.__('pages.keyGeneratorPage.title')}/>
        <div className="content-scrollable">
          <KeyGenerator />
        </div>
      </div>
    );
  }
}

export default KeyGeneratorPage;
