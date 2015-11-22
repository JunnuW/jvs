/**
 * Created 13.11.2014 by jv.
 * Contains functions for data tables and graphing
 */

"use strict";
 /**
 * Spectral wavelength points array creator
 * @function
 *
 */
function buildSpArray(){
    //Calculations is always are done in nm units and array has uniform grid
    //For results display units can be: nm, um or eV
    //if eV axis is chosen the nm grid is changed to inversely uniform grid
    //energies are uniformly spaced on 1/wavelength [1/nm] scale
    spArra=[];//grid reset
    var startV=spStart;
    var stopV=spStop;
    spArra.push([spUnit,RorT,'']); //first element has the unit. nm, um or eV
    if (spUnit=='eV'){
        if (spStart>0) startV=1239.8/spStart; //spinner start value in eV, converted to nm start value
        if (spStop>0) stopV=1239.8/spStop;//spinner stop value in eV, converted to nm stop value
    }
    var sDel=(stopV-startV)/(spNum-1);
    for (var i=0;i<spNum;i++) {
        var temSp = startV + i * sDel;
        //sArr.push([temSp,,]);
        if (spUnit == 'eV' && temSp > 0) {
            //muutetaan eV akselin pisteet takaisin nm:ksi
            //aallonpituusasteikosta tulee epälineaarinen
            spArra.push([1239.8 / temSp, ,]);
        }
        else {
            spArra.push([temSp, ,]);
        }
    }
}

/**
 * Function evaluates difference between the target and calculated spectra
 * @function
 */
function evalDif(){
    var difVari=0;
    var difAver=0;
    var dif=0;
    var n=0;
    for (var i=1;i<spArra.length;i++){
        if (spArra[i][2]){
            n+=1;
            dif=(spArra[i][1]-spArra[i][2]);
            difVari+=dif*dif;
            difAver+=Math.abs(dif);
        }
    }
    return (n>0)? {difAve:difAver/n, difVar:difVari/n}: {difAve:'no target',difVar:'no target'};
}

/**
 * Function checks parameters for film thickness autotuning
 * @function returns 'Stop' or 'Continue' depending if parameters are good for autotuning
 */
function iter1(){
    //Check if both calculated and target spectra are available:
    if ((spArra[0][1]) && (spArra[0][2])) {
        var diffs=evalDif();
        if (diffs.difAve<0.0001){
            $('#tuneVar').val(diffs.difVar-diffs.difAve*diffs.difAve);
            $('#tuneDif').val(diffs.difAve);
            return 'Stop';
        }//already fitted no iteration needed stop iter1
        var tuneN= 0;
        for (var j=0;j<stackArr.length;j++){
            if (stackArr[j][3]==="Yes"){
                tuneN+=1; //tune option selected for the layer
                if (stackArr[j][2]<=0){
                    $('#tuneVar').val('d'+j+' =0 !!');
                    $('#tuneDif').val('Error:');
                    $('#autoTune').children('.ui-button-text','span').text('AutoTune');
                    //console.log('stackArr['+j+'][2]=0');
                    return 'Stop';
                }//could not start from zero thickness stop iter1
                stackArr[j].slice(0,5);//removed earlier tuning-data
                stackArr[j].strtVal=stackArr[j][2]; //save initial value to enable cancel operation
            }
        }
        return (tuneN<1)? 'Stop':'Continue';
    }
    else {
        //check if calculated spectrum is missing
        if (!spArra[0][1]) {
            $('#tuneVar').val('Calc.err');
            $('#tuneDif').val('Calc.err');
            //console.log('no spArra[0][1]-AutoTune');
            $('#autoTune').children('.ui-button-text','span').text('AutoTune');
            return 'Stop';
        }
        //check if target spectrum is missing
        if (!spArra[0][2]) {
            $('#tuneVar').val('Target?');
            $('#tuneDif').val('Target?');
            //console.log('no spArra[0][2]-AutoTune');
            $('#autoTune').children('.ui-button-text','span').text('AutoTune');
            return 'Stop';
        }
    }
}
/**
 * Function increases selected film thicknesses by multiplying with ratio:
 * (1+ tunePrcnt/100) until difference between calculated and target spectra
 * starts to increase.
 * To avoid user interfce freeze this function is called from setTimeout function
 * @function iter2
 * @param tunePrcnt  parameter for thickness increase rate
 */
