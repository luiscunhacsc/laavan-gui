'use strict';
const {contextBridge} = require('electron');
// A constant capability marker; the renderer receives no filesystem or Node API.
contextBridge.exposeInMainWorld('formaDesktop', Object.freeze({bundled:true}));
