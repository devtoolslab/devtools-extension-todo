// This file can use
// chrome.tabs.*
// chrome.extension.*

chrome.extension.onConnect.addListener(function (port) {
    var tabId = '';

    var extensionListener = function (message, sender, sendResponse) {

        if (message.tabId && message.content) {
            tabId = message.tabId;

            if (message.action === 'code') {
                //Evaluate script in inspectedPage
                chrome.tabs.executeScript(message.tabId, {code: message.content});
            } else if (message.action === 'script') {
                //Attach script to inspectedPage
                chrome.tabs.executeScript(message.tabId, {file: message.content});
            } else {
                //Pass message to inspectedPage
                chrome.tabs.sendMessage(message.tabId, message, sendResponse);
            }
        } else {
            //This accepts messages from the inspectedPage and sends them to the panel
            port.postMessage(message);
        }
        sendResponse(message);
    };

    // Listens to messages sent from the panel
    chrome.extension.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function(port) {
        chrome.extension.onMessage.removeListener(extensionListener);
    });

    chrome.tabs.onUpdated.addListener(function (theTabId, changes, tabObject) {
      if (tabId == theTabId) {
        port.postMessage(tabId);
      }
    });

    // port.onMessage.addListener(function (message) {
    //     port.postMessage(message);
    // });

});


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    return true;
});