function iter2(tunePrcnt){
    var RET = ($('#autoTune').children('.ui-button-text','span').text()=='AutoTune')? -1: tunePrcnt;
    if (RET<0.0001) {
        iterEnd();
        return;
    }
    var diffs=evalDif();
    var diffsN=diffs.difVar*1.1; //ensure loop execution atleast once
    //console.log('iter2-tunePrcnt: '+tunePrcnt);
    var n=0;
    while (diffsN>diffs.difVar){
        n+=1;
        diffsN=diffs.difVar;
        for (var j=0;j<stackArr.length;j++){
            if (stackArr[j][3]==="Yes"){
                stackArr[j][2]*=(100+tunePrcnt)/100; // increased tuned layer thickness
            }
        }
        updRTspArra();
        diffs=evalDif();
        //emergency exit to avoid infinite loop:
        if (n>1000) {//emergency exit to avoid infinite loop
            break;
        }
    }
    //console.log('iter2-n: '+n+' tunePrcnt: '+tunePrcnt);
    if (n<1000 && n>1) tunePrcnt*=0.5;
    if($('#autoTune').children('.ui-button-text','span').text()=='StopTune'){
        setTimeout(function(tunePrcnt,calliBacki){
            //tunPrcnt=tunePrcnt;
            /*var currentdate = new Date();
            var startAt = "iter3Start: "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + ":"
                + currentdate.getSeconds();
            console.log(startAt);*/
            calliBacki(tunePrcnt);
        },10,tunePrcnt,iter3); //continues to iter3 to decrease thicknesses
    }
}

/**
 * Function decreases tuned film thicknesses by multiplying with ratio:
 * (1- tunePrcnt/100) until difference between calculated and target spectra
 * starts to increase.
 * To avoid user interfce freeze this function is called from setTimeout function
 * @function iter3
 * @param tunePrcnt  parameter for thickness decrease rate
 */
function iter3(tunePrcnt){
    var RET = ($('#autoTune').children('.ui-button-text','span').text()=='AutoTune')? -1: tunePrcnt;
    if (RET<0.0001) {
        iterEnd();
        return;
    }
    var diffs=evalDif(); //fitting quality estimate
    var diffsN=diffs.difVar*1.1;//ensure loop execution atleast once
    //console.log('itr3-tunePrcnt: '+tunePrcnt);
    var n=0;
    while (diffs.difVar<diffsN){
        n+=1;
        diffsN=diffs.difVar;
        for (var j=0;j<stackArr.length;j++){
            if (stackArr[j][3]==="Yes"){
                stackArr[j][2]*=(100-tunePrcnt)/100; // decreased tuned layer thickness
            }
        }
        updRTspArra();
        diffs=evalDif();
        if (n>1000) {//emergency exit to avoid infinite loop
            break;
        }
    }
    if (n<1001 && n>1) tunePrcnt*=0.5;
    //console.log('iter3-n: '+n+' tunePrcnt: '+tunePrcnt);
    if($('#autoTune').children('.ui-button-text','span').text()=='StopTune') {
        setTimeout(function (tunePrcnt, calliBacki) {
            //tunPrcnt = tunePrcnt;
            /*var currentdate = new Date();
            var startAt = "iter2Start: "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + ":"
                + currentdate.getSeconds();
            console.log(startAt);*/
            calliBacki(tunePrcnt);
        }, 10, tunePrcnt, iter2); //returns to iter2: to increase thicknesses
    }
}


/**
 * Function updates user page after iteration:
 * @function iterEnd
 */
