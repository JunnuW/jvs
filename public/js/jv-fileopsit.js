/**
 * File created by jv on 17.2.2015.
 * voihan vee.....
 *
 */

"use strict";

/* Function senData
* posts using XMLHttpRequest, (without jquery interactions)
* but this function is not used, kept here only for future needs
*/
function sendData(data) {
    var XHR = new XMLHttpRequest();
    var urlEncodedData = "";
    var urlEncodedDataPairs = [];
    var name;
    // We turn the data object into an array of URL encoded key value pairs.
    for(name in data) {
        urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
    }

    // We combine the pairs into a single string and replace all encoded spaces to
    // the plus character to match the behaviour of the web browser form submit.
    urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

    // We define what will happen if the data is successfully sent
    XHR.addEventListener('load', function(event) {
        console.log('Yeah! Data sent and response loaded.'+this.responseText);
        console.log('response status.'+this.status);
    });

    // We define what will happen in case of error
    XHR.addEventListener('error', function(event) {
        console.log('Oups! Something goes wrong.'+this.responseText);
    });

    // We setup our request
    XHR.open('POST', '/hsaveToDb2');
    // We add the required HTTP header to handle a form data POST request
    XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    //XHR.setRequestHeader('Content-Length', urlEncodedData.length);
    // And finally, We send our data.
    XHR.send(urlEncodedData);
}

/**
 * Function buildStack
 * initializes thin film stack
 */
function buildStack(){
    var theStack={
        "settings": {
            "polaris": "TE",
            "angle": 0,            //assumes perpendicular incidence in loss free cover material!!
            "RorT": "R",
            "backR": "false",
            "frontR": "false",
            "SubstrD": 1000000,    //assumed 1mm thickness, multiplied by 1000000 to get nm's
            "CoverD": 1000000,     //assumed 1mm thickness, multiplied by 1000000 to get nm's
            "spUnit": "nm",
            "spStart": 400,
            "spStop": 1000,
            "tunePrcnt": 0.5,      // tuning by multplication selected thicknesses with 1.005
            "usedTarg": "",         // spectral target selected for comparison
            "Descriptor": ""
        },
        "Materials": [],        //[["File":"","Name":"","Owner":"","Data":[]],[],[]....]
        "Targets": [],          //[]
        "Layers": [["Cover ", "DblClick to edit!", "bulk", "no",0],["Substrate", "DblClick to edit!", "bulk", "no",0]]
    };
    return theStack;
}

/**
 * Function afterStackRead
 * updates user interface after reading stack
 */
function afterStackRead(stakki){
    stack={}; //resets stack
    //stack=JSON.parse(rsObj.matrlStack);
    stack=stakki;
    /*console.log('before delete: ',stack);
    delete stack.ReadyForCalc;
    console.log('after delete: ',stack);*/
    stackArr=[];
    //stackArr=stack.Layers; // ei toimi, muutos stackArr:issa muuttaa myös stack.Layers:ia
    var n=stack.Layers.length;
    for (var i=0;i<n;i++){
        if (i==0||i==n){
            stack.Layers[i][4]='bulk';
        }
        stackArr.push(stack.Layers[i]);
        stack.Layers[i][4]=stack.Layers[i][2]; //stack.Layers[i][4] layer thickness for tuning revertion
    }

    //update material options on tabs 8:
    var matOptsArr = makeOptsArr(stack.Materials);
    oMatOptTable.fnClearTable();
    if (matOptsArr.length > 0) {
        oMatOptTable.fnAddData(matOptsArr);
    }
    //update target options on tabs 7
    var trgOptsArr = makeOptsArr(stack.Targets);
    oTargOptTable.fnClearTable();
    if (trgOptsArr.length > 0) {
        oTargOptTable.fnAddData(trgOptsArr);
    }
    oStackTable.fnClearTable();
    oStackTable.fnAddData(stackArr);

    var layers=stackArr.length;
    var tuneds=false;
    for (var j=0;j<layers;j++){
        //stackArr[j].push(stackArr[j][2]);
        if (stackArr[j][3]==="Yes") tuneds=true; //check if tuning checkbox has 'Yes'
    }
    if (tuneds) {//atleast one tuning checkbox has 'Yes'
        $("#adjustThs").show(); //show tuning toolbox
    }else{
        $("#adjustThs").hide();
    }
    updNKspArra();
    updRTspArra();
    StackTargSelUpd();  //populate stackTargs options
    updTargSpArra();    //update selected target to target array
    updGraph();
}

/**
 * Function Fills matrlArr, targArr or stack with data obtained from mongodb
 * @resObj  object returned from mongodb
 * @function
 */
function respToArr(fileName,resObj) {
    var activeTab = $("#tabis").tabs("option", "active");
    var selecTabId = $("#tabis ul>li a").eq(activeTab).attr('id');
    var laabel;
    var testa=$('#FilTreLege').text();
    var n = testa.lastIndexOf("public");
    if (n>-1){
        laabel='Public file';
    }else{
        laabel=dirUser+"\'s file"
    }
    setEdiLbl(laabel);//sets label on 'Materials', 'Targets' or 'Stack' tab
    switch (selecTabId) {
        case "Materials":
            var dataArrs=resObj.datArrs; //is still an object
            matrlArr=[];
            var oneRow=[resObj.unit, 'n', 'k',resObj.description];
            matrlArr.push(oneRow);
            var absc=dataArrs[0].absc;
            var n=dataArrs[1].n;
            var k=dataArrs[2].k;
            var numPoints=absc.length;
            for (var i=0; i<numPoints;i++){
                oneRow=[];
                oneRow.push(absc[i]);
                oneRow.push(n[i]);
                oneRow.push(k[i]);
                matrlArr.push(oneRow);
            }
            $('#ediMater').val(fileName);
            //console.log('matrlArr[0][3]: '+matrlArr[0][3]);
            if (matrlArr[0][3]) $('#descMater').val(matrlArr[0][3]);
            oMatTable.fnClearTable();
            oMatTable.fnAddData(matrlArr.slice(1));
            $('#matEditTabl').find('th:eq(0)').text("Unit [" + matrlArr[0][0] + "]");
            plotNK(matrlArr, 8); //tämäkö?
            EnDisButt('Enabled', '#btnUseMat');
            $.notifyBar({
             cssClass: "success",
             html: 'Material data was read' // "File was read:"
             });
            break;
        case "Targets":
            var dataArrs=resObj.datArrs; //is still an object
            targArr=[];
            var oneRow=[resObj.unit,resObj.spType,resObj.description];
            targArr.push(oneRow);
            var absc=dataArrs[0].absc;
            var RTval=dataArrs[1].percents;
            var numPoints=absc.length;
            for (var i=0; i<numPoints;i++){
                oneRow=[];
                oneRow.push(absc[i]);
                oneRow.push(RTval[i]);
                targArr.push(oneRow);
            }
            $('#ediTarge').val(fileName);
            if (targArr[0][2]) $('#descTarge').val(targArr[0][2]);
            otargTable.fnClearTable();
            otargTable.fnAddData(targArr.slice(1));
            //$('#ediTarge').val(targarr)
            plotRT(targArr, 7);
            EnDisButt('Enabled', '#btnUseTarg');
            $('#targEditTabl').find('th:eq(0)').text("Wavel. [" + targArr[0][0] + "]")
                .find('th:eq(1)').text(targArr[0][1] +  " -value");
            $.notifyBar({
                cssClass: "success",
                html: 'Spectral target was read' // "File was read:"
            });
            break;
        case "Stack":
            $('#ediStack').val(fileName);
            var settn=JSON.parse(resObj.matrlStack);
            //console.log('afterstackread stack : ',settn);
            $('#descStack').val(settn.settings.Descriptor);
            afterStackRead(settn); //inits objects and application interface for the stack
            $.notifyBar({
                cssClass: "success",
                html: 'Stack data was read' // "File was read:"
            });
            break;
        case "intro": // at start-up default stack is read from server using virtual 'intro' tab
            $('#ediStack').val(fileName);
            var settn=JSON.parse(resObj.matrlStack);
            $('#descStack').val(settn.settings.Descriptor);
            afterStackRead(settn); //inits objects and application interface for the stack
            break;
    }
}

