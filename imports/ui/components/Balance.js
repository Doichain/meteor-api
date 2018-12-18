import { Meteor } from 'meteor/meteor';
import React from 'react';
//import i18n from 'meteor/universe:i18n';
import BaseComponent from './BaseComponent.js';

export default class Balance extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = Object.assign(this.state, {
      balance: ""
    });
    this.generate = this.generate.bind(this);
    this.generate();
  }

  generate() {   
    Meteor.call("doichain.getBalance", (error, bal) => {
      const tmpVal = bal;
      if(!error) {
        this.setState({
          balance: tmpVal
        })
      }
    });
  }

  render() {
    return (
      <div className="balance">
        <label id="balanceAmount">{this.state.balance}</label>
      </div>
    )
  }
}
