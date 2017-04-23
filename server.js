#!/bin/env node
//  OpenShift sample Node application
//var express = require('express');
//var fs      = require('fs'); //joo
var app = require('./appi');

// Removed 'SIGPIPE' from the list - bugz 852598.
//from terminal Ctrl+C = SIGINT
//SIGHUP is generated on Windows when the console window is closed,
//and on other platforms under various similar conditions
var signals =     ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
    'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
];
for (var i in signals) {
    process.on(signals[i], function() {
        terminator(signals[i]);
    });
}

function terminator(sig){
    if (typeof sig === "string") {
        console.log('%s: Received %s - terminating RockPhys node.js app ...',
            Date(Date.now()), sig);
        process.exit(1);
    }
    console.log('%s: Node server stopped.', Date(Date.now()) );
}
var ipAddress = process.env.OPENSHIFT_NODEJS_IP   || '127.0.0.1';
var port    = process.env.OPENSHIFT_NODEJS_PORT || '3000';
//var port = normalizePort(process.env.PORT || '3000');
//app.set('port', port);
app.listen(port, ipAddress, function() {
//app.listen(app.port,app.ipaddress, function() {
    console.log('%s: Node server started on %s:%d ...',
        Date(Date.now() ), app.ipaddress, app.port);
});
