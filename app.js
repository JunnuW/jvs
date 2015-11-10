'use strict';
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');//logs requests to the console to what is happening
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');//gets parameters from POST requests
var urlEncodedParser = bodyParser.urlencoded({extended:true,type:
    'application/x-www-form-urlencoded',parameterLimit:9,limit:'100kb' });
var jsonParser = bodyParser.json();
var mongoose = require('mongoose');// get an instance of mongoose to use mongoose.Schema
var nodemailer = require('nodemailer');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');
var async = require('async'); //utility module for waterfall etc.
//var crypto = require('crypto');//npm install varoittaa tämän oleva core moduli
var flash = require('express-flash');
var expressValidator = require("express-validator");
var methodOverride=require("express-method-override");
var jwt = require('jwt-simple');
var moment = require('moment');
var session = require('express-session'); //Session cookies
//var errorHandler = require('express-error-handler');
var mngoTree=require('./jv-mngo-tree');
//seuraavat kolme jqueryFileTree-tÃ¤ varten:
// var util = require('util');
//var fs = require('fs'); //npm install varoittaa tämän oleva core moduli
var requestIp = require('request-ip'); //for finding request client's ip
//var http = require('http');
//var bson = require('bson');
var jwtSecret='onpas_ovelaa_tämä:_node.js';
var app = express();

//  Set the needed environment variables:
var ipAddress=process.env.OPENSHIFT_NODEJS_IP;
if (typeof ipAddress === "undefined") {
    //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
    //  allows us to run/test the app locally.
    console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
    ipAddress = "127.0.0.1";
}
app.ipaddress=ipAddress;
//var Port= process.env.OPENSHIFT_NODEJS_PORT || 3000;
app.port=process.env.OPENSHIFT_NODEJS_PORT || 3000;
console.log('Port: ',app.port);

/*var zcache={ 'Vindex.html': '' };
zcache['Vindex.html'] = fs.readFileSync('./views/Vindex.html');
function cache_get(key) {return zcache[key];}

app.get('/asciimo',function(req,res){
    var link = "http://i.imgur.com/kmbjB.png";
    res.send("<html><body><img src='" + link + "'></body></html>");
});

app.get('/',function(req,res){
    res.setHeader('Content-Type', 'text/html');
    res.render('./views/Vindex.html');
    //res.send(cache_get('Vindex.html'));
});*/

app.use(express.static(__dirname)); //tämä oltava jotta bower_components hakemisto löytyy
app.use(express.static(__dirname + '/public')); //tässä muun staattisen sisällön hakemisto
//seuraava on ovela, muodostaa polun kÃ¤yttÃ¤en OS:n mukaan joko / tai \ merkkiÃ¤:
app.use(favicon(path.join(__dirname,'public','images','favicon.ico')));
//app.use(favicon(path.join(__dirname,'public','images','favicon.ico')));

var url;
if (process.env.OPENSHIFT_MONGODB_DB_URL) {
    //url = process.env.OPENSHIFT_MONGODB_DB_URL +"rock-bottom";
    url = process.env.OPENSHIFT_MONGODB_DB_URL +
    process.env.OPENSHIFT_APP_NAME;
}else{
    url = 'localhost:27017/rock-bottom';
}
var connect = function () {
    mongoose.connect(url);
};
connect();

var db = mongoose.connection;
db.on('error', function(error){
    console.log("Error loading the db - "+ error);
});
db.on('disconnected', connect);

/*if (app.ipaddress="127.0.0.1"){
    mongoose.connect('localhost:27017/rock-bottom');
}else {
    var url = '127.0.0.1:27017/' + process.env.OPENSHIFT_APP_NAME;
}*/

/*function main() {//tämä kirjoittaa käytettyjen modulien tiedot konsolille
    fs.readdir("./node_modules", function (err, dirs) {
        if (err) {
            console.log(err);
            return;
        }
        dirs.forEach(function(dir){
            if (dir.indexOf(".") !== 0) {
                var packageJsonFile = "./node_modules/" + dir + "/package.json";
                if (fs.existsSync(packageJsonFile)) {
                    fs.readFile(packageJsonFile, function (err, data) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            var json = JSON.parse(data);
                            console.log('"'+json.name+'": "' + json.version + '",');
                        }
                    });
                }
            }
        });

    });
}
main();*/

passport.use(new LocalStrategy(
    function(username, password, done) {
        User.findOne({ username: username }, function (err, user) {
            if (err) return done(err);
            if (!user) return done(null, false, { message: 'Incorrect username.' });
            user.comparePassword(password, function(err, isMatch) {
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Incorrect password.' });
                }
            });
        });
    }
    )
);

