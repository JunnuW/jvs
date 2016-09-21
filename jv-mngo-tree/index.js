/**
 * Created by Juha on 11/3/2015.
 * To be used as a node.js module for reading and saving mongodb documents.
 * This module organizes the saving and reading of documents into a directory tree
 * structure to be used in combination with jquery jstree plugin in purpose to
 * ease the browsing of available documents in the database
 */
var mongoose = require('mongoose');
var d=new Date();
var vanhenee= d.toUTCString();
var respOnse; //response to db operation

/* Message data structure in MongoDb:
 * Each message belongs to a named user: 'username'
 * Each message belongs to a thread, like ThinFilmOpt/Bugs
 * Each message has a messagename: fName
 * messagenames incude thread structure like: ThinFilmOpt/Bugs/failed
 * 'uMessage' field contains the actual message text
 * 'dataExpires' timestamps the document
 */
var messagSchema = new mongoose.Schema({
    username: { type: String, required: true },
    fName: { type: String, required: true },
    uMessage:{type: String, required: false},
    moderated:{type: Boolean, required:true},
    dateRec: { type: String, required: true}
});
//User cannot save two messages with identical names:
messagSchema.index({username: 1, fName:1, dateRec: 1}, {unique: true});
//Two users cannot save messages with identical names and timestamps:
//messagSchema.index({dateRec: 1, fName:1}, {unique: true});
var Message=mongoose.model('Message',messagSchema);
//creates messages collection, if it does not exist in mongodb

/* Emission data structure in MongoDb:
 * Each document belongs to a named user: 'username'
 * Each document has a filename: fName
 * filenames incude directory structure like: Bulk/GaAs/10C-500uW
 * 'description' field contains information about the material data
 * 'unit' is always 'eV' in the future possibbly also 'nm, 'um'
 * 'datArrs' is the array for photon energy and emission intensity.
 * 'dataExpires' timestamps the document
 */
var emittedSchema = new mongoose.Schema({
    username: { type: String, required: true },
    fName: { type: String, required: true },
    description:{type: String, required: false},
    unit:{type: String, required: false},
    datArrs:{ type: Array, required: false},
    dataExpires: { type: String, required: true}
});
//User cannot save two documents with identical names:
emittedSchema.index({username: 1, fName:1}, {unique: true});
var Emission=mongoose.model('Emission',emittedSchema);
//creates emission collection, if it does not exist in mongodb

/* Material data structure in MongoDb:
 * Each document belongs to a named user: 'username'
 * Each document has a filename: fName
 * filenames incude directory structure like: Dielectric/Sputtered/al2O3-IBS
 * 'description' field contains information about the material data
 * 'unit' is either 'nm, 'um' or 'eV'
 * 'datArrs' is the array for wavelength n and k parameters.
 * 'dataExpires' timestamps the document
 */
var matrlSchema = new mongoose.Schema({
    username: { type: String, required: true },
    fName: { type: String, required: true },
    description:{type: String, required: false},
    unit:{type: String, required: false},
    datArrs:{ type: Array, required: false},
    dataExpires: { type: String, required: true}
});
//User cannot save two documents with identical names:
matrlSchema.index({username: 1, fName:1}, {unique: true});
var Material=mongoose.model('Material',matrlSchema);
//creates materials collection, if it does not exist in mongodb

/* Target spectrum data structure in MongoDb:
 * Each document belongs to a named user: 'username'
 * Each document has a filename: fName
 * filenames incude directory structure like: 'Reflectance/AR830Y5P'
 * 'description' field contains information about the spectral data
 * 'unit' is either 'nm, 'um' or 'eV'
 * 'datArrs' contains the spectral array  [wavelength and R% or T%]
 * 'dataExpires' timestamps the document
 */
var targSchema = new mongoose.Schema({
    username: { type: String, required: true },
    fName: { type: String, required: true },
    description:{type: String, required: false},
    unit:{type: String, required: false},
    spType:{type:String,required:true},
    datArrs:{ type: Array, required: false},
    dataExpires: { type: String, required: false}
});
//User cannot save two documents with identical names:
targSchema.index({username: 1, fName:1}, {unique: true});
var Target=mongoose.model('Target',targSchema);
//creates targets collection, if it does not exist in mongodb

