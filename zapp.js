/**
 * Created by Juha on 11/1/2015.
 */
'use strict';
var express = require('express');
var fs      = require('fs');

var zapp = express();
/* setup variables:
 */

var zcache={ 'index.html': '' };
zcache['index.html'] = fs.readFileSync('./index.html');
function cache_get(key) { return zcache[key]; }

zapp.get('/asciimo',function(req,res){
    var link = "http://i.imgur.com/kmbjB.png";
    res.send("<html><body><img src='" + link + "'></body></html>");
});

zapp.get('/',function(req,res){
    res.setHeader('Content-Type', 'text/html');
    res.send(cache_get('index.html') );
});

module.exports = zapp;