function iterEnd(){
    var diffs=evalDif(); //fitting quality estimate
    for (var j=0;j<stackArr.length;j++){
        stackArr[j][2]=(Math.round(stackArr[j][2]*1000))/1000;
    }
    oStackTable.fnClearTable();
    oStackTable.fnAddData(stackArr);
    updRTspArra();
    updGraph();
    $('#tuneVar').val(diffs.difVar);
    $('#tuneDif').val(diffs.difVar-diffs.difAve*diffs.difAve);
    $('#autoTune').children('.ui-button-text','span').text('AutoTune'); //reset button caption
}

/**
 * Function returns film thicknesses to their original values before tuning:
 * @function revertTune
 */
function revertTune(){
    var jj=stackArr.length;
    for (var j=0;j<jj;j++){
        if (stackArr[j][3]==="Yes"){
            stackArr[j][2]=stackArr[j].strtVal;
            stackArr[j][3]="No";
        }
    }
    oStackTable.fnClearTable();
    oStackTable.fnAddData(stackArr);
    updRTspArra();
    updGraph();
}

//Graphing Funs:
 /**
 * Function for plotting Reflectance and Transmittance graphs on spectral targets Tab
 * @function
 * @param {Array} PloArr - contains the numeric data to be plotted
 * @param {Number} graphNO - flot-graph placeholder number according to tabs-no
 */
function plotRT(PloArr, graphNO) {
    if (!PloArr) return; //exit plotting if no data
    var plotsRT=[];      //reflectance or transmittance vector
    var graphType;
    var graphXunit;
    graphType = PloArr[0][1] + "%"; //Here either: R%, T%
    graphXunit = PloArr[0][0]; //ollee: nm, um tai eV
    if (graphXunit==='eV'){
        graphXunit = 'Energy eV';
    }
    else{
        graphXunit='Wavelength ['+graphXunit+']';
    }
    var jj;
    for (jj = 1; jj < PloArr.length; jj++) {
        plotsRT.push([PloArr[jj][0], PloArr[jj][1]]);
    }
    $.plot("#placeholder" + graphNO, [{ data: plotsRT, label: graphType}],
        {
            xaxes: [{ position: "bottom", axisLabel: graphXunit}],
            yaxes: [{ axisLabel: graphType}],
            legend: { position: "ne"
                //,canvas:true
            }
        });
}

/**
 * Plots n- and k- scatter-graphs to the given placeholder on correspondind tabs (using the jquery.flot-widget).
 * @function
 * @param {Array} PloArr - contains the numeric data for the curves
 * @param {Number} graphNO - graph placeholder number according to tabs-no
 */
function plotNK(PloArr, graphNO) {
    //Data files may have x units in: nm, um or eV
    //but in calculations and resulting spectra x is always nm, 
    //on graph no 6, these can be graphed according to 'spUnit' also in 'eV' and 'um'
    if (!PloArr) return; //exit plotting if no data
    var plotN=[]; //refractive index array
    var plotK=[]; //extinction index array
    var graphXunit= PloArr[0][0]; //ollee: nm, um tai eV
    if (graphXunit==='eV'){
        graphXunit = 'Energy eV';
    }
    else{
        graphXunit='Wavelength ['+graphXunit+']';
    }
    var jj;
    for (jj = 1; jj < PloArr.length; jj++) {
        if (graphNO!=6){
            //vain stack nk-graafissa huomioidaan yksikön muutos
            plotN.push([PloArr[jj][0], PloArr[jj][1]]);
            plotK.push([PloArr[jj][0], PloArr[jj][2]]); 
        }
        else {
            switch(spUnit){
                case 'eV':
                    var x;
                    x = (PloArr[jj][0] > 0) ? 1239.8 / PloArr[jj][0]:NaN;
                    //this prevented divison by zero or negative number
                    graphXunit = 'Energy eV';
                    plotN.push([x, PloArr[jj][1]]);
                    plotK.push([x, PloArr[jj][2]]);
                    break;
                case 'um':
                    plotN.push([PloArr[jj][0]/1000, PloArr[jj][1]]);
                    plotK.push([PloArr[jj][0]/1000, PloArr[jj][2]]);
                    graphXunit='Wavelength [um]';
                    break;
                case 'nm':
                    plotN.push([PloArr[jj][0], PloArr[jj][1]]);
                    plotK.push([PloArr[jj][0], PloArr[jj][2]]);
                    graphXunit='Wavelength [nm]';
                    break;
            } 
        }
    }
    $.plot("#placeholder" + graphNO, [
            { data: plotN, label: "n" },
            { data: plotK, label: "k", yaxis: 2 }],
            { xaxes: [{ position: "bottom", axisLabel: graphXunit}],
            //"Wavelength [" + PloArr[0][0] + "]"
            yaxes: [{ axisLabel: "n" }, { position: "right", axisLabel: "k"}],
            legend: { position: "ne"}
        });
}