/**
 * Function read description for a selected document in server mongodatabase
 * @fileName string Document name
 * @collec   string Document collection 'Materials', 'Targets', 'Stacks'
 * @function
 */
function mongoReadDesc(fileName){
    var datColl=pickCollection();
    var tokene;
    if (userName!='No login'){
        tokene=window.sessionStorage.getItem('RTFtoken');
    }
    var getDoc = $.post('/auth/dbFindOne',{
        userNme:  dirUser,
        fileName: fileName,
        rtftoken: tokene,
        //chooses between materials or targets data files
        Collection: datColl,
        replyType: 'descOnly'
        //fileType is either 'jstree-file' or 'jstree-folder'
    })
        .done(function (datas) {
            //successful reading responds "reading OK" otherwise an error message
            if (datas && datas.statCode==200){
                //console.log('Document reading response: '+datas);
                if (datas.resString.indexOf("DocumentOK")==0){//gives -1 if not found
                    var resText=datas.resString.slice(datas.resString.indexOf(':')+1);
                    //cuts out 'documentOK' from the beginning
                    //console.log('resText: '+resText);
                    //$.notifyBar({
                    //    cssClass: "success",
                    //    html: 'File description OK' // "File was read for description:"
                    //});
                    resText = (resText.length>0)? resText : 'no description available';
                    //$('#mongFileDesc').val(resText);
                } else {
                    //database responds with error message
                    $.notifyBar({
                        cssClass: "warning",
                        html: "File could not be found: "+datas.error
                    });
                }
            }
        })
        .fail(function(datas){
            handleFail(datas, 'File description not obtained');
        });
}

/**
 * Function open selected document in server mongodatabase
 * @fileName string Document new name
 * @collec   string Document collection 'Materials', 'Targets', 'Stacks'
 * @function
 */
function mongoGetOne(fileName){
    var datColl=pickCollection();
    //console.log('mongoGetOne: ',fileName,' ',respnce);
    var tokene;
    if (userName!='No login'){
        tokene=window.sessionStorage.getItem('RTFtoken');
    }
    var getDoc = $.post('/auth/dbFindOne',{
        userNme:  dirUser,
        fileName: fileName,
        rtftoken: tokene,
        Collection: datColl,//chooses between materials or targets data files
        replyType: 'wholeDoc'
    })
        .done(function (datas,textStatus) {
            if (textStatus=='nocontent'){//responsed with status 204 'nocontent
                console.log('no content 204');
                $.notifyBar({
                    cssClass: "warning",
                    html: "Data could not be obtained from server: "
                });
                return;
            }
            if (textStatus=='success' && datas){
                switch (datas.statCode){
                    case 200:
                        if (datas.resString.indexOf("DocumentOK")>-1) {
                            //cut out 'documentOK' text from the response string beginning
                            // and convert back to object
                            var resObj = JSON.parse(datas.resString.slice(datas.resString.indexOf('{')));
                            //todo: update filename and description inputs
                            respToArr(fileName, resObj);     //updates matrlArr to opened document
                            /*oMatTable.fnClearTable(); //clear nk table on tab-8
                             oMatTable.fnAddData(matrlArr.slice(1)); //updates editing table to opened document
                             $('#matEditTabl').find('th:eq(0)').text("Wavel. [" + matrlArr[0][0] + "]");
                             nkPlot = plotNK(matrlArr, 8); //updates graph
                             $('#ediMater').val(fileName);*/
                        }
                        break;
                    case 202:
                        //database responds with not found
                        //console.log('202:Data could not be obtained:  '+datas.error)
                        $.notifyBar({
                            cssClass: "warning",
                            html: "Data could not be obtained: "+datas.error
                        });
                        break;
                }
            }
            //console.log('reading done: ',datas,' ',textStatus);
            //successful reading responds "reading OK" otherwise an error message
        })
        .fail(function(datas){
            console.log('data reading failed: ',datas);
            handleFail(datas, 'Data was not obtainable');
        });
    DFmngo.dialog("close");
}

/**
 * Function rename selected document in server mongodatabase
 * @oldFile string Document old name to rename
 * @newFile string Document new name
 * @icon    string Document icon 'jstree-file' or 'jstree-folder'
 * @function
 */
function mongoRename(oldFile,newFile,icon){
    console.log('rename oldfile: '+oldFile+' newFile: '+newFile);
    var datColl=pickCollection();
    var tokene;
    if (userName!='No login'){
        tokene=window.sessionStorage.getItem('RTFtoken');
    }
    var renameDoc = $.post('/auth/dbRename',{
        userNme: dirUser,
        //if public files have been selected: dirUser=='Publ'
        //otherwise dirUser==userName
        Collection: datColl, //chooses between 'materials-' or 'targets data' files
        oldName: oldFile,
        rtftoken: tokene,
        newName:newFile,
        fileType:icon
        //fileType is either 'jstree-file' or 'jstree-folder'
    })
        .done(function (datas) {
            //successful renaming responds "renaming OK" otherwise an error message
            if (datas){
                console.log('Renaming response: '+datas);
                if (datas.resString.indexOf("renaming OK")>-1){
                    $('#btn-mngOpenSave').text("Save current data");//return original caption
                    $.notifyBar({
                        cssClass: "success",
                        html: datas.resString // "Your file was renamed:"
                    });
                }
                else{
                    //database responds with error message
                    $.notifyBar({
                        cssClass: "warning",
                        html: "File was not renamed, database error: "+datas.error
                    });
                }
            }
        })
        .fail(function(datas){
        handleFail(datas, 'Renaming failed');
        });
    DFmngo.dialog("close"); // '/auth/dbRename'
}

/**
 * Function deletes selected document from server mongodatabase
 * @fileN string Filename to delete
 * @collN string Collection name of the to be deleted
 * @function
 */
