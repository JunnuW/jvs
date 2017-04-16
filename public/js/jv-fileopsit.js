/**
 * File created by jv on 17.2.2015.
 * voihan vee.....
 *
 */

"use strict";
/* Function senData
* posts using XMLHttpRequest, (i.e. without jquery interactions)
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

var selctdNde;

/**
 * Function fills matrlArr, targArr or stack with data obtained from mongodb
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
    setEdiLbl(laabel);//sets label  on 'Materials', 'Targets' or 'Stack' tab
    var dataArrs;
    switch (selecTabId) {
        case "Materials":
            dataArrs=resObj.datArrs; //is still an object
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
            if (matrlArr[0][3]) $('#descMater').val(matrlArr[0][3]);
            oMatTable.clear();
            oMatTable.rows.add(matrlArr.slice(1));
            oMatTable.draw();
            $('#matEditTabl').find('th:eq(0)').text("Unit [" + matrlArr[0][0] + "]");
            plotNK(matrlArr, 8); //tämäkö?
            EnDisButt('Enabled', '#btnUseMat');
            $.notifyBar({
             cssClass: "success",
             html: 'Material data was read' // "File was read:"
             });
            break;
        case "Targets":
            dataArrs=resObj.datArrs; //is still an object
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
            otargTable.clear();
            otargTable.rows.add(targArr.slice(1));
            otargTable.draw();
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
        default:
            alert('no tab-strip');
    }
}

/**
 * Function sets simulation settings
 * from data obtained from mongodb. Then updates simulations page graphs
 * @resObj  object returned from mongodb
 * @function
 */
function respToParams(fileName,resObj) {
    var simPars = JSON.stringify(resObj.params);
    var headeri=resObj.header;
    var descr = resObj.description;
    descr = descr.replace(/"/g, "");
    var dialoogi = $('#settnDial').dialog('option', 'title');
    if (dialoogi == 'Inhomogeneous spectrum') {
        $('#inhDesc').html(descr);
        graphSettn.inhomFileN = fileName;
    } else {
        $('#homDesc').html(descr);
        graphSettn.homFileN = fileName;
    }
    setSettings(simPars);
    setSelections(headeri);
    setChkboxes();
    setLegend();       //set graph legend
    makespArr();       //recreate spectral array
    makeExpArrs();     //process experimental arrays
    makeJdos();        //create density of states
    makeBoltz();       //recreate Boltzmann distribution
    makeSommer();
    calcInhom();
    calcHom();
    inhombr();
}

/**
 * Function builds experimental emission array or emission simulation settings
 * from data obtained from mongodb. Then updates the graphs on simulations page
 * @resObj  object returned from mongodb
 * @function
 */
function respToEmis(fileName,resObj) {
    var dialoogi = $('#settnDial').dialog('option', 'title');
    var descr = resObj.description;
    descr = descr.replace(/"/g, "");
    if (dialoogi == 'Inhomogeneous spectrum') {
        graphSettn.inhomFileN = fileName;
        inhomSpectr.experPlot = makeEmisArr(resObj);
        inhomSpectr.experArr = makeEmisArr(resObj);
        //add experimental file description:
        $('#inhDescLbl').css('display', 'inline');
        $('#inhDesc').css('display', 'inline');
        $('#inhDesc').html(descr);
        inhombr();
    } else if (dialoogi == 'Homogeneous spectrum') {
        graphSettn.homFileN = fileName;
        homSpectr.experArr = makeEmisArr(resObj);
        homSpectr.experPlot = makeEmisArr(resObj);
        //add experimental file description:
        $('#homDescLbl').css('display', 'inline');
        $('#homDesc').css('display', 'inline');
        $('#homDesc').html(descr);
        hombr();
    }
}

function makeEmisArr(resObj) {
    //var emisArrs = resObj.datArrs; //is an object (javascript copies by reference)
    var emArr = [];
    var oneRow = [resObj.unit, 'Intensity', resObj.description];
    //becomes: eV, Intensity, File description text
    emArr.push(oneRow);
    var absc = resObj.datArrs[0].eVs;
    //var intens = emisArrs[1].Inte;
    var intens = resObj.datArrs[1].Inte;
    var numPoints = absc.length;
    for (var i = 0; i < numPoints; i++) {
        oneRow = [];
        oneRow.push(absc[i]);
        oneRow.push(intens[i]);
        emArr.push(oneRow);
    }
    return emArr;
}

function handleFail(errDatas,messag){
    var failu=JSON.parse(errDatas);
    console.log('failu.statCode: '+failu.statCode);
    console.log('failu.resString: '+failu.resString);
    var respMessa;
    //var fileN=$('#mongoFileName').val();
    switch (failu.statCode) {
        case 500:
        case 400:
        case 403:
            respMessa=messag+': '+failu.resString;
            break;
        case 404:
            respMessa=messag+' '+" , error in Url?: "+saveUrl;
            break;
        case 413:
            respMessa=messag+' '+" ,too much data?";
            break;
        case 204:
            respMessa=messag+' '+' File was not found'
    }
    $.notifyBar({
        cssClass: "error",
        html: respMessa
    });
}

/**
 * Function toJsonArr builds JSON array from the material nk-data table
 * @function
 * @param arrDat (array) contains the nk values in a table
 * @param desc (text) descriptor for the data
 * @param coLLe (text) mongo database collection name for the saving
 */
function toJsonArr(coLLe, filename, arrDat, desc) {
    //console.log('prepare Json for collection: ',coLLe);
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
            throw new Error("Unknown spectral unit "+unit);
            //return;
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
        }else {//targets data to targets collection,
               // emission spectra to collection
            var Sv=[]; //spectral value, either Reflectance, Transmittance
                       // or emission Intensity
            for (var i = 1; i < arrLen; i++) {
                sPoints.push(arrDat[i][0]); // wavelength point
                Sv.push(arrDat[i][1]);
            }
            resu.type=arrDat[0][1]; // spectrum either R, T or Intensity
            resu.Sv = Sv;           //spectral value
        }
        resu.absc = sPoints; //wavelength array
        //console.log("res= "+JSON.stringify(resu,null,2));
    }
    console.log('resu: ',resu);
    return resu;
}
/*****************************************************************************************************
 * reads tab delimited text local files for materials, targets, stacks, emission and emission parameters
 * after successful async mode read
 * cBackFun processes the received file contents
 *
*/
function ReadLocFle(file, cBackFun) {
    var locReader = new FileReader();
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
            //console.log('onloadend.event.target.result: ',fileCont);
            cBackFun(fileCont);
        };
        locReader.onerror = locFleErrorHandler;
        locReader.readAsText(file, "UTF-8");
    }
}