/**
 * Plots calculated and target R% or T% graphs to Tabs6 (using the jquery.flot-widget).
 * @function
 * @param {Array} PloArr - contains the numeric data for the curves
 * @param {Number} graphNO - graph placeholder number according to tabs-no
 */
function plotRT2(PloArr) {
    //Data files may have x units in: nm, um or eV
    //but in calculations and resulting spectra x is always nm, 
    //on graph no 6, these can be graphed according to 'spUnit' also in 'eV' and 'um'
    //console.log('PloArr ' + PloArr);
    if (!PloArr) return;  //exit plotting if no data
    var plotCalc=[];     //calculation result array
    var plotTarg=[];     //spectral target array
    var yAxisLbl = RorT + "%";   //should be either R% or T%
    var graphXunit= PloArr[0][0]; //ollee: nm, um tai eV
    if (graphXunit==='eV'){
        graphXunit = 'Energy eV';
    }
    else{
        graphXunit='Wavelength ['+graphXunit+']';
    }
    for (var jj = 1; jj < PloArr.length; jj++) {
        //Modify spectral unit from nm to desired  plotting
        //first column is in nm but will be transformed for plotting:
        switch (spUnit) {
            case 'eV':
                var x;
                x = (PloArr[jj][0] > 0) ? 1239.8 / PloArr[jj][0] : NaN;
                graphXunit = 'Energy eV';
                plotCalc.push([x, PloArr[jj][1]]);
                plotTarg.push([x, PloArr[jj][2]]);
                break;
            case 'um':
                plotCalc.push([PloArr[jj][0] / 1000, PloArr[jj][1]]);
                plotTarg.push([PloArr[jj][0] / 1000, PloArr[jj][2]]);
                graphXunit = 'Wavelength [um]';
                break;
            case 'nm':
                plotCalc.push([PloArr[jj][0], PloArr[jj][1]]);
                plotTarg.push([PloArr[jj][0], PloArr[jj][2]]);
                graphXunit = 'Wavelength [nm]';
                break;
        }
    }
    if (spArra[0][1] == 'R%' | spArra[0][1] == 'T%') {
        //both calculated and target will be plotted
        $.plot("#placeholder6", [
            { data: plotCalc, label: "Calc."+spArra[0][1]},
            { data: plotTarg, label: "Targ."+spArra[0][2]}],
            { xaxes: [{ position: "bottom", axisLabel: graphXunit}],
                yaxes: [{ axisLabel: yAxisLbl}],
                legend: { position: "ne" }
            });
    }
    else {
        //Only Target will be plotted
        //todo: Edit so that also, only calculated can be plotted!
        $.plot("#placeholder6", [
            { data: plotTarg, label: "Targ."+spArra[0][2]}],
            { xaxes: [{ position: "bottom", axisLabel: graphXunit}],
                yaxes: [{ axisLabel: yAxisLbl}],
                legend: { position: "ne" }
            });
    }
}

