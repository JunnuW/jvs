/**
 * Created by Juha on 11/3/2015.
 * To be used as a node.js module for reading and saving mongodb documents.
 * This module organizes the saving and reading of documents into a directory tree
 * structure to be used in combination with jquery jstree plugin in purpose to
 * ease the browsing of available documents in the database
 */
var mongoose = require('mongoose');
//var util = require('util');
var d=new Date();
var vanhenee= d.toUTCString();
var matrlSchema = new mongoose.Schema({
    username: { type: String, required: true },
    fName: { type: String, required: true },
    description:{type: String, required: false},
    unit:{type: String, required: false},
    datArrs:{ type: Array, required: false},
    dataExpires: { type: String, required: true}
});

matrlSchema.index({username: 1, fName:1}, {unique: true});
var Material=mongoose.model('Material',matrlSchema);
//creates materials collection, if it does not exist in mongodb

var targSchema = new mongoose.Schema({
    username: { type: String, required: true },
    fName: { type: String, required: true },
    description:{type: String, required: false},
    unit:{type: String, required: false},
    spType:{type:String,required:true},
    datArrs:{ type: Array, required: false},
    dataExpires: { type: String, required: false}
});
targSchema.index({username: 1, fName:1}, {unique: true});
var Target=mongoose.model('Target',targSchema);
//creates targets collection, if it does not exist in mongodb

exports.obtainOne=function(req,res){
    console.log('obtainOne req.body: ',req.body);
    //queries one documents from mongo db
    var applModel;
    //var drTree=[];
    switch (req.body.dataColl){
        case "materials":
            applModel=Material; //model name for 'materials' collection
            break;
        case "targets":
            applModel=Target; //model name for 'targets' collection
            break;
        default:
            throw "invalid data request, obtainOne";
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
            res.writeHead(200, {'content-type': 'text/plain' });
            res.write('DocumentOK :'+docRes);
            res.end();
            //message.type = 'notificatication'
        }
        else {
            var responseStr= (err)? err.toString():fiName+ ' not found';
            res.write(responseStr);
            res.status(500);
            res.end();
            //message.type = 'error';
        }
    });
}

exports.deleteDoc=function(req,res){
//deletes query matching documents from mongo db
//uses collection name to select the document model
//applies Model.remove method to delete the document
//gets document name: req.body.fileName
    var applModel;
    //var drTree=[];
    switch (req.body.dataColl){
        case "materials":
            applModel=Material; //model name for 'materials' collection
            break;
        case "targets":
            applModel=Target; //model name for 'targets' collection
            break;
        default:
            throw "invalid data request in deleteDoc";
    }
    //document name to be searched:
    //var fiName = req.body.fileName.replace(/(^\/)|(\/$)/g, ""); //removes eventual leading and trailing '/'
    var fiName = req.body.fileName.replace(/(^\/)|(\/$)/g, ""); //removes eventual leading and trailing'/'
    //build delete query using regexp:
    var toReg=fiName.replace('/','\/');//slash characters in filename have to be escaped in regexp
    var re = new RegExp('^'+toReg);
    var querY = {fName: re, username: req.body.userNme};
    //var querY = {fName: fiName, username: req.body.userNme};
    //above chosen applModel determines the document collection:
    //FBFriendModel.find({ id:333 }).remove( callback );
    applModel.remove(querY, function(err,numberRemoved) {
        if (!err) {
            //Deleting was successful:
            res.write('deleting OK with: '+numberRemoved+' documents');
            res.status(200);
            res.end();
            //message.type = 'notification!';
        }
        else {
            var responseStr=err.toString();
            res.write(responseStr);
            res.status(500);
            res.end();
            //message.type = 'error';
        }
    });
}

