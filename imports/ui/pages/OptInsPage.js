import React from 'react';
import i18n from 'meteor/universe:i18n';
import BaseComponent from '../components/BaseComponent.js';
import Header from '../components/Header.js';
import Message from '../components/Message.js';
import Item from '../components/Item.js';
import RecipientElement from '../components/RecipientElement.js';
import PropTypes from 'prop-types';

export default class OptInsPage extends BaseComponent {
  constructor(props) {
    super(props);
  }
  
  render() {
    const { optIns,recipients, loading } = this.props;
    let recById={};
    recipients.forEach(element => {
      recById[element._id]=element;
    });

    let OptIns;
    if(!optIns || !optIns.length) {
      OptIns = (
        <Message
          title={i18n.__('pages.optInsPage.noOptIns')}
        />
      );
    } else {
      OptIns = (
        optIns.map(optIn => (
          <Item
            keys={[
              {
                key: "id",
                name: i18n.__('pages.optInsPage.id'),
                value: optIn._id
              },
              {
                key: "recipient",
                name: i18n.__('pages.optInsPage.recipient'),
                value: <RecipientElement {...recById[optIn.recipient]}/>
              },
              {
                key: "sender",
                name: i18n.__('pages.optInsPage.sender'),
                value: optIn.sender
              },
              {
                key: "data",
                name: i18n.__('pages.optInsPage.data'),
                value: optIn.data?subJson(optIn.data):"",
                json: true
              },
              {
                key: "screenshot",
                name: i18n.__('pages.optInsPage.screenshot'),
                value: optIn.data?parseScreenshot(optIn.data):"",
                image: true
              },
              {
                key: "nameId",
                name: i18n.__('pages.optInsPage.nameId'),
                value: optIn.nameId
              },
              {
                key: "createdAt",
                name: i18n.__('pages.optInsPage.createdAt'),
                value: optIn.createdAt?optIn.createdAt.toISOString():""
              },
              {
                key: "confirmedAt",
                name: i18n.__('pages.optInsPage.confirmedAt'),
                value: optIn.confirmedAt ? optIn.confirmedAt.toISOString() : ""
              },
              {
                key: "confirmedBy",
                name: i18n.__('pages.optInsPage.confirmedBy'),
                value: optIn.confirmedBy
              },
              {
                key: "txId",
                name: i18n.__('pages.optInsPage.txId'),
                value: optIn.txId
              },
              {
                key: "error",
                name: i18n.__('pages.optInsPage.error'),
                value: optIn.error
              }
            ]}
            key={optIn._id}
          />
        ))
      );
    }

    return (
      <div className="page opt-ins-show">
        <Header title={i18n.__('pages.optInsPage.title')}/>
        <div className="opt-ins-items content-scrollable">
          {loading
            ? <Message title={i18n.__('pages.optInsPage.loading')} />
            : OptIns}
        </div>
      </div>
    );
  }
}

function subJson(json){
  if(!json){
    return "";
  }
  let tmp = json;
  let rD = JSON.parse(tmp);
  if(rD.screenshot){ 
    delete rD.screenshot;
  }
  return JSON.stringify(rD);
}

function parseScreenshot(json){
  if(!json){
    return "";
  }
  return JSON.parse(json).screenshot ? JSON.parse(json).screenshot:""
}

OptInsPage.propTypes = {
  optIns: PropTypes.array,
  loading: PropTypes.bool
};