function updGraph(){
    var stackPL2;
    if ($('input:radio[name=graphMode]:checked').val() == 'StackRT') {
        stackPL = plotRT2(spArra); //graafi päivitetään
        //alert("graafi päivitettiin");
    }
    else {
        var layerX =oStackTable.$('tr.row_selected');
        if (layerX.length < 1) return; //no nk-graphing, since all layers unselected
        var rowInd = oStackTable.fnGetPosition($(layerX).closest('tr')[0]);
        var nkArra = [];
        var tmp = [spUnit,'n','k'];
        nkArra.push(tmp);
        var n = stackArr[rowInd][4].length;
        for (var i = 1; i < n; i++) {
            tmp=[spArra[i][0],stackArr[rowInd][4][i],stackArr[rowInd][5][i]];
            nkArra.push(tmp);
        }
        stackPL2 = plotNK(nkArra, 6);
    }
}

/**
 * Function for updating R or T calculation data while plotting on 'Film stack Tab'
 * @function
 */
function updRTspArra(){
    //if (!$("#setStack").is(":checked")) return;      //film n-k graphing is selected
    spArra[0][1] = RorT + "%";
    if (!stackArr.ready) {
       //All stack layers have not been set with n-k data:
       var m=spArra.length;
       for (var i = 1; i < m; i++) { 
          //cannot evaluate transmittance/reflectance:
          spArra[i][1] = NaN;
          } 
        }
    else {
        matrixMult(theta0,polaris);
        //if ($("#setFilm").is(":checked")) return; //n-k plotting selected exiting function
        //stackPL = plotRT2(spArra);
        }
}

/**
 * Function for updating R or T Target data before plotting on 'Film stack Tab'
 * @function
 */
function updTargSpArra() {
    var selTarg = $('#stackTargs option:selected').text();
    if (!selTarg || selTarg==="Select:" || selTarg==="List is empty" ) return;
    //alert("selected target: "+selTarg);
    var Targt = [];
    //console.log("selTarg: "+selTarg);
    Targt = intpolData(selTarg, spectOpts, 1);
    //interpoloidaan toisesta sarakkeesta spArra:n kolmanteen sarakkeeseen
    for (var i = 0; i < Targt.length; i++) {
        spArra[i][2] = Targt[i];
        //ensimmäiseksi alkioksi pitää tulla: R tai T
    }
}

/**
 * Function for updating n-k data Graph on 'Film stack Tab'
 * @function
 */
function updNKspArra() {
//Checkings:
// No:1 Check that some materials are available for the layers
    if (matOpt.length < 1) return; //exit immediately
    var layerCount = stackArr.length;
    //loop through all material layers:
    for (var rowIndex = 0; rowIndex < layerCount; rowIndex++) {
        var matrl;
        //loop through all material options:
        for (var i = 0; i < matOpt.length; i++) {
            if (stackArr[rowIndex][1] == matOpt[i].Name) {
                matrl = matOpt[i].Name;
            }
        }
        if (matrl) {
            //selected material exists in options
            var f = stackArr.length; //heading row and wavelength values
            for (var i = 0; i < f; i++) {
                 //delete n- ja k-values dropping off array starting at 4th index (5th pos.)
                stackArr[i].slice(0, 4);
                stackArr[i].push([]); //add empty array to 5th pos.
                stackArr[i].push([]); //add empty array to 6th pos
                var nORk = []; //n is interpolated first the k
                nORk = intpolData(stackArr[i][1], matOpt, 1);//interpolate new n-values
                stackArr[i][4] = nORk; //add them to stackArr[][4]
                nORk = intpolData(stackArr[i][1], matOpt, 2);//interpolate new k-values
                stackArr[i][5] = nORk; //add them to stackArr[][5]
            }
        }
    }
// No:2 Check if all layers have valid n-k data:
//disables, enables stack plotting:
         for (var i=0;i<f;i++){
            stackArr.ready=true;
            if (stackArr[i][4].length!==spArra.length) stackArr.ready = false;
            else stackArr.ready = true;
         }

// No:3 Check if stack graphing has been chosen
        if ($("#setStack").is(":checked")){
            updRTspArra();//graph-RT
            return; //nk-values not graphed
        }
}

/**
 * Cubic spline interpolation from available data points to desired data points:
 * @function
 * @param {array} toVector 1xn array of abscissa-values whose ordinatas will be evaluated
 * @param {array} onArray 2xm array of abscissa and ordinata values for interepolation data
 * @return {array} onVal Returned 1xn array as the interpolation result
 */