/* Stack data in MongoDb:
 * Each document belongs to a named user: 'username'
 * Each document has a filename: fName
 * filenames incude directory structure like: 'directory/stackNN'
 * 'description' field contains information about the spectral data
 * 'datJson' is the JSON.stringify converted film JSON data of the film stack
 * 'dataExpires' timestamps the document
 */
var stackSchema = new mongoose.Schema({
    username: { type: String, required: true },
    fName: { type: String, required: true },
    description:{type: String, required: false},
    matrlStack:{ type: String, required: false},
    dataExpires: { type: String, required: false}
});
//User cannot save two stacks with identical names:
stackSchema.index({username: 1, fName:1}, {unique: true});
var Stack=mongoose.model('Stack',stackSchema);
//creates stacks collection, if it does not exist in mongodb

//var applModel;
function ApplMod(req){
    //console.log('applMod collection: ',req.body.Collection);
    switch (req.body.Collection){
        case "materials":
            applModel= Material; //model name for 'materials' collection
            break;
        case "targets":
            applModel= Target; //model name for 'targets' collection
            break;
        case "stacks":
            applModel= Stack; //model name for 'stacks' collection
            break;
        case "emissions":
            applModel= Emission; //model name for 'emissions' collection
            break;
        case "messages":
            applModel= Message; //model name for 'messages' collection
            break;
        default:
            applModel='';
            break;
    }
    return applModel;
}