/**
 * Function for callback operation after reading local text files for
 * Materials, Targets, and Stacks
 * @function
 * @fileCont has the
 */
function gotTextFile(fileCont) {
    //callback after successfully reading local files
    //could be made into three separate callbacks one for: Materials, Targets and Stack
    //test timo:
    //setTimeout(function(){alert("tab oli: "+cBackTab+"  File: "+fileCont.length)},30000);
    var activeTab = $("#tabis").tabs("option", "active");
    var selecTabId = $("#tabis ul>li a").eq(activeTab).attr('id');
    switch (selecTabId){
        case 'Materials':
            matrlArr = splitToArr(fileCont);
            //oMatTable.fnClearTable();
            oMatTable.clear();
            //oMatTable.fnAddData(matrlArr.slice(1));
            oMatTable.rows.add(matrlArr.slice(1));
            oMatTable.draw();
            $('#matEditTabl').find('th:eq(0)').text("Unit [" + matrlArr[0][0] + "]");
            $('#descMater').val(matrlArr[0][3]);
            plotNK(matrlArr, 8);
            EnDisButt('Enabled', '#btnUseMat');
            break;
        case 'Targets':
            targArr = splitToArr(fileCont);
            $('#descTarge').val(targArr[0][2]);
            //otargTable.fnClearTable();
            otargTable.clear();
            //otargTable.fnAddData(targArr.slice(1));
            otargTable.rows.add(targArr.slice(1));
            otargTable.draw();
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
            afterStackRead(stakki);
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
    //console.log('slitToArr: ',tsvFile);
    var tmps1;// = [];
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
        tmps1[i]= tmps1[i].replace(/^\t|\t$/g, "");
        //console.log('tmps1[i]: ',tmps1[i]);
        tmps2 = tmps1[i].split('\t');
        //splitti tab merkissä: [lambda],[n],[k] tai [lambda],[R tai T] tai [eV],[Intensity]
        tmps3 = [];
        for (var j = 0; j < tmps2.length; j++) {
            tmps3.push(parseFloat(tmps2[j]));
        }
        if (parseFloat(tmps3[0]) > 0 && parseFloat(tmps3[1]) > 0) {
            if (!tmps3[2] && tmps5[2]=='k') {
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
    //console.log('splitToArr tmps5: ',tmps5);
    return tmps5;
    //Code for text file splitting ends here:
  }

/**
 * Function creates mongodialogform for opening files on server using js-tree plugin
 * @function
 */
//var buildMongoDial=function(){
    // or, could be as well: function buildMongoDial(){
    //alert('mongo folder: '+window.location.origin);
    //var dialTitle;
//}; //buildMongodial done

/**
 * Function checks filename on inputfield text
 * @return string mngFileN
 */
function fleNamer(fileN,dirN) {
    var fNamed;
    //var fileN = $('#mongoFileName').val();
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
    //var dirN=$('#directoName').val();
    dirN = dirN.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
    if (!myRegxp1.test(dirN)) {//only alphanumerics with "-", "_" and "/" are allowed
        alert("Invalid directory name: " + dirN);
        return fNamed;//undefined
    }
    var overLap=fileN.indexOf(dirN); //is directory already included in the beginning of filename?
    fNamed = (overLap==0)? fileN : dirN+'/'+fileN;
    //console.log('flenamer: ',fNamed);
    return fNamed;
}

/*simParHeader()
* Stores the used PL-spectrum simulation parameters
* with their values into an object
* @return {Object} parHeader
*/
function simParHeader(){
    var parHeader={};
    parHeader={//nämä tulee aina mukaan
      Estart:simSettn.eVstart,
      Estop:simSettn.eVstop,
      Etr:simSettn.eTr};

      if (inhomSpectr.inPlot.jdos){//density of states included
        parHeader.jdos=simSettn.jdostype;
      }

      if (inhomSpectr.inPlot.Se) {//exitons included
        var extn = {};
        extn.Eb_meV = simSettn.exEb;
        if (simSettn.jdostype == 'bulk') {
          extn.type = 'Bulk-3D';
        } else {//qw exitons
          extn.type = 'QW-2D';
          extn.viewDir = simSettn.viewDir;
          extn.polarizat = simSettn.polarizat;
          if (simSettn.polarizat == 'TM') {
            extn.shapePar = simSettn.ex0;
          }
        }
        parHeader.exiton = extn; //adds exiton parameters as an object
      }

      if (inhomSpectr.inPlot.fcv){//energy state occupancy
        parHeader.Boltzmann={'Epeak_eV':parHeader.Etr ,'Temp_K':simSettn.kelvin};
      }

      if (inhomSpectr.inPlot.Lurb) {//single sided Urbach broadening included
        if (inhomSpectr.inPlot.convo){
          parHeader.InhmgBrdng={'type':'AsymUrbach','Eu_meV':simSettn.eU};
        } else {
          parHeader.FuncPlot={'type':'AsymUrbach','Eu_meV':simSettn.eU};
        }
      }

      if (inhomSpectr.inPlot.Lsurb) {//symmetric Urbach broadening included
        if (inhomSpectr.inPlot.convo){
          parHeader.InhmgBrdng={'type':'SymmUrbach','Eu_meV':simSettn.eU};
        } else {
          parHeader.FuncPlot={'type':'SymmUrbach','Eu_meV':simSettn.eU};
        }
      }

      if (inhomSpectr.inPlot.Lgaus) {//Gaussian broadening included
        if (inhomSpectr.inPlot.convo){
          parHeader.InhmgBrdng={'type':'Gaussian','sigma_meV':simSettn.GauSig};
        } else {
          parHeader.FuncPlot={'type':'Gaussian','sigma_meV':simSettn.GauSig};
        }
      }

      if (inhomSpectr.inPlot.Lsech) {//Sech t relaxation caused broadening
        if (inhomSpectr.inPlot.convo){
          parHeader.InhmgBrdng={'type':'Sech^n(t/tau)','tau_fs':simSettn.SechTau,'n':simSettn.SechN};
        } else {
          parHeader.FuncPlot={'type':'Sech^n(t/tau)','tau_fs':simSettn.SechTau,'n':simSettn.SechN};
        }
      }

      if ($('#lblsaveSimSpe').text()=='Homogeneous simulation' && homSpectr.inPlot.convo) {
        //myös homogeeninen leviäminen, lisätään mukaan alemman kuvaajan parametrit
        if ($('#pltLorentz').prop('checked')) {// Lorentzian broadening
          parHeader.HomogBrdng={'type':'Lorentz','tau_fs':simSettn.LorTau};
        }
        if ($('#pltDlorentz').prop('checked')) {// Dual Lorentzian broadening
          parHeader.HomogBrdng={'type':'Lorentz X Lorentz',
              'tau1_fs':simSettn.DlTau1,'tau2_fs':simSettn.DlTau2};
        }
      }

      if ($('#lblsaveSimSpe').text()=='Homogeneous simulation' && !homSpectr.inPlot.convo){
        // ei konvoluutiota vain leviämiskäyrän muoto
        if ($('#pltLorentz').prop('checked')) {
          parHeader.FuncPlot={'type':'Lorentz','tau_fs':simSettn.LorTau};
        }
        if ($('#pltDlorentz').prop('checked')) {
          parHeader.FuncPlot={'type':'Lorentz1 X Lorentz2',
              'tau1_fs':simSettn.DlTau1,'tau2_fs':simSettn.DlTau2};
        }
    }
    //console.log('parHeader: ',parHeader);
    return parHeader;
}

/*Simuation header (=string) to explain what is included
 * in the calculated spectrum
 * */
function makeSimHeader() {
    var headerString = '';
    if (inhomSpectr.inPlot.eV) headerString = headerString + '(E)';
    if (inhomSpectr.inPlot.jdos) {
        headerString = (simSettn.jdostype == 'qw') ? headerString + '(qw-jdos)' : headerString + '(bulk-jdos)'
    }
    if (inhomSpectr.inPlot.fcv) {
        headerString = headerString + '(exp[(E-Etr)/kT])'
    }
    if (inhomSpectr.inPlot.Se) {
        headerString = (simSettn.jdostype == 'qw') ? headerString + '(qw-ex.Enh)' : headerString + '(bulk-ex.Enh)';
    }
    if (inhomSpectr.inPlot.convo) {
        //headerString = headerString + '<convolve-using>';
        if (inhomSpectr.inPlot.Lurb) {
            headerString = headerString + '*(Asym.Urbach-brdng)';
        } else if (inhomSpectr.inPlot.Lsurb) {
            headerString = headerString + '*(Symm.Urbach-brdng)';
        } else if (inhomSpectr.inPlot.Lgaus) {
            headerString = headerString + '*(Gaussian-brdng)';
        } else if (inhomSpectr.inPlot.Lsech) {
            headerString = headerString + '*(Sech^n(t/tau/n)-brdng)';
        }
    }
    if (headerString.length < 3) {
        if (inhomSpectr.inPlot.Lurb) headerString = 'Asymmetric Urbach function';
        if (inhomSpectr.inPlot.Lsurb) headerString = 'Symmetric Urbach function';
        if (inhomSpectr.inPlot.Lgaus) headerString = 'Gaussian function';
        if (inhomSpectr.inPlot.Lsech) headerString = 'FFT{sech^n(t/tau/n)}';
    }
    headerString = headerString.replace(/\)\(/g, ")x("); //laittaa kertomerkit paikoilleen
    var saveLbl=$('#lblsaveSimSpe').text();
    if (saveLbl=='Homogeneous simulation') {//tallennetaan alemman kuvan spektriä
        if (homSpectr.inPlot.convo) {//convoluutio ylemmästä kuvasta
            if ($('#pltLorentz').prop('checked')) headerString = headerString + '*(Lorentzian brdng)';
            if ($('#pltDlorentz').prop('checked')) headerString = headerString + '*(Lorentzian1 x Lorentzian2 brdng)';
        }else{
            headerString='';// ei tarvita ylemmän kuvaajan tietoja
            if ($('#pltLorentz').prop('checked')) headerString = 'Lorentzian function';
            if ($('#pltDlorentz').prop('checked')) headerString = '(Lorentzian1 X Lorentzian2) function';
        }
    }
    return headerString;
}


/* For local saving, simulSaveDat() compiles a multiline string representing the
*  simulation result.
*  After header line each line represents one data point
*  number of datapoints depends on the selected numSel option [1000,500,333,250,200]
*  on mongoDialForm
*/
function simulSaveDat(){
    var m = $("#numSel option:selected").text(); // number of spectral points
    m = (m > 0) ? Math.floor(inhomSpectr.numPoints / m) : 1;
    var saveLbl=$('#lblsaveSimSpe').text();
    var helaHoito='';
    var n=inhomSpectr.numPoints-1;
    if (saveLbl=='Inhomogeneous simulation'){
        helaHoito+='E [eV]'+'\t'+'Inhomog'+'\n';
    } else if (saveLbl=='Homogeneous simulation'){
        helaHoito+= 'E [eV]'+'\t'+'Homog'+'\n'
    }else {
        console.log('unexpected checkbox label, saving selector');
        return;
    }
    var temppi=0;
    for (var i = 0; i < n; i += m) {
        if (i % m == 0) {
            temppi = (saveLbl == 'Inhomogeneous simulation') ? inhomSpectr.plotArr[i] : homSpectr.plotArr[i];
            helaHoito+=inhomSpectr.eVarr[i]+'\t'+temppi+'\n';
        }
    }
    if (n%m!=0) { //pisteitä 333 ei mene tasan
        temppi = (saveLbl == 'Inhomogeneous simulation') ? inhomSpectr.plotArr[n] : homSpectr.plotArr[n];
        helaHoito+=inhomSpectr.eVarr[n]+'\t'+temppi+'\n';
    }
    return helaHoito;
}

/*makeOptsArr(aRRa)
* produces materials menu and spectral targets menu lists on
* corresponding tabs in the transmittance/reflectance calculator
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

/*Compile experimental emission data for local saving
* tab separated eV and intensity values
* one value pair on each row
* @return {String}
* */
function experEmisDat(){
    var seivString = '';
    var n = 0;
    var i = 0;
    var dialoogi= $('#settnDial').dialog('option','title');
    if (dialoogi == 'Inhomogeneous spectrum') {
        var legenda = '';
        legenda = inhomSpectr.experArr[0][2].replace(/"/g, ""); //poistetaan kaikki lainausmerkit
        seivString = 'eV' + '\t' + 'Intensity' + '\t' + legenda;
        n = inhomSpectr.experArr.length;
        for (i = 1; i < n; i++) {
            seivString = seivString + '\r' + inhomSpectr.experArr[i][0] + '\t' + inhomSpectr.experArr[i][1];
        }
    } else if (dialoogi == 'Homogeneous spectrum') {
        legenda = homSpectr.experArr[0][2].replace(/"/g, "");  //poistetaan kaikki lainausmerkit
        seivString = 'eV' + '\t' + 'Intensity' + '\t' + legenda;
        n = homSpectr.experArr.length;
        for (i = 1; i < n; i++) {
            seivString = seivString + '\r' + homSpectr.experArr[i][0] + '\t' + homSpectr.experArr[i][1];
        }
    }
    //console.log('exper seivSting: ',seivstring);
    return seivString;
}

function matrlToLocFile(filesname){
    //callback for local filesave
    //EnDisButt('Enabled', '#btnUseTarg');
    console.log('Saved material to local file: '+filesname);
}

function targetToLocFile(filesname){
    //callback for local filesave
    EnDisButt('Enabled', '#btnUseTarg');
    console.log('Saved target to local file: '+filesname);
}

function stackToLocFile(filesname){
    //callback for local filesave
    //EnDisButt('Enabled', '#btnUseTarg');
    console.log('Saved stack to local file: '+filesname);
}

function emisToLocFile(filesname){
    //callback for local filesave
    //EnDisButt('Enabled', '#btnUseTarg');
    console.log('Saved emission spectrum local file: '+filesname);
}

  //Tabs-7 & Tabs-8 järjestää editoidun taulukon 1.n sarakkeen mukaan
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