exports.renameDocs=function(req,res) {
    //renames existing mongo db document with new fName
    var User = req.body.userNme;
    console.log('oldName: '+req.body.oldName);
    console.log('newName: '+req.body.newName);
    //console.log('fileType: '+req.body.fileType);
    var oldName = req.body.oldName.replace(/(^\/|\/$)/g, ""); //removes eventual leading and trailing '/'

    //get the directory part from the old filename
    var slashN=oldName.lastIndexOf('/');
    var dirX = oldName.slice(0,slashN+1);

    //build database query using regexp:
    var toReg=oldName.replace('/','\/');//slash characters in filename have to be escaped in regexp
    var re = new RegExp('^'+toReg);
    var querY = {fName: re, username: User};

    //pick a mongoose model for renaming update:
    var applModel;
    switch (req.body.dataColl){
        case "materials":
            applModel=Material; //model for 'materials' collection
            break;
        case "targets":
            applModel=Target; //model for 'targets' collection
            break;
        case "stacks":
            applModel=Stack; //model for 'stacks' collection
            break;
        default:
            throw "invalid data request in renameDoc";
    }

    //Finds the documents and renames them one by one:
    var renamedN=0; //progress counter in renaming
    applModel.find(querY, function (err, docs) {//finds the documents matching the query
        docs.forEach(function(entry) {
            perfOneRename(entry.fName);// renames them one by one
            renamedN+=1; //increments the counter
        });
        if (err) {//error in finding file from mongodb
            console.log('err: ' + err.toString());
            responseStr=err.toString();
            responseStr=responseStr+" while renaming: "+oldName+" document";
            res.write(responseStr);
            res.status(500);
            res.end();
        }
        if (renamedN>0){
            res.write('renaming OK for '+renamedN+'/'+docs.length+' docs');
            res.status(200);
            res.end();
        }
        else{
            res.write('No documents were renamed!');
            res.status(500);
            res.end();
        }
    });

    //perform one by one renaming:
    function perfOneRename(oldName) {
        var newN = req.body.newName.replace(/(^\/)|(\/$)/g, ""); //removes eventual leading and trailing '/'
        var oldFile = oldName.slice(dirX.length); //cuts off directory part from the beginning
        oldFile = oldFile.replace(/(^\/)/g, ""); //removes eventual leading '/'
        console.log('oldFile. '+oldFile);
        var slashPos=oldFile.indexOf('/');
        var restName=(slashPos>0)? oldFile.slice(slashPos+1) : '';
        console.log('oldFile: '+oldFile+' slashPos: '+slashPos+' restName: '+restName );
        if (restName.length>0) newN=newN+'/'+restName;
        if (req.body.fileType=='jstree-folder' && restName.length<=0) newN=newN+'/'; //creates empty folder?
        console.log('newName: '+newN);
        var options = {multi: false};
        var toRegEx=oldName.replace('/','\/');//slash characters have to be escaped
        var reg = new RegExp('^'+toRegEx);
        var queRy = {fName: reg, username: User};
        var renamed=0;
        //use the above data to rename one document
        applModel.update(queRy, { $set: { fName: newN }}, options,
            //i.e. Material or Target.update(......
            function(err,numAffected){
                // numAffected = 1, the renaming was successful
                console.log("numAffected: "+numAffected);
                if (!err && (numAffected===1)) {
                    return; //no error, renaming was successful
                }
                else {
                    var responseStr='Error';
                    if (err) {
                        responseStr=err.toString();
                    }
                    responseStr=responseStr+" while renaming: "+oldName+" document";
                    res.write(responseStr);
                    res.status(500);
                    res.end();
                }
            }
        );
    }
}

exports.updateDoc=function(req,res) {
    //console.log("updateDoc req.body.data: "+JSON.stringify(req.body.data));
    //overwrites existing mongo db document with new data
    //todo: update targets missing
    var dataa=JSON.parse(req.body.data); //data quality has already been verified by the urlencoded bodyparser
    //get document filename:
    var trimmed = dataa.Filename.replace(/(^\/)|(\/$)/g, ""); //removes eventual leading and trailing '/'
    var querY = {fName: trimmed, username: dataa.User};//builds database query:
    //builds update data:
    var upDates = {
        fName: trimmed,
        username: dataa.User,
        description: dataa.Descr,
        unit: dataa.Unit,
        datArrs: [{"absc":dataa.absc}, {"n":dataa.n}, {"k":dataa.k}],
        dataExpires: vanhenee
    };
    var options = {multi: false};
    console.log('in updateDoc Descr: '+dataa.Descr);
    //performs document update:
    Material.update(querY, upDates, options,
        function(err,numAffected){
            // numAffected is the number of updated documents
            //console.log("numAffected: "+numAffected);
            if (!err && (numAffected===1)) {
                res.write('saving OK');
                res.status(200);
                res.end();
            }
            else {
                var responseStr='';
                if (err) {
                    responseStr=err.toString();
                }
                responseStr=responseStr+" updated: "+numAffected+ "documents";
                res.write(responseStr);
                res.status(500);
                res.end();
            }
        });
}

