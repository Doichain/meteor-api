import {isDebug} from "./dapp-configuration";

var scribe = false;
if(scribe){
    require('scribe-js')();
    export const console = process.console;
}
export const sendModeTagColor = {msg : 'send-mode', colors : ['yellow', 'inverse']};
export const confirmModeTagColor = {msg : 'confirm-mode', colors : ['blue', 'inverse']};
export const verifyModeTagColor = {msg : 'verify-mode', colors : ['green', 'inverse']};
export const blockchainModeTagColor = {msg : 'blockchain-mode', colors : ['white', 'inverse']};
export const testingModeTagColor = {msg : 'testing-mode', colors : ['orange', 'inverse']};

export function logSend(message,param) {
    if(scribe) {if(isDebug()) {console.time().tag(sendModeTagColor).log(message,param?param:'');}}
    else console.log(message,param?param:'');
}

export function logConfirm(message,param) {
    if(scribe) {if(isDebug()) {console.time().tag(confirmModeTagColor).log(message, param?param:'');}}
    else console.log(message,param?param:'');
}

export function logVerify(message, param) {
    if(scribe) {if(isDebug()) {console.time().tag(verifyModeTagColor).log(message, param?param:'');}}
    else console.log(message,param?param:'');
}

export function logBlockchain(message, param) {
    if(scribe) {if(isDebug()){console.time().tag(blockchainModeTagColor).log(message, param?param:'');}}
    else console.log(message,param?param:'');
}

export function logMain(message, param) {
    if(scribe) {if(isDebug()){console.time().tag(blockchainModeTagColor).log(message, param?param:'');}}
    else console.log(message,param?param:'');
}

export function logError(message, param) {
    if(scribe) {if(isDebug()){console.time().tag(blockchainModeTagColor).error(message, param?param:'');}}
    else console.log(message,param?param:'');
}

export function testLogging(message, param) {
    if(scribe) {if(isDebug()){console.time().tag(testingModeTagColor).log(message, param?param:'');}}
    else console.log(message,param?param:'');
}