function saveMessage(req,res,callBfun){
    var messN=req.body.fName;
    messN = messN.replace(/(^\/)|(\/$)/g, "");//remove leading and trailing /
    console.log('messN: ',messN);
    //check chain depth:
    var slashes=messN.match(/\//g); //jos ei ainuttakaan tulee null muuten '/,/,/'
    var slashN=(slashes==null || slashes==false)? 0:slashes.length;
    if (slashN>5){
        console.log('Prevented more than 5 message depth');
        respOnse= {
            statCode: 409, //user tries to save to too deep message path:
            resString: 'Your message path is too long: '+messN,
            error: 'Too deep path'
        };
        callBfun(req,res,respOnse);
        return;
    }
    //console.log('messageName: ',messN);
    var messUser=req.body.userNme;
    var moder=(messUser=='Publ')? true : false;
    //console.log('messageUser: ',messUser);
    //console.log('moder: ',moder);
    var messTxt=req.body.Text;
    //console.log('messageText: ',messTxt);

    var Messa = new Message({
        username: messUser,
        fName: messN, //e.g. "branch1/parent1/parent2/file1",
        uMessage: messTxt,
        moderated: moder,
        dateRec: vanhenee}
    );
    //console.log('Messa: ',Messa);
    Messa.save(function (err) {
        //Jos messN:llä on jo tallennettu tämä antaa
        // virheilmoituksen E11000 duplicate key error index
        //http:ksi asetetaan statusCode 409
        if (err) {
            console.log('Error in saving to mongo-db: ',err);
            if (err.name=='MongoError' && err.code==11000){
                //console.log('dubb key Error in saving to mongo-db:');
                respOnse= {
                    statCode: 409, //user already has this message:
                    resString: 'Not saved! Name: '+messN+ ' already used!',
                    error: err.toString()
                };
            }else{
                console.log('Error in saving to mongo-db:');
                respOnse= {
                    statCode: 500,
                    resString: '',
                    error: err.toString()
                };
            }
        } else{
            console.log("saving OK: "+messN);
            respOnse={
                statCode: 200,
                resString:'saving OK',
                error:''
            };
        }
        callBfun(req,res,respOnse);
    });
}

exports.saveMsg=function(req,res,callBfun){
    Message.count({'username': req.user.username, 'moderated':false},function(err,countti) {
        if (err) {
            respOnse={
                statCode: 500,
                resString:'message count error for '+req.body.username+
                ' retry after new login',
                error:err.toString()
            };
            callBfun(req,res,respOnse);
            return;
        }else{//got the number of unmoderated messages
            console.log(req.user.username,' unmoderated count: ',countti);
            var inModer=countti;
            if (countti>2){//user has too many unmoderated messages
                respOnse={
                    statCode: 409,
                    resString: req.user.username+', please wait until your earlier messages ' +
                    'have been moderated',
                    error:countti+' messages in moderation'
                };
                callBfun(req,res,respOnse);
                return;
            }
            saveMessage(req,res,callBfun);
        }
    });
};

exports.obtainOne=function(req,res,callBfun){
    //queries one documents from mongo db
    var applModel;
    applModel=ApplMod(req);
    if (applModel=='') {
        respOnse={
            statCode: 500,
            resString:'',
            error:"invalid request to obtain one document"
        };
        callBfun(respOnse);
        return;
    }
    //document name to be searched:
    var fiName = req.body.fileName.replace(/(^\/)|(\/$)/g, ""); //removes eventual leading and trailing'/'
    var toRes=req.body.replyType; //'all' for whole document 'description' for document description
    //build  query using regexp:
    var querY = {fName: fiName, username: req.body.userNme};
    //applModel determines the document collection:
    applModel.findOne(querY, function(err,docum) {//queries one document from mongodb
        if (!err && docum) {
            //Reading was successful, convert to string:
            docRes = (toRes=='wholeDoc')? JSON.stringify(docum) : docum.description;
            //console.log('obtainOne docRes: ',docRes);
            respOnse={
                statCode: 200,
                resString:'DocumentOK :'+docRes,
                error:''
            };
        }
        else {
            //var responseStr= (err)? err.toString():fiName+ ' not found';
            if (err) {
                respOnse={
                    statCode: 500,
                    resString:'',
                    error:err.toString()
                };
            }else {
                respOnse={
                    statCode: 202,
                    resString:'',
                    error: fiName+ ' not found'
                };
            }
        }
        //console.log('obtainOne respOnse: ',respOnse);
        callBfun(req,res,respOnse);
    });
};

/* Queries and deletes matching documents from mongo db
* uses collection name to select the document model
* applies Model.remove method to delete the document
* gets document name: req.body.fileName
* responses either with 'error...' or 'Deleting OK' messages
*/
exports.deleteDoc=function(req,res,callBfun){
    var applModel;
    applModel=ApplMod(req);
    if (applModel=='') {
        respOnse={
            statCode: 500,
            resString:'',
            error:"invalid request to obtain one document"
        };
        callBfun(respOnse);
        return;
    }
    //document name to be searched, build search query using regexp:
    //applModel determines the file type (materials, targets.. )
    var fiName = req.body.fileName.replace(/(^\/)|(\/$)/g, ""); //removes eventual leading and trailing'/'
    var toReg=fiName.replace('/','\/');//slash characters in filename have to be escaped in regexp
    var re = new RegExp('^'+toReg);
    var querY = {fName: re, username: req.body.userNme};
    applModel.remove(querY, function(err,numberRemoved) {
        if (!err) {
            //Deleting was successful:
            respOnse={
                statCode: 200,
                resString:'deleting OK with: '+numberRemoved+' documents',
                error:''
            };
        } else {
            respOnse={
                statCode: 500,
                resString:'',
                error:err.toString()
            };
        }
        callBfun(req,res,respOnse);
    });
};

var nRenamed=0;
var toBeRen=0;
exports.renameDocs=function(req,res,callBfun) {
    //callBfun takes result back for the response handler in app.js
    //renames existing mongo db document with new fName
    //pick a mongoose model for renaming update:
    var applModel;
    applModel=ApplMod(req);
    if (applModel=='') {
        respOnse={
            statCode: 500,
            resString:'',
            error:"invalid request obtain one document"
        };
        callBfun(respOnse);
        return;
    }
    toBeRenamed(req,res,renOne,callBfun);
};

/*
 * Function, in async mode, first queries the db for matching doc names.
 * After receiving them, it repeatedly uses the callback function 'renOne'
 * to rename the matching document names one by one.
 * 'renOne' in turn receives 'callBfun' as a callback returning a message
 * about the success (or failure). This callback sequence eliminates error messages:
 * 'Can't set headers after they have been sent'
 */
function toBeRenamed(req,res,callBa,callBfun){
    var User = req.body.userNme;
    var oldName = req.body.oldName.replace(/(^\/|\/$)/g, ""); //removes eventual leading and trailing '/'
    var newN = req.body.newName.replace(/(^\/)|(\/$)/g, ""); //removes eventual leading and
    //build database query using regexp:
    var toReg=oldName.replace('/','\/');//slash characters in filename have to be escaped in regexp
    var re = new RegExp('^'+toReg);
    var querY = {fName: re, username: User};
    //console.log('query: ',querY);
    var applModel=ApplMod(req);
    if (applModel=='') {
        respOnse={
            statCode: 500,
            resString:'',
            error:"invalid request obtain one document"
        };
        callBfun(respOnse);
        return;
    }
    applModel.find(querY, function (err, docs) {
        if (err) {//error in finding documents from mongodb
            console.log('err: ' + err.toString());
            respOnse={
                statCode: 500,
                resString:'Document not found for renaming',
                error:err.toString()+' in finding document for renaming '
            };
            callBfun(req,res,respOnse);
            return;
        }else{
            toBeRen=docs.length;
            nRenamed=0;
            var olD;
            var neW;
            var reg;
            var queRy;
            docs.forEach(function(item){
                olD=item.fName;//where the beginning is identical to oldName
                olD=olD.replace('/','\/');//slash characters have to be escaped in regex
                reg = new RegExp('^'+olD); //searches at string beginning
                queRy = {fName: reg, username: User};
                neW=olD.replace(re,newN);
                //console.log('rename old: ',olD,' to new: ',neW);
                renOne(req,res,toBeRen,queRy,neW,renOneOk,callBfun);//renames one by one
            });
        }
    });
}

function renOne(req,res,toBeRen,queRy,neW,callB,callBfun){
    var options = {multi: false};
    //console.log('query old name: ',queRy.fName,' replace with: ',neW )
    var applModel;
    applModel=ApplMod(req);
    if (applModel=='') {
        respOnse={
            statCode: 500,
            resString:'',
            error:"invalid request obtain one document"
        };
        callBfun(respOnse);
        return;
    }
    applModel.update(queRy, { $set: { fName: neW }}, options,
        //i.e. Material or Target.update(......
        function(err,numAffected){
            // numAffected.nModified = 1, the renaming was successful
            //console.log("numAffected: ",numAffected.nModified);
            if (err) {
                respOnse={
                    statCode: 500,
                    resString:'',
                    error:err.toString() + " while renaming document: " + queRy.fName
                };
                callBfun(req,res,respOnse);//Returns error message
            }else {
                callB(req,res,toBeRen,callBfun);//counts renamed documents and announce success
            }
        }
    );
}

function renOneOk(req,res,toBeRen,callBfun){
    nRenamed+=1;
    //console.log('nRenamed: ',nRenamed);
    if (nRenamed>=toBeRen){
        respOnse= {
            statCode: 200,
            resString:'renaming OK for '+nRenamed+'/'+toBeRen+' docs',
            error:''
        };
        callBfun(req,res,respOnse);
    }
}

exports.updateDoc=function(req,res,callBfun) {
    //console.log("updateDoc req.body.data: "+JSON.stringify(req.body.data));
    //overwrites existing mongo db document with new data
    var applModel;
    applModel=ApplMod(req);
    if (applModel=='') {
        respOnse={
            statCode: 500,
            resString:'',
            error:"invalid request to obtain one document"
        };
        callBfun(respOnse);
        return;
    }
    var dataa=JSON.parse(req.body.data); //data quality has already been verified by the urlencoded bodyparser
    //get document filename:
    var trimmed = dataa.Filename.replace(/(^\/)|(\/$)/g, ""); //removes eventual leading and trailing '/'
    var querY = {fName: trimmed, username: req.body.userNme};//builds database query:
    var upDates;
    //builds update data:
    switch (req.body.Collection){
        case "materials":
            upDates = {
                fName: trimmed,
                username: req.body.userNme,
                description: dataa.Descr,
                unit: dataa.Unit,
                datArrs: [{"absc":dataa.absc}, {"n":dataa.n}, {"k":dataa.k}],
                dataExpires: vanhenee
            };
            break;
        case "targets":
            console.log('targets dataa: ',JSON.stringify(dataa));
            console.log('targets dataa.Descr: ',dataa.Descr);
            upDates = {
                fName: trimmed,
                username: req.body.userNme,
                description: dataa.Descr,
                unit: dataa.Unit,
                spType:dataa.type,
                datArrs:[{"absc":dataa.absc}, {'percents':dataa.Sv}],
                dataExpires: vanhenee
            };
            break;
        case "stacks":
            upDates = {
                username: req.body.userNme,
                fName: trimmed, //e.g. "branch1/parent1/parent2/file1",
                description: dataa.Descr,
                matrlStack: JSON.stringify(dataa.Stack),
                dataExpires: vanhenee
            };
            break;
        case "emissions":
            upDates = {
                username: req.body.userNme,
                fName: trimmed, //e.g. "branch1/parent1/parent2/file1",
                description: dataa.Descr,
                matrlStack: JSON.stringify(dataa.Stack),
                dataExpires: vanhenee
            };
            break;
        //applModel=Stack; //model for 'stacks' collection
        default:
            respOnse={
                statCode: 500,
                resString:'',
                error:"invalid data request in insertDoc"
            };
            callBfun(req,res,respOnse);
            return;
            break;
    }

    var options = {multi: false};
    //console.log('in updateDoc Descr: '+dataa.Descr);
    //performs document update:
    applModel.update(querY, upDates, options,
        function(err,numAffected){
            // numAffected is the number of updated documents
            //console.log("query: "+JSON.stringify(querY));
            //console.log("upDates: "+JSON.stringify(upDates));
            //console.log("updated numAffected: "+JSON.stringify(numAffected));
            if (!err && (numAffected===1)) {
                respOnse={
                    statCode: 200,
                    resString:'saving OK',
                    error:''
                };
            }
            else {
                if (err) {
                    respOnse={
                        statCode: 500,
                        resString:'',
                        error:err.toString()
                    };
                }else{
                    respOnse={
                        statCode: 200,
                        resString:"Updated: "+numAffected+ "documents",
                        error:''
                    };
                }
            }
            callBfun(req,res,respOnse);
        });
};

exports.insertDoc=function(req,res,callBfun){
    console.log('insertDoc reg.body: ',req.body);
    //Transfer-Encoding is not a header in 'request' object only in 'responce' object!
    //it can be set to: chunk, but since the related:
    //req.on('data',function(chunk){}), is never triggered here (on res object), we use:
    var dataa=JSON.parse(req.body.data);
    //The acceptable data length has already been checked by the urlencoded bodyparser
    // in node modules, which prevents malicious disk dumps
    //var trim = dataa.Filename.replace(/(^\/)|(\/$)/g, ""); //removes leading and trailing '/'
    var trim = dataa.Filename.replace(/(^\/)/g, ""); //removes leading  '/'
    var newDocu={};
    switch (req.body.Collection){
        case "materials":
            newDocu = new Material({
                username: req.body.userNme,
                fName:trim, //e.g. "branch1/parent1/parent2/file1",
                description:dataa.Descr,
                unit:dataa.Unit,
                datArrs:[{"absc":dataa.absc}, {"n":dataa.n}, {"k":dataa.k}],
                dataExpires: vanhenee}
            );
            break;
        case "targets":
            newDocu = new Target({
                username: req.body.userNme,
                fName:trim, //e.g. "branch1/parent1/parent2/file1",
                description:dataa.Descr,
                unit:dataa.Unit,
                spType:dataa.type,
                datArrs:[{"absc":dataa.absc}, {'percents':dataa.Sv}],
                dataExpires: vanhenee}
            );
            break;
        case "stacks":
            newDocu = new Stack({
                username: req.body.userNme,
                fName: trim, //e.g. "branch1/parent1/parent2/file1",
                description: dataa.Descr,
                matrlStack: JSON.stringify(dataa.Stack),
                dataExpires: vanhenee}
            );
            break;
        case "emissions":
            newDocu = new Emission({
                username: req.body.userNme,
                fName:trim, //e.g. "branch1/parent1/parent2/file1",
                description:dataa.Descr,
                unit:dataa.Unit,
                spType:dataa.type,
                datArrs:[{"eVs":dataa.absc}, {'Inte':dataa.Sv}],
                dataExpires: vanhenee}
            );
            break;
            //applModel=Stack; //model for 'stacks' collection
        default:
            respOnse={
                statCode: 500,
                resString:'',
                error:"invalid data request in insertDoc"
            };
            callBfun(req,res,respOnse);
            return;
            break;
    }
    newDocu.save(function (err) {
        if (err) {
            console.log('Error in saving to mongo-db: '+err.toString());
            respOnse={
                statCode: 500,
                resString:'',
                error:err.toString()
            };
        }else{
            console.log("saving OK: "+trim);
            respOnse={
                statCode: 200,
                resString:'saving OK',
                error:''
            };
        }
        callBfun(req,res,respOnse);
    });
};

/* Checks the existence of one user document name in mongo db
 * uses collection name to select the document schema for either materials or targets
 * responces either with an error message or with 'Yes' or 'No'
 */
exports.checkOneUserFile=function(req,res,callBfun){
    //checks if document already exist in user's document collections
    var applModel;
    applModel=ApplMod(req);
    if (applModel=='') {
        //console.log('no applModel');
        respOnse={
            statCode: 500,
            resString:'',
            error:"invalid request to obtain one document"
        };
        callBfun(respOnse);
        return;
    }
    var drTree=[];
    //document name to be searched:
    var fiName=req.body.fileName;
    if (fiName.charAt(0) === '/'){
        fiName = fiName.substr(1);
    }
    applModel.find({username: req.body.userNme, fName:fiName},{'_id':0,'fName':1}, function(err,obj) {
        var matFiles=obj.length;
        var existORnot=(obj.length)? "yes":"no";
        if (err) {
            respOnse={
                statCode: 500,
                resString:'',
                error:err.toString()
            };
            //res.writeHead(500, {'content-type': 'text/plain' });
            //res.write(err.toString());
            //res.end();
        }else{
            respOnse={
                statCode: 200,
                resString:existORnot,
                error:''
            };
        }
        //console.log('checkOneUserFile respOnse: ',respOnse);
        callBfun(req,res,respOnse);
    });
};


/* Queries all documents (materials, targets, stacks) with a schema from mongo db
 * uses collection name to select the document schema for either materials or targets
 * responces either with an error message or a string containing the directory structure
 */
exports.checkAllUserFiles=function(req,res,callBfun){
    //console.log("checkAllUserFiles username: ", req.body.userNme);
    //console.log("checkAllUserFiles Collection: ", req.body.Collection);
    var appModel;
    //console.log('applMod req.body: ',req.body);
    appModel=ApplMod(req);
    if (appModel=='' || appModel==undefined) {
        respOnse={
            statCode: 500,
            resString:'',
            error:"error in reading user file list"
        };
        callBfun(respOnse);
        return;
    }
    var drTree=[];
    appModel.find({username: req.body.userNme},{'_id':0,'fName':1}, function(err,obj,next) {
        //todo: muuta jsTree-datan teko samanlaiseksi kuin messageilla
        // tulee paremmaksi ja lyhyemmäksi
        var matFiles=obj.length;
        var dirIds=[];
        var dirArr=[];
        var dirDepth=0;
        for (var i=0;i<matFiles;i++){
            dirIds.push(obj[i].fName);
        }
        dirIds.sort();//sorted to alphabetical order
        for (i=0;i<matFiles;i++){
            var a=[];
            a=dirIds[i].split("/");
            //console.log('dirIds['+i+']: '+dirIds[i]);
            if (a.length>dirDepth) dirDepth= a.length;
            for (var s=0;s<a.length-1;s++){
                a[s]=a[s]+'/';
            }
            dirArr.push(a);
        }
        //console.log(dirArr);
        //console.log('dirDepth: '+dirDepth);
        var arrX=[]; //matrix for parent relations initialized
        for (i=0;i<matFiles;i++){
            arrX[i]=[];
            for (var j=0;j<dirDepth;j++){
                arrX[i].push(0);
            }
        }
        var k=0;
        for (var j=0;j<dirDepth;j++){
            if (dirArr[0][j] && dirArr[0][j].search(/a-z0-9äöå/i) && dirArr[0][j].length>0) k++;
            arrX[0][j]= (dirArr[0][j] && dirArr[0][j].search(/a-z0-9äöå/i))? k:0;
            //made the first array line, only letters and numbers are allowed in dir and file name beginning
            for (var i=1;i<matFiles;i++){
                //following array lines:
                //console.log(dirArr);
                if (dirArr[i][j] && dirArr[i][j].search(/a-z0-9äöå/i)){
                    //console.log("dirArr["+i+"]["+j+"]:"+ dirArr[i][j]);
                    //console.log("dirArr["+(i-1)+"]["+j+"]:"+ dirArr[i][j]);
                    if (dirArr[i][j]!=dirArr[i-1][j] && dirArr[i][j].search(/a-z0-9äöå/i) ){
                        k++;
                    }
                    arrX[i][j]=k;
                }
                else arrX[i][j]=0;
            }
        }
        //console.log("arrX: "+arrX);
        //console.log("k: "+k);
        for (var itemNo=1;itemNo<k+1; itemNo++){
            for (var col= 0;col<dirDepth;col++){
                for (var row=0;row<matFiles;row++){
                    if(arrX[row][col] && arrX[row][col]==itemNo ){
                        if (col==0) {//operates only on first column = root node
                            //,'icon': 'jstree-file' or ,'icon': 'jstree-folder'
                            if ((dirArr[row][col + 1]) || (dirArr[row][col].slice(-1)=='/')){
                                //console.log("dirArr col:"+col+": "+dirArr[row][col]);
                                drTree.push({
                                    "id": "ajason" + itemNo,
                                    "parent": "#",
                                    "text": dirArr[row][col],
                                    "icon":"jstree-folder"
                                });
                            }
                            else {
                                drTree.push({
                                    "id": "ajason" + itemNo,
                                    "parent": "#",
                                    "text": dirArr[row][col],
                                    "icon":"jstree-file"
                                });
                            }
                        }
                        else {//operates all other columns ls. lower directory nodes
                            //todo: create folder antaa väärän jstree ikonin
                            //console.log("dirArr col:"+col+": "+dirArr[row][col]);
                            if ((dirArr[row][col + 1]) || (dirArr[row][col].slice(-1)=='/')){
                                drTree.push({
                                    "id":"ajason"+itemNo,
                                    "parent":"ajason"+arrX[row][col-1],
                                    "text":dirArr[row][col],
                                    "icon":"jstree-folder"
                                });
                            }
                            else {
                                drTree.push({
                                    "id":"ajason"+itemNo,
                                    "parent":"ajason"+arrX[row][col-1],
                                    "text":dirArr[row][col],
                                    "icon":"jstree-file"
                                });
                            }
                        }
                        break;
                    }
                }
            }
        }
        respOnse={
            statCode: 200,
            resString:JSON.stringify(drTree),
            error:''
        };
        callBfun(req,res,respOnse);
    });
};

/* Queries for one specific message in mongodb and returns the message text
 * uses messages collection
 * responces either with an error message or a string containing the message
 */
exports.getOneMessa=function(req,res,callBfun){
    Message.find({_id: req.body.messageId},{'_id':1,'fName':1,
        'dateRec':1,uMessage:1,username:1}, function(err,messag) {
        if (messag[0].username=='Publ'){
            //to distract change Publ to Admin before output
            messag[0].username='Admin';
        }
        //console.log('messag: ',messag[0]);
        if (err) {
            respOnse={
                statCode: 500,
                resString:'',
                error:err.toString()
            };
        }else{
            respOnse={
                statCode: 200,
                resString:JSON.stringify(messag[0]),
                error:''
            };
        }
        callBfun(req,res,respOnse);
    });
};

/* Queries for user's message count
 * from messages collection
 * responces either with the number of stored messages by the user an error message
 */
exports.countUserMess=function(req,res,callBfun){
    //init response
    var messCount={'all': 0,'inModeration':0};
    //console.log('req.user: ',req.user);
    //console.log('messCount: ',messCount);
    if (!req.user){
        //console.log('missing req.user.username in countUserMess');
        respOnse={
            statCode: 200,
            resString:'no username available to count messages, try login '
            //error:err.toString()
        };
        callBfun(req,res,respOnse);
        return;
    }
    //valid user login continue to get count for all and in moderation messages
    Message.count({'username': req.user.username},function(err,countti) {
        //got number of all messages:
        if (err) {
            console.log('error getting message count for: ', req.user.username);
            respOnse={
                statCode: 500,
                resString:'message counting failed for '+req.body.username+
                ' retry after new login',
                error:err.toString()
            };
            callBfun(req,res,respOnse);
            return;
        }else{
            console.log(req.user.username,' all messages: ',countti);
            messCount.all=countti;
        }
    });
    Message.count({'username': req.user.username, 'moderated':false},function(err,countti) {
        //got number of in moderation messages
        if (err) {
            respOnse={
                statCode: 500,
                resString:'message counting failed for '+req.body.username+
                ' retry after new login',
                error:err.toString()
            };
        }else{
            //console.log(req.user.username,' in moderation count: ',countti);
            messCount.inModeration=countti;
            respOnse={
                statCode: 200,
                MessageCount:JSON.stringify(messCount),//countti,
                error:''
            };
        }
        callBfun(req,res,respOnse);
    });
};

/* Queries all moderated messages according to a schema in mongo db
 * uses messages collection
 * responces either with an error message or a string containing the directory structure
 */
exports.checkAllMessa=function(req,res,callBfun){
    //console.log("checkAllUserFiles username: ", req.body.userNme);
    var drTree=[];
    var fields = {'_id':1,'fName':1,'dateRec':1,'moderated':1};
    var querY={'moderated':true};
    if (req.user && req.user.username=='Publ'){
        //Publ user can view all messages
        querY={};
    }
    //console.log('querY: ',JSON.stringify(querY));
    Message.find(querY,fields, function(err,allMess) {
        var messFN=allMess.length;
        allMess.sort(function(a,b){
            if(a.fName< b.fName) return -1; //alphabetically sorts after message name
            if(a.fName >b.fName) return 1;
            if(a.dateRec< b.dateRec) return -1; //identical names sorted by receiving time
            if(a.dateRec >b.dateRec) return 1;
            return 0; // should never take place, receiving times can't be identical
        });
        console.log('allMess. ',allMess);
        //Put messages into json object for the jsTree widget
        for (var i=0;i<messFN;i++){
            var mesName=allMess[i].fName;
            var a=[];
            mesName = mesName.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
            //console.log('mesName: ',mesName);
            a=mesName.split("/");
            if (a.length==1){//thread item
                drTree.push({
                    "id": allMess[i]._id,
                    "parent": '#',
                    "text": mesName //,"icon":"jstree-folder"
                })
            }else{
                if (a.length>1){
                    var slashPos=mesName.lastIndexOf('/');
                    var fndIt=mesName.substring(0,slashPos);//folder part of the messagename:
                    var itemi=mesName.substring(slashPos+1); //end of string from the last '/'
                    var parnts=allMess.filter(function(e){//find parent candidates:
                        return (e.fName.indexOf(fndIt)==0)
                    });
                    parnts.sort(function(a, b) {
                        if (a.fName>b.fName) return 1;
                        if (a.fName<b.fName) return -1;
                        (a.dateRec> b.dateRec); //identical names sorted by recording date
                    });
                    var parnt=parnts[0]._id; //select the first candidate
                    drTree.push({
                        "id": allMess[i]._id,
                        "parent": parnt,
                        "text": itemi //,"icon":"jstree-folder"
                    })
                }
            }
            //console.log('drTree: ',drTree);
        }
        respOnse={
            statCode: 200,
            resString:JSON.stringify(drTree),
            error:''
        };
        //console.log('respOnse: ',respOnse);
        callBfun(req,res,respOnse);
    });
};