function mongoDelete(flNme) {
    var datColl = pickCollection();
    var tokene;
    if (userName!='No login'){
        tokene=window.sessionStorage.getItem('RTFtoken');
    }
    var deleteDoc = $.post('/auth/dbDelete', {
        userNme: dirUser,
        rtftoken: tokene,
        //chooses between materials or targets data files
        Collection: datColl,
        fileName: flNme
    })
        .done(function (datas) {
            //successful deleting responds "deleting OK" otherwise an error message
            if (datas && datas.statCode==200) {
                console.log('Deleting response: ' + datas.resString);
                if (datas.resString.indexOf('deleting OK') > -1) {
                    $('#btn-mngOpenSave').text("Save current data");//return original caption
                    $.notifyBar({
                        cssClass: "success",
                        html: "You deleted:" + datas.resString.slice(17)
                    });
                }
                else {
                    //database responds with error message
                    $.notifyBar({
                        cssClass: "warning",
                        html: "File was not deleted, database error: " + datas.error
                    });
                }
            }
        })
        .fail(function(datas){
            handleFail(datas, 'Nothing was deleted');
        });
    DFmngo.dialog("close");
}

/**
 * Function saves selected data to server mongodatabase
 * @fileN string Filename to save into server database
 * @collN string Collection name to save in database
 * @function
 */