function cubSplinInt(toVector,onArray){
    //ToDo: target vektoria ei saa venyttää päistään kuten n- ja k-vektoreita
    //console.log('toVector: ' + toVector);
    //console.log('onArray: ' + onArray);
    var onDer=[]; //derivatives at available data points:
    var n=toVector.length;
    var onVal=new Array(n);
    var m=onArray.length;
    var arrNam = onArray[0][1];
    var temp1;
    //console.log('arrNam: ' + arrNam);
    //calculate derivatives to existing data values
    onDer.push(0);//first derivative is zero
    for (var i=2;i<m-1;i++){
        temp1=((onArray[i+1][1]-onArray[i][1])/(onArray[i+1][0]-onArray[i][0])+
        (onArray[i][1]-onArray[i-1][1])/(onArray[i][0]-onArray[i-1][0]))/2;
        onDer.push(temp1);
    }
    if (m>=2) onDer.push(0);//last derivative is zero
    //loop through toVector points (desired abscissa values):
    for (var i=0;i<n;i++) {
        if (toVector[i] > onArray[m - 1][0]) {
            //desired wavelength exeeds highest point
            onVal[i] = '';
            if (arrNam == 'T' | arrNam == 'R') onVal[i] = NaN;
            //could not evaluate R or T
            if (arrNam=='n'|arrNam=='k') onVal[i]=onArray[m - 1][1];
            //n or k values filled using ordinate of largest abscissa
            //=equal to last point in onArray
            }
        else {
            //loop through onArray points to find the closest 
            //neighbours for toVector[i] value in onArray[0...m-1][0]
            for (var j = 1; j < m-1; j++) {
                if (toVector[i] < onArray[1][0]) {
                    onVal[i] = '';
                    if (arrNam == 'T' | arrNam == 'R') onVal[i] = NaN;
                    //could not evaluate R or T
                    if (arrNam=='n'|arrNam=='k') onVal[i]=onArray[1][1];
                    //n or k values were set equal to first point in onArray
                    break; //j not incremented, abscissa below lowest available value
                }
                else if (toVector[i]==onArray[j][0]){
                        onVal[i]=onArray[j][1];
                        //requested spectral point coincided with available data point
                    }
                else if (toVector[i]>onArray[j][0]&&toVector[i]<onArray[j+1][0]){  
                        //request lies between two available data points; interpolated:
                        var x = (toVector[i] - onArray[j][0]) /
                        (onArray[j+1][0] - onArray[j][0]);
                        onVal[i]=(2*x*x*x-3*x*x+1)*onArray[j][1]+(x*x*x-2*x*x+x)*onDer[j-1]*(onArray[j+1][0]-onArray[j][0])+
                        (-2*x*x*x+3*x*x)*onArray[j+1][1]+(x*x*x-x*x)*onDer[j]*(onArray[j+1][0]-onArray[j][0]);
                    }
            }
        }
    }
    return onVal;
}

/**
 * Makes an y-value vector coinciding with x-values 
 * x-axis calculation units are always in nm, but desired plotting unit can be nm, um or eV
 * spectral plotting array in 'spArra', 
 * whose y-values are obtained through cubic spline interpolation
 * @function
 * @param (text) optName - Name of material in the stack layer
 * @param [array] optArr - options table for materials or spectral targets
 * @param (number) trIndex - index (=1 or 2) of the plotted curve 
 * [(film-n):1, (film-k):2, (calculated R or T):1, (target R or T):2.] 
 */
