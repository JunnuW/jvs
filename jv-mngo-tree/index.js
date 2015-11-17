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

//var applModel;
function ApplMod(req){
    switch (req.body.dataColl){
        case "materials":
            applModel= Material; //model name for 'materials' collection
            break;
        case "targets":
            applModel= Target; //model name for 'targets' collection
            break;
        default:
            applModel='';
            break;
    }
    return applModel;
}


exports.obtainOne=function(req,res,callBfun){
    //console.log('obtainOne req.body.userNme: ',req.body.userNme);
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
            respOnse={
                statCode: 200,
                resString:'DocumentOK :'+docRes,
                error:''
            };
        }
        else {
            var responseStr= (err)? err.toString():fiName+ ' not found';
            respOnse={
                statCode: 500,
                resString:'',
                error:responseStr
            };
        }
        callBfun(req,res,respOnse);
    });
}

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
            error:"invalid request obtain one document"
        };
        callBfun(respOnse);
        return;
    }
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
    applModel.update(querY, upDates, options,
        function(err,numAffected){
            // numAffected is the number of updated documents
            //console.log("numAffected: "+numAffected);
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
    //console.log("insertDoc req.body.data: "+JSON.stringify(req.body.data));
    console.log('insertDoc reg.body: ',req.body);
    //Transfer-Encoding is not a header in 'request' object only in 'responce' object!
    //it can be set to: chunk, but since the related:
    //req.on('data',function(chunk){}), isn't ever triggered here (on res object), we use:
    var dataa=JSON.parse(req.body.data);
    //The acceptable data length has already been checked by the urlencoded bodyparser
    // in node modules, which prevents malicious disk dumps
    //var trim = dataa.Filename.replace(/(^\/)|(\/$)/g, ""); //removes leading and trailing '/'
    var trim = dataa.Filename.replace(/(^\/)/g, ""); //removes leading  '/'
    var newDocu={};
    console.log('collection: '+dataa.Collection);
    switch (dataa.Collection){
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
                    username: req.userNme,
                    fName:trim, //e.g. "branch1/parent1/parent2/file1",
                    description:dataa.Descr,
                    unit:dataa.Unit,
                    spType:dataa.type,
                    datArrs:[{"absc":dataa.absc}, {'percents':dataa.Sv}],
                    dataExpires: vanhenee}
            );
            break;
        case "stacks":
            //applModel=Stack; //model for 'stacks' collection
            break;
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
    //console.log("checkOneUserFile username: ", req.body.userNme);
    //console.log("checkOneUserFile collection: ", req.body.dataColl);
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
        callBfun(req,res,respOnse);
    });
};


/* Queries all documents with a schema from mongo db
 * uses collection name to select the document schema for either materials or targets
 * responces either with an error message or a string containing the directory structure
 */
exports.checkAllUserFiles=function(req,res,callBfun){
    //console.log("checkAllUserFiles username: ", req.body.userNme);
    //console.log("checkAllUserFiles dataColl: ", req.body.dataColl);
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
    var drTree=[];
    applModel.find({username: req.body.userNme},{'_id':0,'fName':1}, function(err,obj,next) {
        var matFiles=obj.length;
        var dirIds=[];
        var dirArr=[];
        var dirDepth=0;
        //console.log('saatiin: '+obj.length);
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


