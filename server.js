#!/bin/env node
//  OpenShift sample Node application
//var express = require('express');
//var fs      = require('fs');
var app = require('./app');


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

/*var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);*/
//app.listen(Port, ipAddress, function() {
app.listen(app.port,app.ipaddress, function() {
    console.log('%s: Node server started on %s:%d ...',
        Date(Date.now() ), app.ipaddress, app.port);
});