function intpolData(optName,optArr,trIndex){
    //spVector first member contains spectral unit to be displaid in UI
    //in calculations spectral points are always in nm-units
    var Vector=[];
    var tmpUnit;
    var ideTr; //n, k, R or T
    var n=spArra.length;
    //luotava uusi vektori muuten koko 'spArra' editoituu, koska javascriptin parametrit
    //välitetään referensseinä alkuperäiseen objektiin, ja funktion sisällä tapahtuva 
    //objektien manipulointi kohdistuvat myös alkuperäisiin objekteihin
    var spVector=[];
    for (var i = 1; i < n;i++ ){
        spVector.push(spArra[i][0]); //aallonpituudet nm:nä
    }
    //skipped first element (i=0, containing the wavelength unit in graphing)
    //get material nk-data:
    //console.log('spVector: ' + spVector);
    for (var i=0;i<optArr.length;i++){
        if (optName==optArr[i].Name) {
            ideTr = optArr[i].Data[0][trIndex];//source data ide:n,k, R or T
            tmpUnit=optArr[i].Data[0][0];//x-axis plotting unit       
            //may differ from the calculation unit (=nm always)
            var s=optArr[i].Data.length;
            var tmpPoint=[,ideTr];
            Vector.push(tmpPoint);
            for (var j=1;j<s;j++){
                //optArr[i].Data:ssa (joko matOpt[i] tai targOpt[i]) numeeriset arvot
                //ensimmäisessä rivissä otsikko esim: ['nm','n','k']
                tmpPoint=[];
                tmpPoint.push(optArr[i].Data[j][0]);//aallonpituus
                tmpPoint.push(optArr[i].Data[j][trIndex]);
                //trIndex=1: n-arvo tai referenssin R|T-arvo, 
                // trIndex=2: ainoastaan n-k taulukon k-arvolle
                Vector.push(tmpPoint);
            }
            break; 
            //Prosessoitava vektori luettu poistuttiin 
            //materiaali- tai targettioptioiden luku-loopista
        }
    }
    //console.log('Vector: ' + Vector);
    if (Vector.length===0){
        return [];
    }
    var spVlength=spVector.length;
    var nkRTLength=Vector.length;
    //optArr:taulukossa allonpituus saatta olla materiaaleille 
    //spektritargeteille annettu nm-, um- tai eV-yksikköinä 
    //laskennassa käytetään vain nm:ä, muunnos:
    switch(tmpUnit) {
        case "nm":
            //muunnosta ei tarvita
            break;
        case "um":
            //muunnetaan um:t nm:eiksi kertomalla 1000:lla
            for (var i=0;i<nkRTLength;i++){
                Vector[i][0]*=1000;
            }
            break;
        case "eV":
            //muunnetaan eV:t nm-asteikolle
            for (var i=0;i<nkRTLength;i++){
                if (Vector[i][0]>0) {
                    Vector[i][0]=1239.8/Vector[i][0];
                }
                else {
                    Vector[i][0]=NaN;
                    console.log('spectral point at 0 (zero) energy!');
                    break;
                }
            }
            break;
        default:
            alert("Unknown spectral unit in material: "+optName);
            return [];
    }
    //tehdään interpolaatiot:
    var Vals = [];
        Vals.push(ideTr);//first value array descriptor
    var tempV=cubSplinInt(spVector,Vector);
        Vals=Vals.concat(tempV);//continue with numeric values
    //first value in spArra is spectral unit nm, um, eV,
    //but spectral point values are always in nm units
    //numerical data starts at index:1 in all three vectors spArra, nVals, kVals, R and T    
    return Vals;
}

//*******Tabling Funs:**********
/**
 * Film stack initialization function for tabs-6. Using dataTables jquery plugin
 * @function
 */
function createStackTable() {
    oStackTable = $('#StackEdit').dataTable({
        "aaData": stackArr,
        "bPaginate": false,
        "bLengthChange": false,
        "bFilter": false,
        "bSort": false,
        "bInfo": true,
        "bAutoWidth": false,
        "aoColumns": [{"sTitle": "Id:", "sType": "text", "sClass": "centtis"},
            {"sTitle": "Material:", "sType": "text", "sClass": "centtis"},
            {"sTitle": "Thickness:", "sType": "number", "sClass": "centtis"},
            {"sTitle": "Tuned:", "sType": "text", "sClass": "centtis",
                type: 'checkbox',
                onblur: 'submit',
                checkbox: {trueValue: 'Yes', falseValue: 'No'}
            }]
    });
}
/**
 * Initializes material nk-data editing table on tabs-8. Uses dataTables jquery plugin
 * @function
 */
