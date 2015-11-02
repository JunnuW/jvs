#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');
var zapp = require('./zapp');

//  Set the needed environment variables:
var ipAddress=process.env.OPENSHIFT_NODEJS_IP;
var Port= process.env.OPENSHIFT_NODEJS_PORT || 3000;
if (typeof ipAddress === "undefined") {
    //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
    //  allows us to run/test the app locally.
    console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
    ipAddress = "127.0.0.1";
}

// Removed 'SIGPIPE' from the list - bugz 852598.
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

zapp.listen(Port, ipAddress, function() {
    console.log('%s: Node server started on %s:%d ...',
        Date(Date.now() ), ipAddress, Port);
});
