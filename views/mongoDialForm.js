/**
 * Created by Juha on 4/16/2017.
 */
$("#mongoDialForm").dialog({
    open: function () {
        //opens different dialogs for 'open file' and 'save file' operations
        var otsikko=$(this).dialog('option','title');
        if (otsikko=='Save simulation spectrum') {//only 'Save emission spectrum' title opens this fieldset :
            $('#saaveSim').css('display','inline');
        } else {
            $('#saaveSim').css('display','none');
        }
        $('#frm-DirSel').show();      //shows directory selection buttons
        $('#frm-Login').hide();       //login needed only if private directories chosen
        $('#frm-FileTree').hide();    //filetree hidden until directory selected
        $('#btn-mngOpenSave').hide(); //file Open or Save button
        if (userName != 'No login') {
            $('#btnLogMeOff').show();
        } else {
            $('#btnLogMeOff').hide();
        }
        //determine if open- or save-file operation was requested
        var dialTitle = $("#mongoDialForm").dialog("option", "title");//gets the open or save options:
        if (dialTitle.indexOf('Open') > -1) {
            //dialog is for open file
            $('#btn-mngOpenSave').text('Open File');
            $('#btnPublDir').show(); //file opening allowed also on public dir area
        } else {
            $('#btn-mngOpenSave').text('Save data');
            $('#btnPublDir').hide(); //saving is not allowed to public dir area
        }
    },
    autoOpen: false,
    hide: { effect: "explode", duration: 500 },
    height: 'auto',
    width: 'auto',
    modal: false,
    buttons: [
        //Button1: this button is always available for cancelling file operations (Open or Save)
        {   id: 'btnMngoCancel',
            text: "Cancel",
            "class": 'medium-btn',
            click: function () {
                $('#mongoTree').jstree('deselect_all');
                $('#mongoTree').jstree('close_all');
                $('#FilTreLege').text('Files available on server:');
                var otsikko=$(this).dialog('option','title');
                //var openMeas=$('#radioMeas').prop('checked');
                var dialoogi = $('#settnDial').dialog('option', 'title');
                console.log('dialoogi:',dialoogi);
                if (dialoogi == 'Inhomogeneous spectrum') {
                    //cancel nappula tyhjentää inhomogeneous experimental spektrin
                    //jos experimental on valittuna radiobuttoneista
                    var txt;
                    if (confirm("Clear inhomog. graph!") == true) {
                        inhomSpectr.experPlot = [];
                        inhomSpectr.experArr = [];
                        graphSettn.inhomFileN = '';
                        $('#inhDescLbl').css('display', 'none');
                        $('#inhDesc').css('display', 'none');
                        $('#inhDesc').html('');
                        makeExpArrs();
                        inhombr();
                    }
                else if (dialoogi == 'Homogeneous spectrum' && openMeas) {
                    //cancel nappula tyhjentää homogeneous experimental spektrin
                    //jos experimental on valittuna radiobuttoneista
                    homSpectr.experPlot = [];
                    homSpectr.experArr = [];
                    simSettn.fileN = '';
                    $('#homDescLbl').css('display', 'none');
                    $('#homDesc').css('display', 'none');
                    $('#homDesc').html('');
                    makeExpArrs();
                    hombr();
                }
                    $(this).dialog("close");
                }
            }
        },
        //Button2: this button is available if user has logged in, providing logg off and re-login
        //with another username
        {
            id: 'btnLogMeOff',
            text: "Log me off",
            "class": 'medium-btn',
            click: function () {
                //alert('logging off: '+userName);
                $.get('/logout');
                userName = 'No login';
                window.sessionStorage.setItem('RTFuser', '');
                window.sessionStorage.setItem('RTFtoken', '');
                $('#frm-FileTree').hide();
                $('#btnLogMeOff').hide();
            }
        },
        //Button3: this button is recycled for opening and saving data files
        {
            id: 'btn-mngOpenSave', //save- or open-file button
            text: 'Open File',    //assumes 'open-file' is the first operation
            "class": 'medium-btn-inline',
            click: function () {
                var a = $('#btn-mngOpenSave').text();
                if (a.indexOf('Open') > -1) {//this is a file open operation
                    var fiile = $('#mongoFileName').val();
                    mongoGetOne(fiile, dirUser);
                    //which starts the file open operation and updates table and graph on Tabs8 or Tabs7
                } else {
                    var operSel = (a);
                    operDispatcher(operSel);
                }
            }
        }//All dialog buttons defined
    ]
});
/*MathJax.Hub.Config({
 TeX: {
 equationNumbers: {autoNumber: "AMS"},
 tex2jax: {inlineMath: [['$', '$'], ['\\(', '\\)']]}
 }
 });*/

/*Simulation spectrum saving options
 * Simulated spectrum can be saved only locally either with
 * all simulation, every other, every third or every fourth simulation points
 * simulation parameters and experimental data locally and on server
 * */