//****************************************
//serializeUser will store the user id in the session
passport.serializeUser(function(user, done) {
    if (!user) return; //lisätty tokenin vuoksi
    //console.dir("serializeUser done: "+done);
    //console.log("serializeUser: "+user.id);
    done(null, user.id);
});

//deserializeUser will get the user from the database and store it in req.user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        console.log("deserializeUser: "+user);
        done(err, user);
    });
});

var userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

userSchema.pre('save', function(next) {
    var user = this;
    var SALT_FACTOR = 5;
    if (!user.isModified('password')) return next();
    bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
        if (err) return next(err);
        bcrypt.hash(user.password, salt, null, function(err, hash) {
            if (err) return next(err);
            user.password = hash;
            next();
        });
    });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if(err) return cb(err);
        cb(null, isMatch);
    });
};

var User = mongoose.model('User', userSchema);

//var uusi = mngoTree.insertMatrl("branch1/file1");

// view engine setup
//app.set('port', process.env.PORT || 3000);
//console.log('directory is:'+__dirname);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('SessionSecret', 'onpas_ovelaa_tämä:_node.js');
//app.use(express.favicon()); ei toiminut, korvattu:
//app.use(favicon());
// app.use(express.logger('dev')); ei toiminut, korvattu:
app.use(logger('dev')); //in development neighbourhood

/*logger(req, res, function (err) {
    if (err) return done(err)
    // respond to request
    res.setHeader('content-type', 'text/plain')
    res.end('hello, world!')*/

//app.use(bodyParser);
//nämä kaksi:app.use(bodyParser.json())
app.use(jsonParser);
app.use(urlEncodedParser,function(error, req, res, next){
    //Catch bodyParser errors: too many parameters, request entity too large
    if (error.message){
        console.log("body-parser error in request: ",error.message);
        res.status(400);
        res.write(error.message);
        res.end();
    } else{
        next ();
    }
});

//required by jQ-Filetree plugin
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
//app.use(express.methodOverride()); ei toiminut ennen asennusta: npm install express-method-override
//sitten muutettu:
app.use(methodOverride());
//app.use(express.cookieParser()); ei toiminut muutettu:
app.use(cookieParser());
//app.use(express.session({ secret: 'keyboard cat' })); ei toiminut ennen asennusta: npm install express-session
//muutettu:
//app.use(session({ secret: 'keyboard cat' })); antoi virheilmoituksen, muutettu:

app.use(session({//session is require by flash and passport
    cookieName: 'TFRT-session',
    secret: app.get('SessionSecret'),//'onpa kuulia tää noode.js',
    saveUninitialized: true,
    resave: true,
    duration: 60 * 60 * 1000,
    activeDuration: 15 * 60 * 1000
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
//seuraava ei toiminut eikÃ¤ suositella kÃ¤ytettÃ¤vÃ¤ksi Express 4 versiossa , tarpeeton

//kaikki liitettävät .css, .js ym. tiedostot oltava public hakemistossa tai sen isähakemistoon (__dirname)

/* GET login page. */
app.get('/login', function(req, res) {
    //console.log('req: ',req);
    var n=req.url.lastIndexOf('=');
    var logInfo;
    if (n>0){//re-entered after error in username or password
        logInfo='Invalid username or password, '+req.url.slice(n+1);
        res.render('login', {
            title: 'Rock-Phys. (no login)',
            user: req.user,
            infos: req.flash('error',logInfo)
            //infos välittää virheilmoituksen layout sivulle =messages.error
        });
    }  else{//n=0
        //login entered without earlier login error
        res.render('login', {
            //infos: req.flash('info', 'Welcome to login'),
            title: 'Rock-Phys. please login',
            user: req.user
        });
    }
    //var clientIp = requestIp.getClientIp(req);
});

function createToken(req,userN){
    var expires = moment().add(7, 'minute').valueOf();
    var clientIp = requestIp.getClientIp(req);
    var jwtToken = jwt.encode({
            iss: userN,
            reqIP:clientIp,
            expires: expires
        },
        jwtSecret,
        'HS256');
    //console.log('token: ',jwtToken);
    //console.log('decoded.iss: ',jwt.decode(jwtToken,jwtSecret).iss);
    return jwtToken;
}

function ValidateToken(req,res){
    //var secrt=app.get('jwtTokenSecret');
    console.log('Validated token: ',req.body.rtftoken)
    var decoded = jwt.decode(req.body.rtftoken, jwtSecret);
    //console.log('issuer: ',decoded.iss);
    //console.log('reqIP: ',decoded.reqIp);
    //console.log('expires: ',decoded.expires);
    var validResult='OK';
    if (decoded.expires <= Date.now()) {
        validResult='Your login has expired, please re-login!';
        //console.log('login has expired');
        //res.end('Access token has expired', 400);
    }
    var clientIp = requestIp.getClientIp(req);
    if (decoded.reqIP != clientIp) {
        validResult='No login from current IP';
        //console.log('No login for '+decoded.iss+' from your location');
        //res.end('Access token has expired', 400);
    }
    if (decoded.iss != req.user.username) {
        //for Public files: req.body.userNme!=decoded.iss
        //console.log('req.user: ',req.user);
        //console.log('req.body: ',req.body);
        validResult='Invalid login for '+req.user.username+ '! Please login';
        //console.log('Your login is invalid');
        //res.end('Access token has expired', 400);
    }
    console.log('validation result: ',validResult);
    return validResult;
    //console.log('token has to be validated for: '+req.body.userNme);
}

function valFileOps(req,res){
    var valResu=ValidateToken(req,res);
    console.log('validation result: '+valResu);
    //res.write(valResu);
    if (valResu!='OK') {//token validation not OK: expired ||[invalid (userName||client IP)]
        res.json({
            token : 'invalid',
            response: valResu
        });
        return;
    }
    return;
}

/* GET home page. */
app.get('/', function(req, res) {
    console.log('get/');
    //following line prevents cache usage in rendering /index ; (menus will update according to login status)
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    //req.flash('info', 'Welcome');
    if (req.user) {
        //console.log('rendering with cookie username:  '+(req.session.user));
        res.render('index', {
            title: 'Rock Phys.',
            user: (req.user)
        });
    } else {
        //console.log('rendering / with or without user: ');
        res.render('index', {
            title: 'Rock Phys. (no login)',
            user: (req.user)  //false
        });
    }
});

/* GET index page. */
app.get('/index', function(req, res) {
    console.log('app.get/index');
    console.log('/index req.headers: '+JSON.stringify(req.headers));
    console.log('app.get/index');
});



/* GET signup page */
app.get('/signup', function(req, res) {
    //console.log('req.url: '+req.url);
    var signInfo=decodeURI(req.url);
    //console.log('signInfo: '+signInfo);
    var n=signInfo.lastIndexOf('=');
    var signInfo=signInfo.slice(n+1);
    if (n>0){
        // app.get('/signup',  re-entered after signup error
        //console.log('signup error with message: '+signInfo);
        req.flash('error', signInfo);
        res.render('signup', {
            title: 'Rock-Phys signup',
            user: req.user
            //,infos: req.flash('error')
            //infos välittää virheilmoituksen layout sivulle
        });
    }  else{
        //signup entered without earlier signup error
        res.render('signup', {
            title: 'Rock-Phys, please signup',
            user: req.user
        });
    }
});

app.get('/refletrans', function (req, res) {
    console.log('app.get/refletrans');
    //without login; req.user==undefined
    res.render('refletrans', {
        user: (req.user)
    });
});


app.post('/login',function(req,res){
    console.log("app.post('/login') req.headers: "+JSON.stringify(req.headers));
    passport.authenticate('local',function(err, user, info) {
        //console.log('authenticate info: ',info);
        //info { message: 'Incorrect password.' })
        if (err) return next(err);
        if (!user) {
            //palautetaan login (layout) sivulle
            //console.log('auth: no user');
            return res.redirect('/login');
            //return res.redirect('/login/?info=Invalid_Username_or_Password');
        }
        if (user.resetPasswordToken){
            console.log('resetPasswordToken: ',user.resetPasswordToken);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.save(function(err) {
                if (err) console.log('error in deleting resetPasswordToken: ',err.message);
                //req.logIn(user, function(err) {
                //    done(err, user);
                //});
            });
        }
        req.logIn(user, function(err) {
            if (err) return next(err);
            var jwtToken=createToken(req, user.username);
            //res.render('index',{token: token, expires: expires});
            //console.log('resetPasswordToken: ',user.resetPasswordToken);
            res.json({
                token : jwtToken,
                user: user.toJSON(),
                responseStr: "Login successfull"
            });
            //console.log('jwtToken: '+jwtToken);
            //console.log('user authenticated and jwtToken made for: '+user.username);
        });
        //huom. viimeiset sulut käynnistävät callbackin jossa 'passport.authenticate()'
        //self-executing function'in tapaan parametreilla: req, res, next
    })(req, res);
    function next(err){
        console.log('nexterr: ',err);
    }
    //res.redirect('/');
});

app.post('/signup', function (req, res) {
    console.log("app.post('/signup')");
    var user = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
    });
    //try to save credentials as a new user:
    user.save(function (err) {
        if (err)  {
            var responseString;
            //if a form field duplicates existing user data a 'dup key' error results.
            var nn=err.message.lastIndexOf('dup key');
            if (nn>0){
                var reason=err.message.slice(nn+14,err.message.length-3);
                var responseString = reason+ ' is not allowed or is already reserved ';
            }else{
                var responseString = err.message;
            }
            err=null;
            user=null;
            req.session.user = user;
            //return res.redirect('/signup');
            res.json({
                token : null,
                expires: null,
                user: null,
                responseStr: responseString
            });
            return;
        }else {
            //console.log('token: ',jwtToken);
            //console.log('user.save : '+JSON.stringify(user));
            req.logIn(user, function(err) {
                //req.user=user;
                console.log('req.loqIn user: ',user);
                if (err) {
                    console.log('reg.logIn errori: ',err);
                    return; // next(err);
                }
                //var jwtToken = jwtCreate(req,res,user);
                var jwtToken =createToken(req,user.username);
                //res.render('index',{token: token, expires: expires});
                req.flash('success', 'Signup was successful! You are now logged in as: '+user.username);
                res.json({
                    token : jwtToken,
                    user: user.toJSON(),
                    responseStr: "Login successfull"
                });
                //req.session.user = user;
                console.log('user authenticated and jwtToken made for: '+user.username);
            });
        }
    });
});

app.post('/auth/*', function(req,res){
        console.log('post auth: ',req.url, ' req.body: ',req.body);
        console.log(' req.user: ',req.user);
        var urli=req.url;
        urli=urli.slice(5);
        if (req.body.rtftoken){
            //private directory selected or admin user login as Publ
            console.log('directory: ',req.body.userNme);
            valFileOps(req,res);
        }else{
            //user does not have admin rights:
            //these operations are not allowed:
            if (['/dbRename', '/dbDelete', '/dbInsert','/dbUpdate'].indexOf(urli) !== -1) {
                var opert=urli.slice(3);
                res.write('No permission to '+opert+' operation in Public directory');
                res.status(500);
                res.end();
                return;
            }
        }
        switch (urli){
            case '/checkAllUserF' :
                mngoTree.checkAllUserFiles(req,res);
                break;
            case '/checkOneUserF' :
                mngoTree.checkOneUserFile(req,res);
                break;
            case '/dbFindOne' :
                console.log('dbFindOne in post');
                mngoTree.obtainOne(req,res);
                break;
            case '/dbUpdate' :
                mngoTree.updateDoc(req,res);
                break;
            case '/dbInsert' :
                mngoTree.insertDoc(req,res);
                break;
            case '/dbDelete' :
                mngoTree.deleteDoc(req,res);
                break;
            case '/dbRename' :
                mngoTree.renameDocs(req,res);
                break;
            default:
                res.render('error', {
                    'message':urli +" page not found",
                    'error.status':"404"
                });
        }
    },
    function nexterr(err){
        console.log('nexterr: ',err);
    }
);

app.get('/pwdEdit', function(req, res) {
    console.log("app.get('/pwdEdit')");
    res.render('reset', {
        title: 'Rock-Phys. pwd edit',
        user: req.user
    });
});

app.get('/logout', function(req, res){
    //console.log('logging out user: '+user.username+' req.session.user.username: '+req.session.user.username);
    //req.session.user=req.logout();
    console.log('logging off user:'+JSON.stringify(req.user));
    res.render('index',{
        title: 'Rock Phys. (no login)',
        user:null
    });
});

app.get('/forgot', function(req, res) {
    console.log("app.get('/forgot')");
    res.render('forgot', {
        user: req.user
    });
});

app.post('/forgot', function(req, res) {
    console.log("app.post('/forgot')");
    //vesiputous ajaa sarjan callback funktioita perÃ¤kkÃ¤in:
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString('hex');
                console.log('Have %d bytes of random data password change token: %s',token.length,token);
                console.log('err: '+err);
                done(err, token);
            });
        },
        function(token, done) {
            User.findOne({ email: req.body.email }, function(err, user) {
                console.log('findOne user: ',user);
                if (!user) {
                    req.flash('error', 'No account with that email address exists.');
                    return res.redirect('/forgot');
                }
                user.resetPasswordToken = token;
                //req.flash('error', 'token: '+token);
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save(function(err) {
                    done(err, token, user);
                });
            });
        },
        function(token, user, done) {
            /*var smtpTransport = nodemailer.createTransport('SMTP', {
                service: 'Gmail',
                auth: {
                    user: 'wiljnn.jh@gmail.com',
                    pass: 'Heikki#Juhani'
                }
            });*/
            //var smtpTransport = require('nodemailer-smtp-transport');
            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'wiljnn.jh@gmail.com',
                    pass: 'Heikki#Juhani'
                }
            });

            var mailOptions = {
                to: user.email,
                from: 'wiljnn.jh@gmail.com',
                subject: 'Node.js Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'https://' + req.headers.host + '/reset/' + token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };

            /*smtpTransport.sendMail(mailOptions, function(err) {
                req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                done(err, 'done');
            });*/
            transporter.sendMail(mailOptions, function(error, info){
                req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                if(error){
                    return console.log(error);
                }
                console.log('Message sent: ' + info.response);
            });
        }
    ], function(err) {
        if (err)
        {
            console.error(err.stack);
            //return next(err);
        }
        res.redirect('/forgot');
    });
});