function mongoSave(saveUrl,flNme) {
    //this either inserts new document to database using: saveUrl= '/auth/dbInsert'
    //or updates an existing document using: saveUrl= '/auth/dbUpdate'
    //first selects a document collection:
    var datColl = pickCollection(); //collection will be embedded in request data:
    var tokene;
    if (userName!='No login'){
        tokene=window.sessionStorage.getItem('RTFtoken');
    }
    var arrSave=[];
    var dialTitle=DFmngo.dialog('option','title');
    var dJson={};
    var sad=$('#mongoFileName').val();
    sad=sad.replace(/(^\/)|(\/$)/g, ""); //remove leading and trailing '/'
    sad=sad.trim();
    if (sad.length<1) {
        //if (flNme == $('#directoName').val()) {
        //save operation on directory
        dJson = toJsonArr(datColl, flNme, [], $('#mongFileDesc').val());
    }
    else {
        //console.log('arrSave.length: ' + arrSave.length);
        var descr=$('#mongFileDesc').val();
        switch (dialTitle){
            case ((dialTitle.match(/material/gi))? dialTitle: undefined) :
                //tehdään materiaalitiedostosta JSON:
                dJson = toJsonArr(datColl, flNme, matrlArr, descr);
                //arrSave=matrlArr;
                break;
            case ((dialTitle.match(/target/gi))? dialTitle: undefined) :
                //tehdään tarkettispektristä JSON:
                dJson = toJsonArr(datColl, flNme, targArr, descr);
                //arrSave=targArr;
                break;
            case ((dialTitle.match(/stack/gi))? dialTitle: undefined) :
                //tehdään stackistä JSON
                descr= descr.replace(/(^[\"\']+)|([\"\']+$)/g, ""); //remove leading and trailing single and double quotes
                dJson.Filename = flNme;
                //dJson.Descr = descr;
                console.log('stack: ',stack);
                dJson.Stack=stack;
                break;
            default:
                throw "No datacollection for "+dialTitle;
        }
        //dJson = toJsonArr(datColl, flNme, arrSave, $('#mongFileDesc').val());
        //dJson=toJsonArr(userName,datColl,flNme,[["nm","n","k"],[400,1.5,0.1],[420,1.51,0.05]],$('#mongFileDesc').val());
        //dJson=toJsonArr(userName,datColl,flNme,[["nm","R (or T)","% (or Abs)"],[500,55],[510,54]],[520,55]],$('#mongFileDesc').val());
    }
    var dbSave = $.post(saveUrl, {
        userNme:  dirUser,
        Collection:datColl,
        rtftoken: tokene,
        data: JSON.stringify(dJson) })
        .done(function (datas) {
            //successfull saving responds "saving OK" otherwise an error message
            if (datas && datas.statCode==200) {
                //console.log('saving response: ' + datas);
                if (datas.resString.indexOf("saving OK")>-1 || datas.resString.indexOf('Updated') > -1) {
                    $('#btn-mngOpenSave').text("Save file");//return original caption
                    switch (dialTitle){
                        case ((dialTitle.match(/material/gi))? dialTitle: undefined) :
                            $('#descMater').val($('#mongFileDesc').val());
                            EnDisButt('Enabled', '#btnUseMat');
                            break;
                        case ((dialTitle.match(/target/gi))? dialTitle: undefined) :
                            $('#descTarge').val($('#mongFileDesc').val());
                            EnDisButt('Enabled', '#btnUseTarg');
                            break;
                        case ((dialTitle.match(/stack/gi))? dialTitle: undefined) :
                            $('#descStack').val($('#mongFileDesc').val());
                            break;
                        default:
                            throw "No datacollection for "+dialTitle;
                    }
                    //matrlArr[0][3]=$('#mongFileDesc').val();
                    $.notifyBar({
                        cssClass: "success",
                        html: "Your data was saved to file: " + dJson.Filename
                    });
                }
                else {
                    $.notifyBar({
                        cssClass: "warning",
                        html: "File was not saved, database error: " + datas.error
                    });
                }
            }
        })
        .fail(function(datas){
            handleFail(datas, 'Nothing was saved');
        });
    DFmngo.dialog("close");
}

/**
 * Function picks the correct collection name from mongo database
 *
 * @function pickCollection
 * @return string Collection name to be used in server database
 */
function pickCollection(){
    var dialTitle=DFmngo.dialog('option','title');
    var mngoColle;
    switch (dialTitle){
        case ((dialTitle.match(/material/gi))? dialTitle: undefined) :
            mngoColle="materials";
            break;
        case ((dialTitle.match(/target/gi))? dialTitle: undefined) :
            mngoColle="targets";
            break;
        case ((dialTitle.match(/stack/gi))? dialTitle: undefined) :
            mngoColle="stacks";
            break;
        default:
            throw "No datacollection for "+dialTitle;
    }
    return mngoColle;
}

/**
 * Function prepares for mongodb saving operations with the chosen data
 * @mngFileN string filename to be used in the data saving
 * @function saveToMngoDb()
 */
function saveToMngoDb(mngFileN){
    //it is necessary to check, if the filename already exists:
    var datColl=pickCollection();
    //console.log('checking if file exists: '+mngFileN);
        var saveUserFile = $.post('/auth/checkOneUserF',{
            userNme: dirUser,
            //chooses between materials or targets data files
            Collection: datColl,
            fileName: mngFileN
        })
        //existence checking operation on server; should return either "yes" or "no"
        .done(function (data) {
            //console.log('if exists: '+data);
            if (data && data.statCode==200){
                switch (data.resString){
                    case "yes":
                        //file exists, needs to prompt for overwrite:
                        $('#btn-mngOpenSave').text("Confirm Overwrite");
                        //'overwrite File' click required before data overwrite
                        //stop saving operation
                        break;
                    case "no":
                        //file does not exist: it can be saved immediately
                        mongoSave('/auth/dbInsert',mngFileN);
                        //another way to proceed, use: sendData(dJson) where
                        // instead of jquery's ajax.post, XMLHttpRequest method is used
                        break;
                    default:
                        $.notifyBar({
                            //position: "bottom",
                            cssClass: "error",
                            html: "File was not saved! bad response from server!"
                        });
                        break;
                }
            } else{//no relevant response from server to existence query:
                //console.log('File existence was not checked from server');
                var errme=(data)? data.error
                    : "Could not check if file already exists in database!";
                $.notifyBar({
                    //position: "bottom",
                    cssClass: "error",
                    html: errme
                    //html: "Could not check if file already exists in database!"
                });
                DFmngo.dialog("close");
            }
        })
        //Failed to get a response from server
        .fail(function () {
            console.log('failed check connections');
            $.notifyBar({
                //position: "bottom",
                cssClass: "error",
                html: "(Connection or database error in server)"
            });
            DFmngo.dialog("close");
        });
}

function handleFail(errDatas,messag){
    console.log('response.stringify: '+JSON.stringify(errDatas));
    console.log('response.status: '+errDatas.status);
    //console.log('response.message: '+errDatas.responseText);
    var respMessa=messag;
    var fileN=$('#mongoFileName').val();
    switch (errDatas.statCode) {
        case 500:
            respMessa=messag+': '+errDatas.statusText+ ",  "+errDatas.responseText;
            break;
        case 400:
            respMessa=messag+' '+errDatas.statusText+ ",  "+errDatas.responseText;
            break;
        case 404:
            respMessa=messag+' '+" , error in Url?: "+saveUrl;
            break;
        case 413:
            respMessa=messag+' '+" , too much data? ";
            break;
        case 204:
            respMessa=messag+' '+' File was not found'
    }
    $.notifyBar({
        cssClass: "error",
        html: respMessa
    });
}

function treeUpdate(){
    $('#directoName').prop('disabled', false); //these should be enabled
    $('#mongoFileName').prop('disabled', false);
    $('#mongFileDesc').prop('disabled', false);
    var collec=pickCollection();
    console.log('collec: '+collec);
    var tokene;
    if (userName!='No login'){
        tokene=window.sessionStorage.getItem('RTFtoken');
    }
    //console.log('dirUser: ',dirUser);
    //console.log('treeupdate tokene: ',tokene);
    //fetches all user's file titles with their paths from server:
    var checkUserFiles = $.post('/auth/checkAllUserF',{
        userNme: dirUser,
        rtftoken: tokene,
        //uses either materials, targets or stacks data collection:
        Collection: collec
    })
        .done(function (data,status,xhr) {//
            if (data){
                //console.log('data.token: '+data.token);
                if (data.token=='invalid'){//invalid token, Otherwice data.token==undefined
                    userName='No login';
                    window.sessionStorage.setItem('RTFuser',userName);
                    window.sessionStorage.setItem('RTFtoken', null);
                    //console.log(data);
                    $.notifyBar({//alert reason for token failure is in data
                        //position: "bottom",
                        cssClass: "error",
                        html: data.response
                    });
                    $('#frm-Login').show();
                    $('#frm-FileTree').hide();
                    $('#btn-mngOpenSave').hide();
                    $('#btnLogMeOff').hide();
                    //setEdiLbl("Public file:")
                    return;
                }
                //console.log('data received: ',data);
                if (data.statCode==200){
                    aTreeData=JSON.parse(data.resString);
                    $('#mongoTree').jstree(true).settings.core.data = aTreeData;
                    $('#mongoTree').jstree(true).refresh();
                } else{
                    $.notifyBar({
                        cssClass: "error",
                        html: data.error
                    });
                }
            } else{
                console.log('no data received');
                $.notifyBar({
                 //position: "bottom",
                 cssClass: "error",
                 html: "Error in username and/or password, try again or hit Cancel"
                 });
            }
        })
        .fail(function () {
            console.log('failed to read user collection for '+pickCollection());
            $.notifyBar({
                //position: "bottom",
                cssClass: "warning",
                html: "(Connection or database error in server)"
            });
        })
            /*.error(function(XMLHttpRequest, textStatus, errorThrown){
                console.log('status:' + XMLHttpRequest.status + ', status text: ' + XMLHttpRequest.statusText);
            })*/
        ;
}

/**
 * Function builds JSON array from the material nk-data table
 * @function
 * @param arrDat (array) contains the nk values in a table
 * @param desc (text) descriptor for the data
 * @param coLLe (text) mongo database collection name for the saving
 */
function toJsonArr(coLLe, filename, arrDat, desc) {
    var resu = {}; //result will be a json object
        resu.Collection = coLLe;
        resu.Filename = filename;
        desc= desc.replace(/(^[\"\']+)|([\"\']+$)/g, ""); //remove leading and trailing single and double quotes
        resu.Descr = desc;
    if (arrDat.length<2){//no data, but build JSON response to create a directory)
        resu.Unit = ""; //no unit directory may contain dat with all three available units
    }else{// real material or spectral data exist (stack data already in JSON format)
        var unit=arrDat[0][0]; //should be
        if (unit!="nm" && unit!="um" && unit!="eV") {
            throw new Error("Unknown spectral unit"+unit);
            return;
        }
        resu.Unit = unit; //wavelength unit: nm, um or eV
        var sPoints=[];
        var arrLen=arrDat.length;
        if (coLLe=='materials') {//materials data to materials collection
            var ns=[];
            var ks=[];
            for (var i = 1; i < arrLen; i++) {
            //topmost data contains headings, start index at 1:
                sPoints.push(arrDat[i][0]);
                ns.push(arrDat[i][1]);
                ks.push(arrDat[i][2]);
            }
            resu.n = ns;
            resu.k = ks;
        }else {//targets data to targets collection
            var Sv=[]; //spectral value, either Reflectance or Transmittance
            for (var i = 1; i < arrLen; i++) {
                sPoints.push(arrDat[i][0]); // wavelength point
                Sv.push(arrDat[i][1]);
            }
            resu.type=arrDat[0][1]; // spectrum either R or T
            resu.Sv = Sv; //spectral value
        }
        resu.absc = sPoints; //wavelength array
        //console.log("res= "+JSON.stringify(resu,null,2));
    }
    return resu;
}

//*****************************************************************************************************
// reading local files for materials and targets from tab delimited text files
// cBackFun piirtää päivittää taulukot ja spektrit materiaali ja target tabseilla
function ReadLocFle(file, cBackFun) {
    console.log('read local file: ',file);
    var tid; //used for timer setting
    if (file) {
        //File exists set reading timeout:
        tid = setTimeout(function () {
            $("#CancelReadForm").dialog("open");
            $("#CancelReadForm b").text('15s time-out passed: Continue/Cancel?');
        }, 15000); // 15s:n jälkeen liipaistuu mutiTimo callback
        var fileCont; //variable for file contents
        // Handle reading progress, success, and errors
        // locReader.onprogress = updateProgress;
        locReader.onloadend = function (event) {
            fileCont = event.target.result;
            clearTimeout(tid);
            //onloadend event starts the callback including file contents and active tab index
            cBackFun(fileCont);
        };
        locReader.onerror = locFleErrorHandler;
        locReader.readAsText(file, "UTF-8");
    }
}

//Paikallisen tiedoston luvun callback: päivittää taulukot ja spektrit
function gotTextFile(fileCont) {
    //callback after successfully reading local files
    //could be made into three separate callbacks one for: Materials, Targets and Stack
    //test timo:
    //setTimeout(function(){alert("tab oli: "+cBackTab+"  File: "+fileCont.length)},30000);
    var activeTab = $("#tabis").tabs("option", "active");
    var selecTabId = $("#tabis ul>li a").eq(activeTab).attr('id');
    switch (selecTabId){
        case 'Materials':
            //console.log('Material read');
            matrlArr = splitToArr(fileCont);
            oMatTable.fnClearTable();
            oMatTable.fnAddData(matrlArr.slice(1));
            $('#matEditTabl').find('th:eq(0)').text("Unit [" + matrlArr[0][0] + "]");
            $('#descMater').val(matrlArr[0][3]);
            plotNK(matrlArr, 8);
            EnDisButt('Enabled', '#btnUseMat');
            break;
        case 'Targets':
            //console.log('Targets read');
            targArr = splitToArr(fileCont);
            $('#descTarge').val(targArr[0][2]);
            otargTable.fnClearTable();
            otargTable.fnAddData(targArr.slice(1));
            //RorT = targArr[0][1];
            if (targArr[0][1].indexOf('R')>-1){
                $('#targMode').text('Target spectrum for reflectance:');
            }
            else{
                $('#targMode').text('Target spectrum for transmission:');
            }
            $('#targEditTabl').find('th:eq(0)').text("Wavel. [" + targArr[0][0] + "]");
            $('#targEditTabl').find('th:eq(1)').text(targArr[0][1] + " -value");
            if (targArr[0][2]) {
                $('#descTarge').val(targArr[0][2]);
            }
            plotRT(targArr, 7);
            EnDisButt('Enabled', '#btnUseTarg');
            break;
        case 'Stack':
            //console.log('Stack was read');
            var stakki=stack=JSON.parse(fileCont);
            afterStackRead(stakki)
            //console.log('stakki: ',stakki);
            break;
    }
}

//Error handler for local filereading:
function locFleErrorHandler(evt) {
    switch (evt.target.error.code) {
        case evt.target.error.NOT_FOUND_ERR:
            alert('File Not Found!');
            break;
        case evt.target.error.NOT_READABLE_ERR:
            alert('File is not readable');
            break;
        case evt.target.error.ABORT_ERR:
            break; // noop
        default:
            alert('An error occurred reading this file.');
    }
    //if (evt.target.error.name == "NotReadableError"){
    //alert("The file could not be read.")
    //}
  }

//split values in tab separated text file into an array:
function splitToArr(tsvFile) {
    //tab separated values assumed for file format
    var tmps1 = [];
    var tmps2;
    var tmps3;
    var tmps4 = [];
    var tmps5 = [];
    var tmpsx = [];
    //splittimerkki voi olla: return&newline, pelkkä return tai pelkkä newline
    tmps1 = tsvFile.split(/\r\n|\r|\n/g);
    // riveittäin splittaus merkistä return&newline tai pelkkä return tai pelkkä newline
    // otetaan ensin parametrit ensimmäiseltä riviltä:
    // tämä tehdään erikseen koska niitä ei sortata kuten loppuosaa
    tmps5.push(tmps1[0].split('\t'));
    var len = tmps1.length;
    //spektraaliset tiedot ensimmäisen rivin jälkeen:
    for (var i = 1; i < len; i++) {
        tmps2 = [];
        tmps2 = tmps1[i].split('\t');
        //splitti tab merkissä: [lambda],[n],[k] tai [lambda],[R tai T]
        tmps3 = [];
        for (var j = 0; j < tmps2.length; j++) {
            tmps3.push(parseFloat(tmps2[j]));
        }
        if (parseFloat(tmps3[0]) > 0 && parseFloat(tmps3[1]) > 0) {
            if (!tmps3[2]) {
                //jos k-arvo puuttuu laitetaan se nollaksi
                tmps3[2] = 0;
            }
            tmps4.push(tmps3);
        }
        else {
            tmpsx.push(tmps3);
        }
    }
    //sortataan suuruusjärjestykseen toiselta riviltä alkaen
    if (tmps4.length > 1) {
        tmps4.sort(function (a, b) {
            return a[0] - b[0];
        });
    }
    //yhdistetään parametririvin alle
    if (tmps4.length > 1) {
        for (var ii = 0; ii < tmps4.length; ii++) {
            tmps5.push(tmps4[ii]);
        }
    }
    else {
        for (var ij = 0; ij < tmpsx.length; ij++) {
            tmps5.push(tmpsx[ij]);
        }
    }
    return tmps5;
    //Code for text file splitting ends here:
  }

/**
 * Function creates mongodialogform for opening files on server using js-tree plugin
 * @function
 */
var buildMongoDial=function(){
    // or, as well: function buildMongoDial(){
    //alert('mongo folder: '+window.location.origin);
    var dialTitle;
    $("#mongoDialForm")
        .dialog({
        //create: function( event, ui ) {alert('dialog created');},
        open: function() {//opens different dialogs for 'open file' and 'save file' operations
            //alert('dialog opens');
            $('#frm-DirSel').show();
            $('#frm-Login').hide();
            $('#frm-FileTree').hide();
            $('#btn-mngOpenSave').hide(); // file Open or Save button
            if (userName!='No login'){
                $('#btnLogMeOff').show();
            }
            else {
                $('#btnLogMeOff').hide();
            }
            //determine if for open- or save-file operation was request
            dialTitle=$("#mongoDialForm").dialog("option","title");//gets the open or save options:
            if (dialTitle.indexOf('Open')>-1){
                $('#btn-mngOpenSave').text('Open File');
                $('#btnPublDir').show(); //file opening allowed also on public area
            }
            else {
                $('#btn-mngOpenSave').text('Save current data');
                $('#btnPublDir').hide(); //saving is not allowed to public dir area
            }
        },
        autoOpen: false,
        hide:'explode',
        height: 'auto',
        width: 550,
        modal: true
        ,buttons: [
            //Button1: this button is always available for cancelling file operations (Open or Save)
            {   id:'btnMngoCancel',
                text: "Cancel",
                "class": 'big-btn',
                click: function () {
                    $('#FilTreLege').text('Files available on server:');
                    $(this).dialog("close");
                }
            },
            //Button2: this button is available if user has logged in, providing logg off and re-login
            //with another username
            {   id:'btnLogMeOff',
                text: "Log me off",
                "class": 'big-btn',
                click: function(){
                    //alert('logging off: '+userName);
                    $.get('/logout');
                    userName='No login';
                    window.sessionStorage.setItem('RTFuser','');
                    window.sessionStorage.setItem('RTFtoken','');
                    $('#frm-FileTree').hide();
                    $('#btnLogMeOff').hide();
                }
            },
            //Button3: this button is recycled for opening and saving data files
            {   id:'btn-mngOpenSave', //save- or open-file button
                text: 'Open File',    //assumes 'open-file' is the first operation
                "class": 'big-btn',
                click: function(){
                    var a=$('#btn-mngOpenSave').text();
                    if (a.indexOf('Open')>-1){//this is a file open operation
                        var fiile=$('#mongoFileName').val();
                        mongoGetOne(fiile,dirUser);
                        //which starts the file open operation and updates table and graph on Tabs8 or Tabs7
                    }
                    else {
                        var operSel=(a);
                        operDispatcher(operSel);
                    }
                }
            }//Buttons done for form1
        ]
    });
    var aTree=$('#mongoTree').jstree({
        //.aTree=$('#mongoTree').jstree({
        'core' : {
            "check_callback" :true
        },
        //initial jsTree structure:
           /* 'data' : [
                { "text" : "Root node", "children" : [
                    { "text" : "Child node 1" },
                    { "text" : "Child node 2" }
                    ]
                }
                ]
        ,*/
        "plugins" : ["contextmenu","wholerow","unique"]
        ,"contextmenu": {
            "items": function(node) {
                var menIts = $.jstree.defaults.contextmenu.items();
                //var action= $.jstree.defaults.contextmenu.items.rename();
                //console.log('items: '+JSON.stringify(menIts));
                menIts.create._disabled = true; // (node.icon=="jstree-file")? true: false;
                delete menIts.create;
                delete menIts.ccp;
                return menIts;
            },
            "select_node":true
        }
    });
    //aTree.on("change.jstree rename_node.jstree delete_node.jstree " +
    $('#mongoTree').on("change.jstree rename_node.jstree delete_node.jstree " +
    "deselect_all.jstree select_node.jstree", function (e, data) {
        //console.log("jstree-changed: "+Object.keys(data));
        //responds: action,node,selected,event,instance copy_node.jstree move_node.jstree
        switch  (e.type) {
            case 'deselect_all':
                //deselect all is triggered before new selected cell is activated
                //original node 'text' has to be returned if a rename operation is
                //interrupted  before clicking on 'Confirm rename file'
                var fleRena=data.node[0]; //gets previously selected node
                if (fleRena){
                    var noodi = data.instance._model.data[fleRena];
                    if (!noodi){
                        //$('#mongFileDesc').val(matrlArr[0][3]);
                        //$('#mongFileDesc').val('');
                        break;
                    }
                    var textOrig=noodi.original.text;
                    var texti=noodi.text;
                    if (texti!=textOrig) {
                        $('#mongoTree').jstree('set_text', noodi, textOrig);
                    }
                }else {
                    //$('#mongFileDesc').val(matrlArr[0][3]);
                    //$('#mongFileDesc').val('');
                }
                break;
            case 'select_node':
                selctdNde = data.instance.get_selected(true)[0];
                //enable input boxes:
                $('#mongoFileName').prop("disabled",false);
                $('#directoName').prop("disabled",false);
                //get the open or save option:
                var dialTitle=$("#mongoDialForm").dialog("option","title");
                //select button text between on Open or Save
                if (dialTitle.indexOf('Open')>-1){
                    $('#btn-mngOpenSave').text('Open File');
                }
                else {
                    $('#btn-mngOpenSave').text('Save current data');
                }
                //console.log('node was selected OK: '+selctdNde.id);
                var repl=mongoColle(selctdNde.id);
                $('#directoName').val(repl.Folder);
                if (selctdNde.icon=='jstree-file'){
                    $('#mongoFileName').val(repl.longFile);
                    //var usrN=(dirUser=='Publ')? 'Publ':userName;
                    mongoReadDesc(repl.longFile);
                }
                else{
                    $('#mongoFileName').val('');
                    //$('#mongFileDesc').val(matrlArr[0][3]);
                }
                break;
            case 'rename_node':
                //selctdNde=data.instance.get_selected(true)[0]
                var nodeOb=mongoColle(selctdNde.id);
                if (selctdNde.icon=='jstree-file'){
                    var texti=nodeOb.Folder;
                    texti= texti.replace(/(^\/)|(\/$)/g, ""); //remove leading and trailing '/'
                    texti=texti+'/'+selctdNde.text;
                    $('#mongoFileName').val(texti); //input now contains new filename with path
                    $('#btn-mngOpenSave').text('Confirm file rename');
                }
                else {
                    var slashPos=nodeOb.Folder.lastIndexOf('/');
                    var temTex=nodeOb.Folder.slice(0,slashPos+1);
                    temTex=temTex+selctdNde.text;
                    $('#btn-mngOpenSave').text('Confirm folder rename');
                    $('#directoName').val(temTex);
                    $('#mongoFileName').val(''); //input now empty
                }
                break;
            case 'delete_node':
                //console.log('in delete case');
                $('#mongoFileName').prop("disabled",true);
                $('#directoName').prop("disabled",true);
                var teksti= ($('#mongoFileName').val().length<1)? 'Confirm folder delete': 'Confirm file delete';
                $('#btn-mngOpenSave').text(teksti);
                break;
            default:
                //console.log('default ');
                break;
        }
    }); //a tree on.change ready

    $('#directoName, #mongoFileName').focus(function(){
        //user starts to edit filename, then revert button title to
        //force existence check before file saving,
        $('#btn-mngOpenSave').text("Save current data");
    });

    $('#btnUserDir').click(function(){
        //var activeTab = $("#tabis").tabs("option", "active");
        //var selecTabId = $("#tabis ul>li a").eq(activeTab).attr('id');
        if (userName!='No login'){ //user has logged in (but login maybe expired; token will be checked)
            dirUser=userName;
            $('#frm-Login').hide();
            treeUpdate();
            $('#frm-FileTree').show();
            $('#FilTreLege').text('Files on server in '+userName+'\'s directory');
            $('#btn-mngOpenSave').show();
            //setEdiLbl(userName+"\s file: ");
        } else {//no login, but user requests for private files
            dirUser='Publ';
            $('#frm-Login').show();
            $('#frm-FileTree').hide();
            $('#btn-mngOpenSave').hide();
            //setEdiLbl("Public file:");
        }
    });

    $('#btnLogInni').click(function(){//btnLogInni
        //var activeTab = $("#tabis").tabs("option", "active");
        //var selecTabId = $("#tabis ul>li a").eq(activeTab).attr('id');
        var mngUsr = $('#mngUsrnm').val();
        var mngPwd = $('#mngPWD').val();
        var usrMesg={ username: mngUsr, password:mngPwd };
        var checkUser = $.post('/login', usrMesg)
            .done(function (data) {
                //console.log('saatiin:'+ data+' userName: '+usrMesg.username);
                if (data.responseStr=='Login successfull'){
                    userName= usrMesg.username;
                    var accessToken=data.token;
                    window.sessionStorage.setItem('RTFuser',data.user.username);
                    window.sessionStorage.setItem('RTFtoken', accessToken);
                    $.notifyBar({
                        //position: "bottom",cssClass: "success",
                        html: "You are now logged in as: " + userName
                    });
                    $('#frm-Login').hide();
                    dirUser=userName;
                    treeUpdate();
                    $('#frm-FileTree').show();
                    $('#btnLogMeOff').show();
                    $('#btn-mngOpenSave').show();
                    $('#mngUsrnm').val('');//reset user and pswrd fields
                    $('#mngPWD').val('');
                    $('#FilTreLege').text('Files on server in '+userName+'\'s directory');
                    //setEdiLbl(userName+"\'s file:");
                }
                else{
                    //console.log('saatiin:'+ data+' userName: '+usrMesg.username);
                    userName= 'No login';
                    dirUser='Publ';
                    //setEdiLbl("Public file:");
                    $.notifyBar({
                        //position: "bottom",
                        cssClass: "error",
                        html: "Error in username and/or password, retry or hit Cancel"
                    });
                }
            })
            .fail(function () {
                console.log('saatiin:'+ data+' userName: '+usrMesg.username);
                userName='No login';
                dirUser='Publ';
                $.notifyBar({
                    //position: "bottom",
                    cssClass: "warning",
                    html: "Unable to authenticate user (Connection or database error)"
                });
            });
        dirUser = (userName=='No login')? 'Publ':userName;
    });

    $('#btnPublDir').click(function(){
        var activeTab = $("#tabis").tabs("option", "active");
        var selecTabId = $("#tabis ul>li a").eq(activeTab).attr('id');
        //console.log('tabis: '+selecTabId);
        dirUser='Publ';
        treeUpdate();
        $('#FilTreLege').text('Files on server in public directory');
        $('#frm-FileTree').show();
        $('#btn-mngOpenSave').show();
    });

    $('#btnLocDir').click(function(){
        //recycles this button on MongoDialForm for file saving and opening
        //Click is either for saving or opening a file in a local directory:
        var dialTitle=$("#mongoDialForm").dialog("option","title"); //gets the options for open or save
        switch (dialTitle) {
            case 'Open material file from':
                //console.log('open material data');
                $('#descMater').val('');
                $("#ediMaterLbl").text("Local file: ");
                $("#mongoDialForm").dialog("close");
                $("#matLocFiles").focus().click();
                break;
            case 'Open target file from':
                //console.log('open target data');
                $('#descTarge').val('');
                $("#ediTargeLbl").text("Local file: ");
                $("#mongoDialForm").dialog("close");
                $("#targLocFiles").focus().click();
                break;
            case 'Open stack file from':
                //console.log('open stack data');
                $('#descStack').val('');
                $("#ediStackLbl").text("Local file: ");
                $("#mongoDialForm").dialog("close");
                $("#stackLocFiles").focus().click();
                break;
            case 'Save material data to':
                var failneim = $('#ediMater').val();
                failneim=failneim.slice(failneim.lastIndexOf('/')+1);
                //array first line, quotes around last element help opening in Notepad:
                var seivString=matrlArr[0][0]+'\t'+matrlArr[0][1]+'\t'+matrlArr[0][2];
                if (matrlArr[0][3]) seivString+'\t'+'\"'+matrlArr[0][3]+'\"';
                var nRow='';
                for (var j=1;j<matrlArr.length;j++){
                    nRow=matrlArr[j][0]+'\t'+matrlArr[j][1]+'\t'+matrlArr[j][2];
                    seivString = seivString+'\r'+nRow;
                }
                seiv_loucal(failneim,seivString,matrlToLocFile);
                break;
            case 'Save target data to':
                var failneim = $('#ediTarge').val();
                failneim=failneim.slice(failneim.lastIndexOf('/')+1);
                //console.log('save target data to ',failneim);
                //targArr[0][0] : wavelength unit, [0][1] : 'R' or 'T', [0][2]: '%' or 'abs', [0][3]: description
                var seivString=targArr[0][0]+'\t'+targArr[0][1];
                //console.log('targArr[0][2]: '+targArr[0][2]);
                if (targArr[0][2]) {
                    var desc=targArr[0][2].replace(/(^[\"\']+)|([\"\']+$)/g, ""); //remove single and double quotes
                    desc='\"'+desc+'\"'; //add double quotes for notepad opening
                    seivString = seivString+'\t'+desc;
                }
                for (var j=1;j<targArr.length;j++){
                    nRow=targArr[j][0]+'\t'+targArr[j][1];
                    seivString = seivString+'\r'+nRow;
                }
                seiv_loucal(failneim,seivString,targetToLocFile);
                break;
            case 'Save stack data to':
                var failneim = $('#ediStack').val();
                failneim=failneim.slice(failneim.lastIndexOf('/')+1);
                var seivString=JSON.stringify(stack);
                seiv_loucal(failneim,seivString,stackToLocFile);
                break;
        }
        $("#mongoDialForm").dialog("close");
    });
}; //buildMongodial done

/**
 * Function gets the filename and parentfolder for a jstree-node
 * @nodeJson string jstree node id
 * @return object {Folder: foldername, shortFile:'filename', longFile:'filename with path'}
 */
function mongoColle(nodeJson){
    //function mongoColle(data){
    //here full js-tree data is used to build the directory of the selected node
    //seuraavasta saadaan selville nyt valittu node:
    //var dataa =$('#mongoTree').jstree(true).get_json('#', { 'flat': true });
    var obje = { longFile: '' ,shortFile:'', Folder: ''};
    //longfile: filename with directory, shortFile: only filename, Folder: only directory
    if (!aTreeData || nodeJson.length<1) {//return early if no data
        return obje;
    }
    var pathi='';
    var nde=$.grep(aTreeData, function(e){ return e.id == nodeJson; })[0];
    var fileTyp = nde.icon; //either 'jstree-folder' or 'jstree-file'
    var condition=true;
    var nodeId=nodeJson;
    var temp="";
    while (condition) {//grep (=filter array) to find node for nodeId:
        var noode=$.grep(aTreeData, function(e){ return e.id == nodeId; })[0];
        //Examine if root parent has not been reached:
        condition=(noode.parent != "#" && nodeId != 'ajason1'); //false if root parent
        temp = noode.text;
        temp = temp.replace(/(^\/)|(\/$)/g, "");
        pathi = temp + "/" + pathi;
        nodeId=noode.parent;
    }
    pathi = pathi.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
    var slashN = pathi.lastIndexOf('/');
    obje.longFile = temp;
    if (fileTyp == 'jstree-file'){
        temp = pathi.slice(0,slashN+1);
        obje.Folder = temp.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
        obje.shortFile = pathi.slice(slashN+1);
        obje.longFile=obje.Folder+'/'+obje.shortFile;
    }
    else {
        obje.Folder = pathi;
        obje.longFile = '';
        obje.shortFile='';
    }
    return obje;
}

/**
 * Function checks filename on inputfield text
 * @return string mngFileN
 */
function fleNamer() {
    var fNamed;
    var fileN = $('#mongoFileName').val();
    if (fileN.length<1){// means the filename field is empty
        alert("Filename is required");
        return fNamed;//undefined
    }
    fileN = fileN.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
    var myRegxp1 = /^[-_\/\sa-z0-9]+$/i;
    if (!myRegxp1.test(fileN)) {//only alphanumerics with "-", "_" and "/" are allowed
        alert("Invalid filename: " + fileN);
        return fNamed;//undefined
    }
    var dirN=$('#directoName').val();
    dirN = dirN.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
    if (!myRegxp1.test(dirN)) {//only alphanumerics with "-", "_" and "/" are allowed
        alert("Invalid directory name: " + dirN);
        return fNamed;//undefined
    }
    var overLap=fileN.indexOf(dirN); //is directory already included in the beginning of filename?
    //console.log('dirname overlap: ',overLap);
    fNamed = (overLap==0)? fileN : dirN+'/'+fileN;
    //console.log('filename: ',fNamed);
    return fNamed;
}

function operDispatcher(operatSel){
    var mngFileN = fleNamer();
    if (!mngFileN) {
        return;
    }
    switch (operatSel) {
        case 'Save current data':
            saveToMngoDb(mngFileN);
            //$('#mongFileDesc').val('');
            break;
        case 'Confirm Overwrite':
            //console.log('overwriting file: ');
            //updates an existing document:
            //console.log('overwriting file: '+mngFileN);
            mongoSave('/auth/dbUpdate',mngFileN);
            break;
        case 'Save Changes':
            //adding new folder or renaming existing file
            //console.log('saving empty directory: ');
            //saves an empty folder:
            saveToMngoDb(mngFileN);
        case 'Confirm file delete':
            //console.log('deleting file: '+mngFileN);
            mongoDelete(mngFileN);
            break;
        case 'Confirm folder delete':
            //console.log('deleting folder: '+mngFileN);
            mongoDelete(mngFileN);
            break;
        case 'Confirm file rename' :
            console.log('file rename');
            var oldFile=mongoColle(selctdNde.id).Folder;
            oldFile=oldFile.replace(/(^\/)|(\/$)/g, ""); //remove leading and trailing '/'
            oldFile=oldFile+'/'+selctdNde.original.text;
            var newFile=mngFileN;
            var ikoni=selctdNde.original.icon;
            mongoRename(oldFile,newFile,ikoni);
            //$('#mongoFileName').disabled=true;
            //$('#directoName').disabled=false;
            break;
        case 'Confirm folder rename':
            console.log('folder rename');
            var newFile=$('#directoName').val();
            newFile=newFile.replace(/(^\/)|(\/$)/g, ""); //remove leading and trailing '/'
            var slashPos=newFile.lastIndexOf('/');
            var oldFile=newFile.slice(0,slashPos+1);
            oldFile=oldFile+selctdNde.original.text;
            var ikoni=selctdNde.icon;
            mongoRename(oldFile,newFile,ikoni);
            //$('#mongoFileName').disabled=false;
            //$('#directoName').disabled=true;
            break;
        case 'Confirm moving':
            var oldfile=$.jstree.reference('#mongoTree').node;
            //console.log('moving node: '+JSON.stringify(oldfile));
            //var selctdNde=$.jstree.reference('#mongoTree').get_selected(true)[0];
            //console.log('moving: '+selctdNde.id);
            var newFile=selctdNde.text;
            var oldName=selctdNde.original.text;
            var ikoni=selctdNde.original.icon;
            //console.log('icon: '+ikoni);
            //console.log('oldFile: '+oldFile+' newFile: '+newFile);
            //mongoMove(mngFileN,newFile,ikoni);
            break;
        case 'Confirm copying':
            var v =$('#mongoTree').jstree(true).get_json('#', { 'flat': true });
            //console.log('v. '+JSON.stringify(v));
            var oldfile='';
            /*var jsData=$.jstree.reference('#mongoTree').get_selected(true)[0];
            $.jstree.reference('#mongoTree'.getElementByID('branch'));
            console.log('keys: '+Object.keys($.jstree.reference('#mongoTree').element));
            //console.log('data: '+JSON.stringify(Object.keys(jsData.data)));
            console.log('element: '+JSON.stringify($.jstree.reference('#mongoTree').element));
            var selctdNde=$.jstree.reference('#mongoTree').get_selected(true)[0];
            console.log('Selected node: '+JSON.stringify(selctdNde));*/
            //todo: laita
            //var newFile=selctdNde.text;
            //var oldName=selctdNde.original.text;
            //var ikoni=selctdNde.original.icon;
            //console.log('icon: '+ikoni);
            //console.log('oldName: '+oldName+' newName: '+newFile);
            //mongoCopy(mngFileN,newFile,ikoni);
            break;

        default:
            throw "Unknown command: "+operatSel;
            break;
    }
};

/*makeOptsArr(aRRa)
* produces materials menu and spectral targets menu lists on
* corresponding tabs
* aRRa is either material or target data array
 */
function makeOptsArr(aRRa){
    //aRRa joko stack.Materials tai stack.Targets
    var rCount = aRRa.length;
    var tmpArra = [];
    var tmpRow;
    for (var i = 0; i < rCount; i++) {
        tmpRow = [];
        tmpRow.push(i);
        tmpRow.push(aRRa[i].Name);
        tmpRow.push(aRRa[i].Data[0][0]); //Unit
        tmpRow.push(aRRa[i].Data.length);
        tmpRow.push(aRRa[i].Owner);
        tmpRow.push(aRRa[i].File);
        tmpArra.push(tmpRow);
    }
    return tmpArra;
}

/**
 * Function to save text files to local downloads directory
 * @filesname string default filename that can be edited in the messagebox
 * @texti  string text that will be saved (for reopening in this program tab separated fields)
 * browser settings should set to prompt for file download saving directory before saving!
 */
function seiv_loucal(filesname, texti,calliPakki) {
    var pom = document.createElement('a');
    document.body.appendChild(pom); //required in FF, optional for Chrome
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(texti));
    pom.setAttribute('download', filesname);
    pom.target="_self" ; //required in mozilla FF, optional for Chrome
    pom.click();
    calliPakki(filesname);
    /*var pom = document.createElement('a');
    document.body.appendChild(pom); //required in FF, optional for Chrome
    pom.href = filenamePath;
    pom.download = filenameDisplay;
    pom.target="_self" ; //required in FF, optional for Chrome
    pom.click();*/
}

function matrlToLocFile(filesname){
    //EnDisButt('Enabled', '#btnUseTarg');
    console.log('Saved material to local file: '+filesname);
}

function targetToLocFile(filesname){
    EnDisButt('Enabled', '#btnUseTarg');
    console.log('Saved target to local file: '+filesname);
}

function stackToLocFile(filesname){
    //EnDisButt('Enabled', '#btnUseTarg');
    console.log('Saved stack to local file: '+filesname);
}

  //Tabs-7 & Tabs-8 järjestää editoidun taulukon suuruusjärjestykseen
function sorttaa(aRRay) {
    var tmpR1 = aRRay.slice(0, 1); //tässä vain ensimmäinen rivi
    var tmpR2 = aRRay.slice(1); //tässä loput
    tmpR2.sort(function (a, b) {//sortataan ensimmäisen sarakkeen [0] mukaan:
        return a[0] - b[0];
    });
    return tmpR1.concat(tmpR2);
}

function get_cookies_array() {
    var cookies = { };
    if (document.cookie && document.cookie != '') {
        var split = document.cookie.split(';');
        for (var i = 0; i < split.length; i++) {
            var name_value = split[i].split("=");
            name_value[0] = name_value[0].replace(/^ /, '');
            cookies[decodeURIComponent(name_value[0])] = decodeURIComponent(name_value[1]);
        }
    }
    return cookies;
}

function setEdiLbl(texti){
    var activeTab = $("#tabis").tabs("option", "active");
    var selecTabId = $("#tabis ul>li a").eq(activeTab).attr('id');
    switch (selecTabId){
        case 'Materials':
            $("#ediMaterLbl").text(texti);//user requests for material files
            break;
        case 'Targets':
            $("#ediTargeLbl").text(texti);//user requests for targets files
            break;
        case 'Stacks':
            $("#ediStackLbl").text(texti);//user requests for stack files
            break;
    }
}

function menuTitle(filN){
    var sliceLen = filN.indexOf('.');
    if (sliceLen < 0) sliceLen = filN.length;
    var menuName = filN.slice(0, sliceLen); //cuts off .txt from file end
    sliceLen = menuName.lastIndexOf('/')+1; //cuts away beginning until last '/'
    menuName=menuName.slice(sliceLen);
    sliceLen = menuName.lastIndexOf('\\')+1; //cuts off from beginning until the last '\'
    menuName=menuName.slice(sliceLen);
    return menuName;
}