$('#chkSavePars, #chkSaveSimu').click(function(){
    $('#btnUserDir').attr("disabled", false);
    $('#btnLocDir').attr("disabled", false);
    if ($(this).attr('id') == 'chkSaveSimu' && $(this).prop('checked')==true) {
        $('#numSel').prop('disabled',false);
    }
    if ($(this).attr('id') == 'chkSavePars' && $(this).prop('checked')==true) {
        $('#numSel').prop('disabled',true);
    }
    if ($('#chkSaveSimu').prop('checked')==true){
        $('#btnUserDir').attr("disabled", true);
        $('#numSel').prop('disabled',false);
    }else{
        $('#btnUserDir').attr("disabled", false);
        $('#numSel').prop('disabled',true);
    }
    if($('#chkSaveSimu').prop('checked')==false && $('#chkSavePars').prop('checked')==false){
        $('#btnUserDir').attr("disabled", true);
        $('#btnLocDir').attr("disabled", true);
        $('#numSel').prop('disabled',true);
    }
});

/**
 * Function read description for a selected document in server mongodatabase
 * @fileName string Document name
 * @collec   string Document collection 'Materials', 'Targets', 'Stacks'
 * @function
 */
function mongoReadDesc(fileName, callsback) {
    var datColl = pickCollection();
    var tokene;
    if (userName != 'No login') {
        tokene = window.sessionStorage.getItem('RTFtoken');
    }
    var getDoc = $.post('/auth/dbFindOne', {
        userNme: dirUser,
        fileName: fileName,
        rtftoken: tokene,
        //chooses between materials or targets data files
        Collection: datColl,
        replyType: 'descOnly'
        //fileType is either 'jstree-file' or 'jstree-folder'
    })
        .done(function (datas) {
            //successful reading responds "reading OK" otherwise an error message
            if (datas && datas.statCode == 200) {
                if (datas.resString.indexOf("DocumentOK") == 0) {//gives -1 if not found
                    var resText = datas.resString.slice(datas.resString.indexOf(':') + 1);
                    //cut out 'documentOK' from the beginning
                    resText = (resText.length > 0) ? resText : 'without description';
                    callsback(resText);
                } else {
                    //database responds with error message
                    $.notifyBar({
                        cssClass: "warning",
                        html: "File not found: " + datas.error
                    });
                    callsback('');
                }
            }
        })
        .fail(function (datas) {
            handleFail(datas.responseText, 'Description not obtained');
            callsback('');
        });
}

/**
 * Function validates file description before saving to mongodb
 * text input: mongFileDesc on mongoDialForm holds the  description
 * @function
 */
/*function FileDescOk(tryThis){
 var rege=new RegExp("^[a-zA-Z0-9_-]*$");
 //var rege=new RegExp("\w");
 // var resu = rege.test(tryThis);
 var resu = rege.exec(tryThis);
 return resu;
 }*/

/**
 * Function saves selected data to server mongodatabase
 * @fileN string Filename to save into server database
 * @collN string Collection name to save in database
 * @function
 */