function createMatEditTable(){
    var sTitle1="Unit [" + matrlArr[0][0] + "]";
    var sTitle2="n";
    var sTitle3="k";
    oMatTable = $('#matEditTabl').dataTable({
        "bPaginate": true,
        "bLengthChange": true,
        "bFilter": true,
        "bSort": false,
        "bInfo": true,
        "bAutoWidth": false,
        "aoColumns":
            [{"sTitle":sTitle1, "sWidth": "20%", "sType": "numeric", "sClass": "centtis"},
            {"sTitle":sTitle2, "sWidth": "15%", "sType": "numeric", "sClass": "centtis"},
            {"sTitle":sTitle3, "sWidth": "15%", "sType": "numeric", "sClass": "centtis"}],
        "bScrollCollapse": true
    });
    oMatTable.fnClearTable();
}

/**
 * Initializes material-options table (without data) on tabs-8. Uses dataTables jquery plugin
 * @function
 */
function createMatOptsTable(){
    oMatOptTable = $('#matOpsTabl').dataTable({
        "autoWidth": true,
        "bPaginate": false,
        "bLengthChange": false,
        "bFilter": false,
        "bSort": false,
        "bInfo": false,
        "bAutoWidth": false,
        "aoColumns": [{ "sTitle": "No:", "sType": "numeric", "sClass": "centtis" },
            { "sTitle": "Label",  "sType": "text", "sClass": "centtis" },
            { "sTitle": "Unit", "sType": "text", "sClass": "centtis" },
            { "sTitle": "Count", "sType": "numeric", "sClass": "centtis" },
            { "sTitle": "Owner", "sType": "text", "sClass": "centtis" },
            { "sTitle": "File", "sType": "text", "sClass": "centtis" }],
        "bScrollCollapse": true
    });
    oMatOptTable.fnClearTable();
}

/**
 * Initializes spectral-target editing table on tabs-7. Uses dataTables jquery plugin,
 * column titles obtained from targArr (global Array)
 * @function
 */
function createTargEditTable(){
    var sTitle1="Unit: [" + targArr[0][0] + "]";
    var sTitle2=targArr[0][1]+ " %-value";
    otargTable = $('#targEditTabl').dataTable({
        //"sScrollY": "300px",
        "bPaginate": true,
        "bLengthChange": true,
        "bFilter": true,
        "bSort": false,
        "bInfo": true,
        "bAutoWidth": false,
        //"aaData": targArr.slice(1),
        "aoColumns": [{"sTitle":sTitle1, "sWidth": "20%", "sType": "numeric", "sClass": "centtis" },
            {"sTitle":sTitle2, "sWidth": "15%", "sType": "numeric", "sClass": "centtis"}],
        "bScrollCollapse": true
    });
    otargTable.fnClearTable();
}

/**
 * Initializes spectral target-options table (without data) for tabs-7 using dataTables jquery plugin,
 * @function
 */
function createTargOptsTable(){
    oTargOptTable = $('#targOptsTabl').dataTable({
        "autoWidth": true,
        "bPaginate": false,
        "bLengthChange": false,
        "bFilter": false,
        "bSort": false,
        "bInfo": false,
        "bAutoWidth": false,
        "aoColumns": [{ "sTitle": "No:", "sType": "numeric", "sClass": "centtis" },
            { "sTitle": "Label",  "sType": "text", "sClass": "centtis" },
            { "sTitle": "Unit", "sType": "text", "sClass": "centtis" },
            { "sTitle": "Count", "sType": "numeric", "sClass": "centtis" },
            { "sTitle": "Owner", "sType": "text", "sClass": "centtis" },
            { "sTitle": "File", "sType": "text", "sClass": "centtis" }],
        "bScrollCollapse": true
    });
    oTargOptTable.fnClearTable();
}