app.get('/reset/:token', function(req, res) {
    console.log("app.get('/reset/:token')");
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
        res.render('reset', {
            user: req.user
        });
    });
});

app.post('/reset/:token', function(req, res) {
    console.log("app.post('/reset/:token')");
    async.waterfall([
        function(done) {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
                if (!user) {
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('back');
                }
                user.password = req.body.password;
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                user.save(function(err) {
                    req.logIn(user, function(err) {
                        done(err, user);
                    });
                });
            });
        },
        function(user, done) {
            var smtpTransport = nodemailer.createTransport('SMTP', {
                service: 'Gmail',
                auth: {
                    user: 'wiljnn.jh@gmail.com',
                    pass: 'Heikki#Juhani'
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'passwordreset@demo.com',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                'This is a confirmation that the password for your account on rock-phys with name: '
                + user.username + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                req.flash('success', 'Success! Your password has been changed.');
                done(err);
            });
        }
    ], function(err) {
        res.redirect('/');
    });
});

//The 404 Route is the last route if no match found earlier
app.get('*', function(req, res){
    req.flash('error', 'This address was not found');
    res.render('error', {
        message: 'Unknown URL: '+req.url
        //error:
    });
});

//The 404 Route (ALWAYS Keep this as the last route)
app.post('*', function(req, res){
    res.render('error', {
        message: 'Unknown URL: '+req.url
        //error:
    });
    //res.send('what???', 404);
});



//MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(req, res, err) {
        res.status(err.status || 500);
        if (err){
            console.log('Errori:',err);
            console.log('Error.message:',err.message);
            console.log('Error.status:',err.status);
            console.log('Error.resp:',res);
            res.render('error', {
                message: err.message,
                error: err
            });
            return;
        }
        //res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
        //return done(null, false, { message: 'Incorrect password.' });
        //{ message: 'Incorrect password.' };
    });
    console.log('running in: '+app.get('env')+' environment');
} else {
// production error handler
// no stacktraces leaked to user
    app.use(function(err, req, res) {
        console.log('production errorhandler: '+err.status);
        res.status(err.status || 500);
        res.render('error', {
            'message':"page not found",
            'error.status':"404"
        });
    });

}
/*app.use(function(err,req,res,next){
 if(err){
 console.log('Errori:'+err);
 }
 next();
 });*/

/*app.use(function(req, res){
    console.log('ei löydy');
    //if post or get url is not found:
    res.status(404);
    res.end();
});*/

/*if ('development' == app.get('env')) {
 app.use(errorHandler());
 }*/

module.exports = app;

//function(req,res) {
// To check whether the data is in the url (GET) or the req body (POST):
//util.log(util.inspect(req));
//or just the method and the url:
//util.log('Request received: \nmethod: ' + req.method + '\nurl: ' + req.url);
//request goes through urlencoded body-barser, where size is limited to 100kb
//if request is larger error is thrown with status 413
//also the allowed parameter number is limited (to 9) in the body-parser urlencoded:
// console.log("Content-lengthi: ", req.headers['content-length']);
//  var responseS = mngoTree.Update(req,res);
/*console.log("responseS: "+responseS);
 //res.writeHead(200, "OK", {'Content-Type': 'text/html'});
 //req.session.user = user;
 if ('saving OK'===responseS){
 res.write(responseS);
 res.status(200);
 res.end();
 } else {
 res.write(responseS);
 res.status(500);
 res.end();

 }*/
//});