function mongoSave(saveUrl, flNme) {
    //either inserts a new document to database using: saveUrl= '/auth/dbInsert'
    //or updates an existing document using: saveUrl= '/auth/dbUpdate'
    //first a document collection is selected:
    var datColl = pickCollection(); //collection will be embedded in save request:
    var tokene;
    if (userName != 'No login') {
        tokene = window.sessionStorage.getItem('RTFtoken');
    }
    var arrSave = [];
    var dialTitle = DFmngo.dialog('option', 'title');
    var dJson = {};
    var sad = $('#mongoFileName').val();
    sad = sad.replace(/(^\/)|(\/$)/g, ""); //remove leading and trailing '/'
    sad = sad.trim();
    if (sad.length < 1) {
        //if (flNme == $('#directoName').val()) {
        //save operation is a directory??
        dJson = toJsonArr(datColl, flNme, [], $('#mongFileDesc').val());
    }
    else {
        var descr = $('#mongFileDesc').val();
        switch (dialTitle) {
            case ((dialTitle.match(/material/gi)) ? dialTitle : undefined) :
                //tehdään materiaalitiedostosta JSON:
                dJson = toJsonArr(datColl, flNme, matrlArr, descr);
                //arrSave=matrlArr;
                break;
            case ((dialTitle.match(/target/gi)) ? dialTitle : undefined) :
                //tehdään reflektanssi- tai transmissiotarkettispektristä JSON:
                dJson = toJsonArr(datColl, flNme, targArr, descr);
                break;
            case ((dialTitle.match(/Save Inhomogeneous/gi)) ? dialTitle : undefined) :
                //tallennetaan serveriin experimentaalikäyrä
                //Inhomogeneous kentän mitatusta spektristä tehdään JSON:
                dJson = toJsonArr(datColl, flNme, inhomSpectr.experArr, descr);
                break;
            case ((dialTitle.match(/Save Homogeneous/gi)) ? dialTitle : undefined) :
                //tallennetaan serveriin experimentaalikäyrä
                //Homogeneous kentän mitatusta spektristä tehdään JSON:
                dJson = toJsonArr(datColl, flNme, homSpectr.experArr, descr);
                break;
            case ((dialTitle.match(/stack/gi)) ? dialTitle : undefined) :
                descr = descr.replace(/(^[\"\']+)|([\"\']+$)/g, ""); //remove leading and trailing single and double quotes
                dJson.Filename = flNme;
                dJson.Descr = descr;
                dJson.Stack = stack;
                break;
            case ((dialTitle.match(/Save simulation/gi)) ? dialTitle : undefined) :
                //tallennetaan serveriin simulointiparametrit
                dJson.Filename = flNme;
                dJson.Descr = descr;
                dJson.Header = makeSimHeader();//string from jv-fileopsit.js
                dJson.Params= JSON.stringify(simParHeader()); //object from jv-fileopsit.js
                /*var saveHeader = 'Header:' + makeSimHeader(); //string from jv-fileopsit.js
                var seivString = saveHeader;
                if ($('#chkSavePars').prop('checked')) {//simulointiparametrit mukaan:
                    seivString +='\n'+'Parameters:'+ JSON.stringify(simParHeader());
                }
                if ($('#chkSaveSimu').prop('checked')) {
                    seivString = seivString + '\n' + 'Result:' + '\n' + simulSaveDat();
                }
                if (dialoogi == 'Inhomogeneous spectrum') {
                    failneim = graphSettn.inhomFileN;
                } else {
                    failneim = graphSettn.homFileN;
                }
                failneim = 'Sim-'+failneim;
                seiv_loucal(failneim, seivString, emisToLocFile);*/
                break;

            default:
                throw "No datacollection for " + dialTitle;
        }
    }
    var dbSave = $.post(saveUrl, {
        userNme: dirUser,
        Collection: datColl,
        rtftoken: tokene,
        data: JSON.stringify(dJson)
    })
        .done(function (datas) {
            //successfull saving responds "saving OK" otherwise an error message
            if (datas && datas.statCode == 200) {
                if (datas.resString.indexOf("saving OK") > -1 || datas.resString.indexOf('Updated') > -1) {
                    $('#btn-mngOpenSave').text("Save file");//return original caption
                    switch (dialTitle) {
                        case ((dialTitle.match(/material/gi)) ? dialTitle : undefined) :
                            $('#descMater').val($('#mongFileDesc').val());
                            EnDisButt('Enabled', '#btnUseMat');
                            break;
                        case ((dialTitle.match(/target/gi)) ? dialTitle : undefined) :
                            $('#descTarge').val($('#mongFileDesc').val());
                            EnDisButt('Enabled', '#btnUseTarg');
                            break;
                        case ((dialTitle.match(/stack/gi)) ? dialTitle : undefined) :
                            $('#descStack').val($('#mongFileDesc').val());
                            break;
                        case ((dialTitle.match(/Save Inhomogeneous/gi)) ? dialTitle : undefined) :
                            graphSettn.inhomFileN= dJson.Filename;
                            break;
                        case ((dialTitle.match(/Save Homogeneous/gi)) ? dialTitle : undefined) :
                            graphSettn.homFileN= dJson.Filename;
                            break;
                        default:
                            throw "No datacollection for " + dialTitle;
                    }
                    //matrlArr[0][3]=$('#mongFileDesc').val();
                    $.notifyBar({
                        cssClass: "success",
                        html: "Your data was saved to file: " + dJson.Filename
                    });
                }else {
                    $.notifyBar({
                        cssClass: "warning",
                        html: "File was not saved, database error: " + datas.error
                    });
                }
            }
        })
        .fail(function (datas) {
            handleFail(datas.responseText, 'Nothing was saved');
        });
    DFmngo.dialog("close");
}

/**
 * Function for preparing mongodb saving operations with the chosen data
 * @mngFileN string filename to be used in the data saving
 * @function saveToMngoDb()
 */
function saveToMngoDb(mngFileN) {
    var datColl = pickCollection();
    var saveUserFile = $.post('/auth/checkOneUserF', {
        userNme: dirUser,
        //chooses between materials or targets data files
        Collection: datColl,
        fileName: mngFileN
    })//file checking operation on server; should return either "yes" or "no"
        .done(function (data) {
            if (data && data.statCode == 200) {
                switch (data.resString) {
                    case "yes":
                        //file exists, needs to prompt for overwrite:
                        $('#btn-mngOpenSave').text("Confirm Overwrite");
                        //'overwrite File' pompted before data overwrite
                        break;
                    case "no":
                        //file does not exist: it can be saved immediately
                        mongoSave('/auth/dbInsert', mngFileN);
                        //another way to proceed, use: sendData(dJson) where
                        //instead of jquery's ajax.post, XMLHttpRequest method is used
                        break;
                    default:
                        $.notifyBar({
                            //position: "bottom",
                            cssClass: "error",
                            html: "File was not saved! bad response from server!"
                        });
                        break;
                }
            } else {//no relevant response from server to existence query:
                var errme = (data) ? data.error
                    : "Could not check if already file exists on server!";
                $.notifyBar({
                    cssClass: "error",
                    html: errme
                    //html: "Could not check if file already exists in database!"
                });
                DFmngo.dialog("close");
            }
        })
        .fail(function () {//Failed to get any response from server
            $.notifyBar({
                cssClass: "error",
                html: "(Connection or database error in server)"
            });
            DFmngo.dialog("close");
        });
}

/**
 * Function reads a selected document in server mongodatabase
 * @fileName string Document new name
 * @collec   string Document collection 'Materials', 'Targets', 'Stacks'
 * @function
 */
function mongoGetOne(fileName) {
    var datColl = pickCollection();
    var tokene;
    if (userName != 'No login') {
        tokene = window.sessionStorage.getItem('RTFtoken');
    }
    var getDoc = $.post('/auth/dbFindOne', {
        userNme: dirUser,
        fileName: fileName,
        rtftoken: tokene,
        Collection: datColl,//chooses between materials or targets data files
        replyType: 'wholeDoc'
    })
        .done(function (datas, textStatus) {
            if (textStatus == 'nocontent') {//responsed with status 204 'nocontent
                $.notifyBar({
                    cssClass: "warning",
                    html: "Data could not be obtained from server: "
                });
                return;
            }
            if (textStatus == 'success' && datas) {
                switch (datas.statCode) {
                    case 200:
                        if (datas.resString.indexOf("DocumentOK") > -1) {
                            //cut out 'documentOK' text from the response string beginning
                            //and convert back to object
                            var resObj = JSON.parse(datas.resString.slice(datas.resString.indexOf('{')));
                            if (datColl == 'simulparams') {
                                respToParams(fileName, resObj);
                            } else if (datColl == 'emissions'){
                                respToEmis(fileName, resObj);
                            } else {
                                //update filename and description inputs
                                //todo:update filename and description inputs
                                respToArr(fileName, resObj); //updates matrlArr, targArr or stack to opened document
                            }
                        }
                        break;
                    case 202:
                        //database responds with not found
                        $.notifyBar({
                            cssClass: "warning",
                            html: "Data could not be obtained: " + datas.error
                        });
                        break;
                }
            }
            //successful reading responds "reading OK" otherwise an error message
        })
        .fail(function (datas) {
            handleFail(datas.responseText, 'Data was not obtainable');
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
function mongoRename(oldFile, newFile, icon) {
    var datColl = pickCollection();
    var tokene;
    //userName=window.sessionStorage.getItem('RTFuser');
    if (userName != 'No login') {
        tokene = window.sessionStorage.getItem('RTFtoken');
    }
    var renameDoc = $.post('/auth/dbRename', {
        userNme: dirUser,
        //if public files have been selected: dirUser=='Publ'
        //otherwise dirUser==userName
        Collection: datColl, //chooses between 'materials-' or 'targets data' files
        oldName: oldFile,
        rtftoken: tokene,
        newName: newFile,
        fileType: icon
        //fileType is either 'jstree-file' or 'jstree-folder'
    })
        .done(function (datas) {
            //successful renaming responds "renaming OK" otherwise an error message
            if (datas) {
                if (datas.resString.indexOf("renaming OK") > -1) {
                    $('#btn-mngOpenSave').text("Save data");//return original caption
                    $.notifyBar({
                        cssClass: "success",
                        html: datas.resString // "Your file was renamed:"
                    });
                } else {
                    //database responds with error message
                    $.notifyBar({
                        cssClass: "warning",
                        html: "File was not renamed " + datas.resString
                    });
                }
            }
        })
        .fail(function (datas) {
            handleFail(datas.responseText, 'Renaming failed');
        });
    DFmngo.dialog("close"); // '/auth/dbRename'
}

/**
 * Function deletes selected document from server mongodatabase
 * @fileN string Filename to delete
 * @collN string Collection name of the to be deleted
 * @function
 **/
function mongoDelete(flNme) {
    var datColl = pickCollection();
    var tokene;
    if (userName != 'No login') {
        tokene = window.sessionStorage.getItem('RTFtoken');
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
            if (datas && datas.statCode == 200) {
                if (datas.resString.indexOf('deleting OK') > -1) {
                    $('#btn-mngOpenSave').text("Save data");//return original caption
                    $.notifyBar({
                        cssClass: "success",
                        html: "You deleted:" + datas.resString.slice(17)
                    });
                } else {
                    //database responds with error message
                    $.notifyBar({
                        cssClass: "warning",
                        html: "File was not deleted, database error: " + datas.error
                    });
                }
            }
        })
        .fail(function (datas) {

            handleFail(datas.responseText, 'Nothing was deleted');
        });
    DFmngo.dialog("close");
}

/**
 * Function picks the correct collection name from mongo database
 * @function pickCollection
 * @return string Collection name to be used in server database
 */
function pickCollection() {
    var dialTitle = DFmngo.dialog('option', 'title');
    var mngoColle;
    switch (dialTitle) {
        case ((dialTitle.match(/material/gi)) ? dialTitle : undefined) :
            mngoColle = "materials";
            break;
        case ((dialTitle.match(/target/gi)) ? dialTitle : undefined) :
            mngoColle = "targets";
            break;
        case ((dialTitle.match(/stack/gi)) ? dialTitle : undefined) :
            mngoColle = "stacks";
            break;
        case ((dialTitle.match(/Save Inhomogeneous/gi)) ? dialTitle : undefined) :
            mngoColle = "emissions";
            /*if ($('#chkSaveExper').prop('checked')){
                mngoColle = "emissions";
            }else if($('#chkSavePars').prop('checked')){
                mngoColle = "simulparams";
            }*/
            break;
        case ((dialTitle.match(/Save Homogeneous/gi)) ? dialTitle : undefined) :
            mngoColle = "emissions";
            break;
        case ((dialTitle.match(/Save simulation/gi)) ? dialTitle : undefined) :
            mngoColle = "simulparams";
            /*if ($('#chkSaveExper').prop('checked')){
                mngoColle = "emissions";
            }else if($('#chkSavePars').prop('checked')){
                mngoColle = "simulparams";
            }*/
            break;
        case ((dialTitle.match(/Open emission/gi)) ? dialTitle : undefined) :
            mngoColle = "emissions"; //luetaan spektri e.g. mittaustulos
            /*if ($('#radioMeas').prop('checked')) {
                mngoColle = "emissions"; //luetaan spektri e.g. mittaustulos
            } else if($('#radioSimu').prop('checked')){
                mngoColle = "simulparams"; //luetaan simuloinnin parametriasetuksia
            }*/
            break;
        case ((dialTitle.match(/Open simulated/gi)) ? dialTitle : undefined) :
            mngoColle = "simulparams"; //luetaan simuloinnin parametriasetuksia
            /*if ($('#radioMeas').prop('checked')) {
                mngoColle = "emissions"; //luetaan spektri e.g. mittaustulos
            } else if (){

            } else if($('#radioSimu').prop('checked')){
                mngoColle = "simulparams"; //luetaan simuloinnin parametriasetuksia
            }*/
            break;
        default:
            throw "No datacollection for " + dialTitle;
    }
    return mngoColle;
}

/**
 * Function updates directory tree on dialog form
 * @function treeUpdate
 * no return data, (updates tree direcly)
 */
function treeUpdate() {
    $('#directoName').prop('disabled', false); //these should be enabled
    $('#mongoFileName').prop('disabled', false);
    $('#mongFileDesc').prop('disabled', false);
    var collec = pickCollection();
    var tokene;
    if (userName != 'No login') {
        tokene = window.sessionStorage.getItem('RTFtoken');
    }
    //fetches all user's file titles with their paths from server:
    var checkUserFiles = $.post('/auth/checkAllUserF', {
        userNme: dirUser,
        rtftoken: tokene,
        //uses either materials, targets or stacks data collection:
        Collection: collec
        })
        .done(function (data, status, xhr) {//
            if (data) {
                if (data.token == 'invalid') {//invalid token, Otherwice data.token==undefined
                    userName = 'No login';
                    window.sessionStorage.setItem('RTFuser', userName);
                    window.sessionStorage.setItem('RTFtoken', null);
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
                if (data.statCode == 200) {
                        $('#mongoTree').jstree(true).settings.core.data = JSON.parse(data.resString);
                        $('#mongoTree').jstree(true).refresh();
                        var dialTitle = $("#mongoDialForm").dialog("option", "title");
                        if (dialTitle.indexOf('Open') > -1) {
                            //vain open file tapauksessa vilautetaan notifybar:
                            $('#btn-mngOpenSave').text('Open File');
                            $("#fsFileDesc").css('display','none');
                            $.notifyBar({
                                cssClass: "success",
                                html: "select from filetree"
                            });
                        }else {
                            //save operaatio
                            $("#fsFileDesc").css('display','inline');
                            var homInhom=$('#settnDial').dialog('option', 'title');
                            var teksti='';
                            if (homInhom=='Inhomogeneous spectrum'){
                                teksti=$('#inhDesc').text();
                            }else{
                                teksti=$('#homDesc').text();
                            }
                            $("#mongFileDesc").val(teksti);
                        }
                    } else {
                        $.notifyBar({
                            cssClass: "error",
                            html: data.error
                        });
                    }
                } else {
                    $.notifyBar({
                        //position: "bottom",
                        cssClass: "error",
                        html: "Error in username and/or password, try again or hit Cancel"
                    });
                }
            })
            .fail(function () {
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

$('#btnPublDir').click(function () {
    dirUser = 'Publ';
    $('#frm-DirSel').hide();
    treeUpdate();
    $('#FilTreLege').text('Server files in public directory');
    $('#frm-FileTree').show();
    $('#btn-mngOpenSave').show();
    $("#fsFileDesc").hide();
});

$('#btnLocDir').click(function () {
    //MongoDialForm button for file saving and opening on local download directory:
    var dialTitle = $("#mongoDialForm").dialog("option", "title"); //gets the options for open or save
    var failneim = '';
    var seivstring='';
    switch (dialTitle) {
        case 'Open material file from':
            //Lambda -n&k data for Thin film R&T calculations
            $('#descMater').val('');
            $("#ediMaterLbl").text("Local file: ");
            $("#mongoDialForm").dialog("close");
            $("#matLocFiles").focus().click();
            break;
        case 'Open target file from':
            //Lambda -R  or T data for Thin film R&T calculations
            $('#descTarge').val('');
            $("#ediTargeLbl").text("Local file: ");
            $("#mongoDialForm").dialog("close");
            $("#targLocFiles").focus().click();
            break;
        case 'Open stack file from':
            //Thin film stack construction including material and target data
            $('#descStack').val('');
            $("#ediStackLbl").text("Local file: ");
            $("#mongoDialForm").dialog("close");
            $("#stackLocFiles").focus().click();
            break;
        case 'Open emission spectrum':
            //eV- spectral intensity data for EL and PL modelling target
            $("#mongoDialForm").dialog("close");
            $("#emisLocFiles").focus().click();
            break;
        case 'Open simulated spectrum':
            //simulations data
            $("#mongoDialForm").dialog("close");
            $("#simLocFiles").focus().click();
            break;
        case 'Save Inhomogeneous spectrum':
            //eV- experimental intensity data for EL and PL modelling
            var failneim=graphSettn.inhomFileN;;
            var dialoogi = $('#settnDial').dialog('option', 'title');
            seivString=experEmisDat();
            seiv_loucal(failneim, seivString, emisToLocFile);
            break;
        case 'Save Homogeneous spectrum':
            //eV- experimental intensity data for EL and PL modelling
            var failneim=graphSettn.homFileN;;
            var dialoogi = $('#settnDial').dialog('option', 'title');
            seivString=experEmisDat();
            seiv_loucal(failneim, seivString, emisToLocFile);
            break;
        case 'Save simulation spectrum':
            var saveHeader = 'Header:' + makeSimHeader(); //string from jv-fileopsit.js
            seivString = saveHeader;
            if ($('#chkSavePars').prop('checked')) {//simulointiparametrit mukaan:
                seivString +='\n'+'Parameters:'+ JSON.stringify(simParHeader());
            }
            if ($('#chkSaveSimu').prop('checked')) {
                seivString = seivString + '\n' + 'Result:' + '\n' + simulSaveDat();
            }
            if (dialoogi == 'Inhomogeneous spectrum') {
                failneim = graphSettn.inhomFileN;
            } else {
                failneim = graphSettn.homFileN;
            }
            failneim = 'Sim-'+failneim;
            seiv_loucal(failneim, seivString, emisToLocFile);
            break;
        case 'Save material data to':
            var failneim = $('#ediMater').val();
            failneim = failneim.slice(failneim.lastIndexOf('/') + 1);
            //array first line, quotes around last element help opening in Notepad:
            seivString = matrlArr[0][0] + '\t' + matrlArr[0][1] + '\t' + matrlArr[0][2];
            if (matrlArr[0][3]) seivString += '\t' + '\"' + matrlArr[0][3] + '\"';
            var nRow = '';
            for (var j = 1; j < matrlArr.length; j++) {
                nRow = matrlArr[j][0] + '\t' + matrlArr[j][1] + '\t' + matrlArr[j][2];
                seivString = seivString + '\r' + nRow;
            }
            seiv_loucal(failneim, seivString, matrlToLocFile);
            break;
        case 'Save target data to':
            var failneim = $('#ediTarge').val();
            failneim = failneim.slice(failneim.lastIndexOf('/') + 1);
            //targArr[0][0] : wavelength unit, [0][1] : 'R' or 'T', [0][2]: '%' or 'abs', [0][3]: description
            var seivString = targArr[0][0] + '\t' + targArr[0][1];
            if (targArr[0][2]) {
                var desc = targArr[0][2].replace(/(^[\"\']+)|([\"\']+$)/g, ""); //remove single and double quotes
                desc = '\"' + desc + '\"'; //add double quotes for notepad opening
                seivString = seivString + '\t' + desc;
            }
            for (var j = 1; j < targArr.length; j++) {
                nRow = targArr[j][0] + '\t' + targArr[j][1];
                seivString = seivString + '\r' + nRow;
            }
            seiv_loucal(failneim, seivString, targetToLocFile);
            break;
        case 'Save stack data to':
            var failneim = $('#ediStack').val();
            failneim = failneim.slice(failneim.lastIndexOf('/') + 1);
            seivString = JSON.stringify(stack);
            seiv_loucal(failneim, seivString, stackToLocFile);
            break;
    }
    $("#mongoDialForm").dialog("close");
});

$('#btnUserDir').click(function () {
    //var activeTab = $("#tabis").tabs("option", "active");
    //var selecTabId = $("#tabis ul>li a").eq(activeTab).attr('id');
    $('#frm-DirSel').hide();
    if (userName != 'No login') { //user has logged in (but login maybe expired; token will be checked)
        dirUser = userName;
        $('#frm-Login').hide();
        $('#frm-DirSel').hide();
        treeUpdate();
        $('#frm-FileTree').show();
        $('#FilTreLege').text('Files on server in ' + userName + '\'s directory');
        $('#btn-mngOpenSave').show();
        //setEdiLbl(userName+"\s file: ");
    } else {//no login, but user requests for private files
        dirUser = 'Publ';
        $('#frm-Login').show();
        $('#frm-FileTree').hide();
        $('#btn-mngOpenSave').hide();
        //setEdiLbl("Public file:");
    }
});

//aTree.on("change.jstree rename_node.jstree delete_node.jstree " +
$('#mongoTree').on("close_node.jstree change.jstree rename_node.jstree delete_node.jstree " +
    "deselect_all.jstree select_node.jstree", function (e, data) {
    //responds: action,node,selected,event,instance copy_node.jstree move_node.jstree
    var selctdNde;
    switch (e.type) {
        case 'close_node':
            $('#fsFileDesc').css('display', 'none');
            $(".ui-widget-content").animate({scrollTop:$('#mongoDialForm').get(0).scrollHeight},1000);
            break;
        case 'deselect_all':
            //deselect all is triggered before new selected cell is activated
            //original node 'text' has to be returned if a rename operation is
            //interrupted  before clicking on 'Confirm rename file'
            var fleRena = data.node[0]; //gets previously selected node
            if (fleRena) {
                var noodi = data.instance._model.data[fleRena];
                if (!noodi) {
                    break;
                }
                var textOrig = noodi.original.text;
                var texti = noodi.text;
                if (texti != textOrig) {
                    $('#mongoTree').jstree('set_text', noodi, textOrig);
                }
            } else {
                //$('#mongFileDesc').val(matrlArr[0][3]);
                //$('#mongFileDesc').val('');
            }
            break;
        case 'select_node':
            //$('#fsFileDesc').css('display','none');
            selctdNde = data.instance.get_selected(true)[0];
            //enable input boxes:
            $('#mongoFileName').prop("disabled", false);
            $('#directoName').prop("disabled", false);
            //get the open or save option:
            var dialTitle = $("#mongoDialForm").dialog("option", "title");
            if (dialTitle.indexOf('Open') > -1) {
                $('#btn-mngOpenSave').text('Open File');
                $('#fsFileDesc').css('display', 'inline');
            } else {
                $('#btn-mngOpenSave').text('Save data');
                $('#fsFileDesc').css('display', 'inline');
            }
            var repl = mongoColle();
            $('#directoName').val(repl.Folder);
            //scroll to bottom of dialog:
            $(".ui-widget-content").animate({scrollTop:$('#mongoDialForm').get(0).scrollHeight},1000);
            if (selctdNde.icon == 'jstree-file') {
                $('#mongoFileName').val(repl.longFile);
                //var usrN=(dirUser=='Publ')? 'Publ':userName;
                if (dialTitle.indexOf('Open') > -1) {
                    //description field updated in browsing only for file open
                    mongoReadDesc(repl.longFile, function (res) {
                        $('#mongFileDesc').val(res);
                    });
                }
            } else {//click was on folder item on the js-tree
                if (dialTitle.indexOf('Open') > -1){
                    //console.log('avataan tiedosto');
                    $('#mongoFileName').val('');
                    $('#fsFileDesc').css('display', 'none');
                    $('#frm-FileTree').hide();
                    $('#frm-FileTree').show();
                }else{
                    //console.log('tallennetaan tiedosto');
                    $('#mongoFileName').val('');
                    $('#fsFileDesc').css('display', 'inline');
                }
            }
            break;
        case 'rename_node':
            selctdNde=data.instance.get_selected(true)[0];
            var nodeOb = mongoColle();
            if (selctdNde.icon == 'jstree-file') {
                var texti = nodeOb.Folder;
                texti = texti.replace(/(^\/)|(\/$)/g, ""); //remove leading and trailing '/'
                texti = texti + '/' + selctdNde.text;
                $('#mongoFileName').val(texti); //input now contains new filename with path
                $('#btn-mngOpenSave').text('Confirm file rename');
            } else {
                var slashPos = nodeOb.Folder.lastIndexOf('/');
                var temTex = nodeOb.Folder.slice(0, slashPos + 1);
                temTex = temTex + selctdNde.text;
                $('#btn-mngOpenSave').text('Confirm folder rename');
                $('#directoName').val(temTex);
                $('#mongoFileName').val(''); //input now empty
            }
            break;
        case 'delete_node':
            $('#mongoFileName').prop("disabled", true);
            $('#directoName').prop("disabled", true);
            var teksti = ($('#mongoFileName').val().length < 1) ? 'Confirm folder delete' : 'Confirm file delete';
            $('#btn-mngOpenSave').text(teksti);
            break;
        default:
            break;
    }
}); //a tree on.change ready

/**
 * Function gets the filename and parentfolder for a jstree-node
 * @nodeJ string jstree node id
 * @return object {Folder: foldername, shortFile:'filename', longFile:'filename with path'}
 */
function mongoColle() {
    var mongoPuu = $('#mongoTree').jstree(true); //get this jstree-instance
    var mongoPuuData = mongoPuu.settings.core.data; //get the tree data
    var selctdNde = mongoPuu.get_selected(true)[0];//get the selected node
    var obje = {longFile: '', shortFile: '', Folder: ''};
    //longfile: filename with directory, shortFile: only filename, Folder: only directory
    if (!mongoPuuData || selctdNde.id.length < 1) {//return early if no data
        return obje;
    }
    var pathi = '';
    var nde = $.grep(mongoPuuData, function (e) {
        return e.id == selctdNde.id;
    })[0];
    var fileTyp = nde.icon; //either 'jstree-folder' or 'jstree-file'
    var condition = true;
    var nodeId = selctdNde.id;
    var temp = "";
    while (condition) {//grep (=filter array) to find node for nodeId:
        var noode = $.grep(mongoPuuData, function (e) {
            return e.id == nodeId;
        })[0];
        //Examine if root parent has not been reached:
        condition = (noode.parent != "#" && selctdNde.id != 'ajason1'); //false if root parent
        temp = noode.text;
        temp = temp.replace(/(^\/)|(\/$)/g, "");
        pathi = temp + "/" + pathi;
        nodeId = noode.parent;
    }
    pathi = pathi.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
    var slashN = pathi.lastIndexOf('/');
    obje.longFile = temp;
    if (fileTyp == 'jstree-file') {
        temp = pathi.slice(0, slashN + 1);
        obje.Folder = temp.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
        obje.shortFile = pathi.slice(slashN + 1);
        obje.longFile = obje.Folder + '/' + obje.shortFile;
    } else {
        obje.Folder = pathi;
        obje.longFile = '';
        obje.shortFile = '';
    }
    return obje;
}

function operDispatcher(operatSel) {
    var fileN = $('#mongoFileName').val();
    var dirN = $('#directoName').val();
    var mngFileN = fleNamer(fileN, dirN);
    if (!mngFileN) {
        return;
    }
    switch (operatSel) {
        case 'Save data':
            saveToMngoDb(mngFileN);
            //$('#mongFileDesc').val('');
            break;
        case 'Confirm Overwrite':
            //updates an existing document:
            mongoSave('/auth/dbUpdate', mngFileN);
            break;
        case 'Save Changes':
            //adding new folder or renaming already existing file
            //saves an empty folder:
            saveToMngoDb(mngFileN);
        case 'Confirm file delete':
            mongoDelete(mngFileN);
            break;
        case 'Confirm folder delete':
            mongoDelete(mngFileN);
            break;
        case 'Confirm file rename' :
            var mongoPuu = $('#mongoTree').jstree(true); //get this jstree-instance
            var mongoPuuData = mongoPuu.settings.core.data; //get the tree data
            var selctdNde = mongoPuu.get_selected(true)[0];//get the selected node
            //var selctdNoode = mongoPuu.get_selected(true)[0];
            var oldFile = mongoColle().Folder;
            oldFile = oldFile.replace(/(^\/)|(\/$)/g, ""); //remove leading and trailing '/'
            oldFile = oldFile + '/' + selctdNde.original.text;
            var newFile = mngFileN;
            var ikoni = selctdNde.original.icon;
            mongoRename(oldFile, newFile, ikoni);
            //$('#mongoFileName').disabled=true;
            //$('#directoName').disabled=false;
            break;
        case 'Confirm folder rename':
            var newFile = $('#directoName').val();
            newFile = newFile.replace(/(^\/)|(\/$)/g, ""); //remove leading and trailing '/'
            var slashPos = newFile.lastIndexOf('/');
            var oldFile = newFile.slice(0, slashPos + 1);
            oldFile = oldFile + selctdNde.original.text;
            var ikoni = selctdNde.icon;
            mongoRename(oldFile, newFile, ikoni);
            //$('#mongoFileName').disabled=false;
            //$('#directoName').disabled=true;
            break;
        case 'Confirm moving':
            var oldfile = $.jstree.reference('#mongoTree').node;
            //var selctdNde=$.jstree.reference('#mongoTree').get_selected(true)[0];
            var newFile = selctdNde.text;
            var oldName = selctdNde.original.text;
            var ikoni = selctdNde.original.icon;
            //mongoMove(mngFileN,newFile,ikoni);
            break;
        case 'Confirm copying':
            var v = $('#mongoTree').jstree(true).get_json('#', {'flat': true});
            var oldfile = '';
            break;
        default:
            throw "Unknown command:" + operatSel;
            break;
    }
}

$('#btnLogInni').click(function () {//btnLogInni
    //var activeTab = $("#tabis").tabs("option", "active");
    //var selecTabId = $("#tabis ul>li a").eq(activeTab).attr('id');
    var mngUsr = $('#mngUsrnm').val();
    var mngPwd = $('#mngPWD').val();
    var usrMesg = {username: mngUsr, password: mngPwd};
    var checkUser = $.post('/login', usrMesg)
        .done(function (data) {
            if (data.responseStr == 'Login successfull') {
                userName = usrMesg.username;
                var accessToken = data.token;
                window.sessionStorage.setItem('RTFuser', data.user.username);
                window.sessionStorage.setItem('RTFtoken', accessToken);
                $.notifyBar({
                    //position: "bottom",cssClass: "success",
                    html: "You are now logged in as: " + userName
                });
                $('#frm-Login').hide();
                dirUser = userName;
                treeUpdate();
                $('#frm-FileTree').show();
                $('#btnLogMeOff').show();
                $('#btn-mngOpenSave').show();
                $('#mngUsrnm').val('');//reset user and pswrd fields
                $('#mngPWD').val('');
                $('#FilTreLege').text('Files on server in ' + userName + '\'s directory');
                //setEdiLbl(userName+"\'s file:");
            } else {
                userName = 'No login';
                dirUser = 'Publ';
                //setEdiLbl("Public file:");
                $.notifyBar({
                    //position: "bottom",
                    cssClass: "error",
                    html: "Error in username and/or password, retry or hit Cancel"
                });
            }
        })
        .fail(function () {
            userName = 'No login';
            dirUser = 'Publ';
            $.notifyBar({
                //position: "bottom",
                cssClass: "warning",
                html: "Unable to authenticate user (Connection or database error)"
            });
        });
    dirUser = (userName == 'No login') ? 'Publ' : userName;
});



var aTree = $('#mongoTree').jstree({
    //.aTree=$('#mongoTree').jstree({
    "core": {
        "check_callback": true
    },
    "plugins": ["contextmenu", "wholerow", "unique"],
    "contextmenu": {
        "items": function (node) {
            var menIts = $.jstree.defaults.contextmenu.items();
            //var action= $.jstree.defaults.contextmenu.items.rename();
            menIts.create._disabled = true; // (node.icon=="jstree-file")? true: false;
            delete menIts.create;
            delete menIts.ccp;
            return menIts;
        },
        "select_node": true
    }
});

$('#directoName, #mongoFileName').focus(function () {
    //user starts to edit filename, then revert button title to
    //force existence check before file saving,
    $('#btn-mngOpenSave').text("Save data");
});