exports.insertDoc=function(req,res){
    console.log("insertDoc req.body.data: "+JSON.stringify(req.body.data));
    //Transfer-Encoding is not a header in 'request' object only in 'responce' object!
    //it can be set to: chunk, but since the related:
    //req.on('data',function(chunk){}), isn't ever triggered here (on res object), we use:
    var dataa=JSON.parse(req.body.data);
    //Now the acceptable data length has already been checked by the urlencoded bodyparser
    // in node modules thus preventing malicious disk dumps
    //console.log("insertmat User: "+dataa.User);
    //var applModel;
    //var trim = dataa.Filename.replace(/(^\/)|(\/$)/g, ""); //removes leading and trailing '/'
    var trim = dataa.Filename.replace(/(^\/)/g, ""); //removes leading  '/'
    var newDocu={};
    console.log('collection: '+dataa.Collection);
    switch (dataa.Collection){
        case "materials":
            newDocu = new Material({
                    username: dataa.User,
                    fName:trim, //e.g. "branch1/parent1/parent2/file1",
                    description:dataa.Descr,
                    unit:dataa.Unit,
                    datArrs:[{"absc":dataa.absc}, {"n":dataa.n}, {"k":dataa.k}],
                    dataExpires: vanhenee}
            );
            break;
        case "targets":
            newDocu = new Target({
                    username: dataa.User,
                    fName:trim, //e.g. "branch1/parent1/parent2/file1",
                    description:dataa.Descr,
                    unit:dataa.Unit,
                    spType:dataa.type,
                    datArrs:[{"absc":dataa.absc}, {'percents':dataa.Sv}],
                    dataExpires: vanhenee}
            );
            break;
        case "stacks":
            applModel=Stack; //model for 'stacks' collection
            break;
        default:
            throw "invalid data request in insertDoc";
    }

    newDocu.save(function (err) {
        if (err) {
            console.log('Error in saving to mongo-db: '+err.toString());
            var responseStr=err.toString();
            res.write(responseStr);
            res.status(500);
            res.end();
        }
        else{
            console.log("saving OK: "+trim);
            res.write('saving OK');
            res.status(200);
            res.end();
        }
    });
}

exports.checkOneUserFile=function(req,res){
    //checks if document already exist in user's document collections
    console.log("checkOneUserFile username: ", req.body.userNme);
    console.log("checkOneUserFile collection: ", req.body.dataColl);
    var applColl;
    var drTree=[];
    switch (req.body.dataColl){
        case "materials":
            applColl=Material; //model name for 'materials' collection
            break;
        case "targets":
            applColl=Target; //model name for 'targets' collection
            break;
        default:
            throw "invalid data request in checkOneUserFile";
    }
    //document name to be searched:
    var fiName=req.body.fileName;
    if (fiName.charAt(0) === '/'){
        fiName = fiName.substr(1);
    }
    applColl.find({username: req.body.userNme, fName:fiName},{'_id':0,'fName':1}, function(err,obj) {
        var matFiles=obj.length;
        var existORnot=(obj.length)? "yes":"no";
        if (err) {
            res.writeHead(500, {'content-type': 'text/plain' });
            res.write(err.toString());
            res.end();
        }
        res.writeHead(200, {'content-type': 'text/plain' });
        //res.write(resp);
        res.write(existORnot);
        res.end();
    });
}

exports.checkAllUserFiles=function(req,res){
    //console.log("checkAllUserFiles username: ", req.body.userNme);
    //console.log("checkAllUserFiles dataColl: ", req.body.dataColl);
    var applColl;
    var drTree=[];
    //var huihai=Material;
    switch (req.body.dataColl){
        case "materials":
            applColl=Material;
            break;
        case "targets":
            applColl=Target;
            break;
        default:
            throw "invalid data request in checkAllUserFiles";
    }
    applColl.find({username: req.body.userNme},{'_id':0,'fName':1}, function(err,obj) {
        var matFiles=obj.length;
        var dirIds=[];
        var dirArr=[];
        var dirDepth=0;
        //console.log('saatiin: '+obj.length);
        for (var i=0;i<matFiles;i++){
            dirIds.push(obj[i].fName);
        }
        dirIds.sort();//sorted to alphabetical order
        for (var i=0;i<matFiles;i++){
            var a=[];
            a=dirIds[i].split("/");
            console.log('dirIds['+i+']: '+dirIds[i]);
            if (a.length>dirDepth) dirDepth= a.length;
            for (var s=0;s<a.length-1;s++){
                a[s]=a[s]+'/';
            }
            dirArr.push(a);
        }
        //console.log(dirArr);
        //console.log('dirDepth: '+dirDepth);
        var arrX=[]; //matrix for parent relations initialized
        for (var i=0;i<matFiles;i++){
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
        //console.log("dirArr: "+dirArr);
        //console.log("arrX: "+arrX);
        //console.log("k: "+k);
        for (var itemNo=1;itemNo<k+1; itemNo++){
            for (var col= 0;col<dirDepth;col++){
                for (var row=0;row<matFiles;row++){
                    if(arrX[row][col] && arrX[row][col]==itemNo ){
                        if (col==0) {//operates only on first column = root node
                            //,'icon': 'jstree-file' or ,'icon': 'jstree-folder'
                            if ((dirArr[row][col + 1]) || (dirArr[row][col].slice(-1)=='/')){
                                console.log("dirArr col:"+col+": "+dirArr[row][col]);
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
        var resp=drTree;
        res.writeHead(200, {'content-type': 'text/plain' });
        //res.write(resp);
        res.write(JSON.stringify(resp));
        res.end();
    });
}
