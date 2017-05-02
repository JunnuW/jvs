/**
 * Created by Juha on 4/16/2017.
 */
var userName = 'No login';     // after login obtained from web-server
var dirUser='Publ';            //default (i.e. No Login) username for server directory
var kBoltz = 1.38064852E-23;   //Boltzmann constant
var eCha = 1.60217662E-19;     //electron charge
var hBar = 1.05457180E-34;     //reduced Planck constant hbar
var hPlanck = 6.62607004E-34;  //Plank's constant [Js]
var fftN = 2048;               //number of points in Cooley Tukey fft circular algorithm
var inhomSpectr= new Object(); //spectrum simulation for inhomog. broadening plotting
var homSpectr = new Object();  //spectrum simulation for homog. broadening plotting
var simSettn = new Object();   //parameter values used in simulations and spectrum saving

inhomSpectr.numPoints=1000;    //less than half of fftN (Nyquist sampling rate criterion)
homSpectr.numPoints = inhomSpectr.numPoints;
//simSettn.savePoints=1000;       //save all points, user can change it on saving dialog

inhomSpectr.inPlot={
    eV:false,          //initially show only photon energy
    jdos:false,       //density of states not multiplied
    Se:false,         //Sommerfeld enhancement not multiplied
    fcv:true,        //Energy state occupancy not multiplied
    Lurb:false,       //One sided Urbach broadening not selected
    Lsurb:false,      //Symmetric Urbach broadening not selected
    Lgaus:false,      //Gaussian broadening not selected
    Lsech:false,      //Sech broadening function not selected
    convo:false       //convolution calculation not selected
};

homSpectr.inPlot = {
    convo: false,
    exper: false
};

inhomSpectr.eVarr=[];              //photon energy array (x-axis points)
inhomSpectr.jdosArr=[];            //jdos
inhomSpectr.exenArr=[];            //exciton enhancement array
inhomSpectr.fcvArr = [];           //boltzmann function array
inhomSpectr.Lih = [];              //Lih array centre at Etr
inhomSpectr.plotArr = [];          //plotted array
inhomSpectr.experArr = [];         //Experimental spectrum as read from file
inhomSpectr.experPlot = [];        //Experimental spectrum as scaled in plot
homSpectr.plotArr = [];            //plotted on second figure
homSpectr.experArr = [];           //experimental array as read from file
homSpectr.experPlot = [];          //experimental array for plotting

simSettn= {
    //++++++spectral range for calculations:
    eVstart: 1.3,           //start energy for simulation
    eVstop: 1.7,            //stop energy for simulation
    eVTr: 1.35,               //Transition energy in Boltzmann function
    //Ev:true,
    //++++++Temperature in the Boltzmann energy distribution in the e-h pair population
    kelvin: 293,            //temperature [K] in boltzmann function
    //++++++Density of states, either; 'qw' for quantum wells or 'bulk' for bulk materials
    jdostype: "qw",         //bulk or qw: parabolic or Heaviside step function
    //++++++Exciton enhancement parameters for bulk and qw's:
    exEb: 5,                //exciton binding energy meV
    //++++++Exciton parameters for qw's:
    viewDir: 'parallel',    //viewing dir; on qw plane:'parallel', outside plane:'perpend'
    polarizat: 'TE',        //TE or TM, (TM possible only if viewed on qw plane)
    ex0: 2.0,               //exciton spectrum shape parameter meV; removes singularity at eTr
    //++++++Broadening function parameters:
    eU: 8,                  //Urbach energy, valid for both single- and two sided function [meV]
    GauSig: 7,              //variance [meV] in gaussian broadening
    SechTau: 100,           //tau for Sech fun broadening
    SechN: 1,               //exponent n for Sech fun broadening
    LorTau: 100,            //Lorentzian reduced relaxation time femtoseconds
    DlTau1: 100,            //electron/hole relaxation time in dual Lorentzian B.F. [fs]
    DlTau2: 100             //hole/electron relaxation time in dual Lorentzian B.F. [fs
};

makespArr();  //creates spectral points array and stores to inhomSpectr.eVarr

Object.defineProperty(simSettn, "eTr", {
    //getter-setter pair coincides eTr value on one of the simulation array points,
    //otherwise exciton enhancement is jumpy when scrolled by spinner
    set: function(x) {
        var tempEtr;
        var k;
        if(x>this.eVstart && x<this.eVstop){
            k= (inhomSpectr.numPoints-1)*(x-this.eVstart)/(this.eVstop - this.eVstart);
            k=Math.round(k);
        }else{
            k=Math.round(inhomSpectr.numPoints/2);
        }
        this.eVTr = inhomSpectr.eVarr[k];
        $('#Et_touch').val(inhomSpectr.eVarr[k].toFixed(3));
    },
    get: function () {
        return this.eVTr;
    }
});

graphSettn={
    inhomLegend: '',        //legend for graph 1
    homLegend: '',          //legend for graph 2
    inhomLinlog: 'lin',     //first plot linear or logarithmic
    homLinlog: 'log',       //second plot linear or logarithmic
    inhomFileN: '',         //filename for experimental file in inhom plot
    homFileN: ''            //filename for measurement in homogeneous plot
};

// Additional initial values *******************************************:
// ****************************************************************

simSettn.eTr=1.4; //starting value for transition energy
var optiot = {//initial plotting options
    xaxes: [{position: 'bottom', axisLabel: 'Energy eV'}],
    yaxes: [{position: 'left', axisLabel: 'Relative Intensity'}],
    legend: {position: "ne"},
    grid: {//This one set can be hovered:
        margin: {
            top: 35
        },
        hoverable: 'Relative Intensity'
    },
    canvas: true
};

var plot = $.plot("#ph1_inhomog", [], optiot);
var plot2 = $.plot("#ph2_homog", [], optiot);
var dataa = [
    //initializes data for graph plotting
    {//only one x,y and axis pair
        //data: LinOrLog(inhomSpectr.plotArr),
        data: LinOrLogs(graphSettn.inhomLinlog,inhomSpectr.plotArr,plot),
        xaxis: 1, yaxis: 1, label: graphSettn.inhomLegend
    }
];

function setQwRadio(){
    //console.log('setQwRadio');
    if (simSettn.viewDir == 'parallel'){
        $('#dirPar').prop('checked',true);
        $('#dirPerp').prop('checked',false);
    }else{
        $('#dirPar').prop('checked',false);
        $('#dirPerp').prop('checked',true);
    }
    if (simSettn.polarizat == 'TE') {
        $('#enhTE').prop('checked',true);
        $('#enhTM').prop('checked',false);
    }else{
        $('#enhTE').prop('checked',false);
        $('#enhTM').prop('checked',true);
    }
}

function setJdosRadio(){
    if (simSettn.jdostype == "bulk") {
        $('#bulkJDOS').prop("checked", true);
        $('#qwendetls').css('display','none');
        $('#qwdetails .hideshow').hide();
    } else {
        $('#qwJDOS').prop("checked", true);
        $('#qwendetls').css('display','inline');
        $('#qwdetails .hideshow').show();
    }
}

makeJdos();       //density of states
makeBoltz();      //creates Boltzmann distribution
setChkboxes();    //updates checkbox status
setLegend();      //makes plotting legend
makeSommer();     //exciton enhanchements
calcInhom();      //produce initial graph

$("#paramDial").dialog({
    width: 700,
    autoOpen: false,
    maxHeight: '700px',
    overflow: 'auto',
    show: {
        effect: "blind",
        duration: 500
    },
    hide: {
        effect: "explode",
        duration: 200
    }
});


$("#settnDial").dialog({
    width:700,
    autoOpen: false,
    maxHeight: '700px',
    overflow: 'auto',
    show: {
        effect: "blind",
        duration: 500
    },
    hide: {
        effect: "explode",
        duration: 200
    }
});

//Build dialog form for opening and saving files
var srvrFileTxt = 'Open emission spectrum';
var DFmngo = $('#mongoDialForm'); //dialog form
DFmngo.dialog('option', 'title', srvrFileTxt);

$('#openFile').click(function(){
    //PL/EL emission spectrum from emission collection
    $('#settnDial').dialog('close');
    DFmngo
        .dialog('option','width','700px')
        .dialog('option','height','auto')
        .dialog('option','title',srvrFileTxt)
        .dialog('open');
    $('#frm-DirSel').show();
    $('#openOpti').css('display','inline');
});

$('#saveFile').click(function () {
    var otsake=$('#settnDial').dialog('option', 'title');
    if (otsake=='Inhomogeneous spectrum'){//simulation settings label adjustment:
        $('#lblsaveSimSpe').text("Inhomogeneous simulation");
    } else {
        $('#lblsaveSimSpe').text("Homogeneous simulation");
    }
    if ($('#chkSaveSimu').prop('checked')) {//check calculated value saving
        $('#numSel').prop('disabled',false);//enable datapoint count adjustment
    }else{
        $('#numSel').prop('disabled',true);
    }
    if ((homSpectr.experArr.length < 1 && otsake == 'Homogeneous spectrum') ||
        (inhomSpectr.experArr.length < 1 && otsake == 'Inhomogeneous spectrum')) {
        $('#chkSaveExper').attr('disabled',true); //no experimental inhom. or homogeneous data
    } else {
        $('#chkSaveExper').attr('disabled',false);//experimental data exists for saving
    }
    $('#settnDial').dialog('close');
    var srvrFileTxt = 'Save emission spectrum';

    DFmngo
        .dialog('option','width','700px')
        .dialog('option', 'title', srvrFileTxt)  // PL/EL emission spectrum db collection
        .dialog('open');
    $('#openOpti').css('display','none');
});

function inhomSettns_dialog(){
    $('#spWhat').css('display', 'block');
    $('#spLorentz').css('display', 'none');
    $('#spDlorentz').css('display', 'none');
    $('#bConvolOpt').text('Broadening (convolution) options for Lih:');
    $('#divEpsilon').css('display', 'block');
    $('#divJdos').css('display', 'block');
    $('#divSommerf').css('display', 'block');
    $('#divFcv').css('display', 'block');
    $('#divUrbach').css('display', 'block');
    $('#divSurbach').css('display', 'block');
    $('#divGaussian').css('display', 'block');
    $('#divSech').css('display', 'block');
    $('#divLorentz').css('display', 'none');
    $('#divDLorentz').css('display', 'none');
    $('#divHomogConv').css('display', 'none');
    $('#divNormalize').css('display', 'block');
    $('#settnDial').dialog('option', 'title', 'Inhomogeneous spectrum');
    $('#bPlotSel1').css('display','block');
    $('#bPlotSel2').css('display','none');
    $("#settnDial").dialog("open");
    if (inhomSpectr.experArr.length > 0) {
        $('#saveFile').css('display', 'inline');
    } else {
        $('#saveFile').css('display', 'inline');
    }
    setJdosRadio();
    setQwRadio();
}

$('#ph1_inhomog').dblclick(function(){
    inhomSettns_dialog();
});

function homogSettns_dialog(){
    $("#spSech").css('display', 'none');
    $("#spGaussian").css('display', 'none');
    $("#spSurbach").css('display', 'none');
    $("#spUrbach").css('display', 'none');
    $('#spWhat').css('display', 'block');
    $('#bConvolOpt').text('Homogeneous line shape options for Lh:');
    $('#divEpsilon').css('display', 'block');
    $('#divJdos').css('display', 'block');
    $('#divSommerf').css('display', 'block');
    $('#divFcv').css('display', 'block');
    $('#divUrbach').css('display', 'none');
    $('#divSurbach').css('display', 'none');
    $('#divGaussian').css('display', 'none');
    $('#divSech').css('display', 'none');
    $('#divLorentz').css('display', 'block');
    $('#divDLorentz').css('display', 'block');
    //$('#divHomog').css('display', 'block');
    $('#divHomogConv').css('display', 'block');
    $('#divNormalize').css('display', 'block');
    $('#settnDial').dialog('option', 'title', 'Homogeneous spectrum');
    $('#bPlotSel2').css('display', 'block');
    $('#bPlotSel1').css('display', 'none');
    $("#settnDial").dialog("open");
    if (homSpectr.experArr.length > 0) {
        $('#saveFile').css('display', 'inline');
    } else {
        $('#saveFile').css('display', 'inline');
    }
}

$('#ph2_homog').dblclick(function () {
    homogSettns_dialog();
});

$("#eVstart_touch").TouchSpin({
    max: 4.5, //simSettn.eVstop - 0.1,
    min: 0,
    step: 0.001,
    initval: simSettn.eVstart,
    decimals: 3,
    boostat: 10,
    maxboostedstep: 0.005,
    postfix: 'eV',
    mousewheel: true
});

$("#eVstart_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($("#eVstart_touch").val());
    simSettn.eVstart=tmp1.toFixed(3);
    //prep. min value for eVstop_touch i.e. set 0.1eV minimum horiz. scale span:
    tmp1=tmp1+0.1;
    $("#eVstop_touch").trigger("touchspin.updatesettings", {min:tmp1});
});

$("#eVstop_touch").TouchSpin({
    max: 4.5,
    min: 0, //simSettn.eVstart + 0.1,
    step: Number(0.001),
    initval: simSettn.eVstop,
    decimals: 3,
    boostat: 10,
    maxboostedstep: 0.005,
    postfix: 'eV',
    mousewheel: true
});

$("#eVstop_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($("#eVstop_touch").val());
    simSettn.eVstop = tmp1.toFixed(3);
    //prep. max value for eVstart_touch i.e. set 0.1eV minimum horiz. scale span:
    tmp1 = tmp1 - 0.1;
    $("#eVstart_touch").trigger("touchspin.updatesettings", {max: tmp1});
});

$("#Et_touch").TouchSpin({
    max: 4.0,
    min: simSettn.eVstart + 0.01,
    step: Number(0.001),
    initval: simSettn.eTr,
    decimals: 3,
    boostat: 10,
    maxboostedstep: 0.005,
    postfix: 'eV',
    mousewheel: true
});

$("#Et_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($("#Et_touch").val());
    simSettn.eTr = tmp1;
    makeJdos();       //density of states changes with Etr
    makeBoltz();      //Boltzmann distribution changes with Etr
    makeSommer();     //exciton enhanchement also
    calcInhom();
    calcHom();
});

$("#TemK_touch").TouchSpin({
    max: 600,
    min: 0,
    step: Number(1),
    initval: simSettn.kelvin,
    decimals: 0,
    boostat: 10,
    maxboostedstep: 5,
    postfix: 'T[K]',
    mousewheel: true
});

$("#TemK_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($("#TemK_touch").val());
    simSettn.kelvin = tmp1.toFixed(0);
    makeBoltz();      //Boltzmann distribution changes with Temp [K]
    calcInhom();
    calcHom();
});

$("#eVbind_touch").TouchSpin({
    max: 20,
    min: 0.01,
    step: 0.01,
    initval: simSettn.exEb,
    decimals: 2,
    boostat: 5,
    maxboostedstep: 0.1,
    postfix: 'meV',
    mousewheel: true
});

$("#eVbind_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($("#eVbind_touch").val());
    simSettn.exEb = tmp1;
    makeSommer();     //exciton enhanchements
    calcInhom();
    calcHom();
});

$("#ex0_touch").TouchSpin({
    max: 50,
    min: 0.01,
    step: 0.01,
    initval: simSettn.ex0,
    decimals: 2,
    boostat: 5,
    maxboostedstep: 0.1,
    postfix: 'meV',
    mousewheel: true
});

$("#ex0_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($("#ex0_touch").val());
    simSettn.ex0 = tmp1;
    makeSommer();     //exciton enhanchements
    calcInhom();
    calcHom();
});

$("#eveu_touch").TouchSpin({
    max: 50,
    min: 0,
    step: 0.1,
    initval: simSettn.eU,
    decimals: 1,
    boostat: 5,
    maxboostedstep: 1,
    postfix: 'meV',
    mousewheel: true
});

$("#eveu_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($(this).val());
    simSettn.eU = tmp1.toFixed(1);
    calcInhom();
    calcHom();
});

$("#gausig_touch").TouchSpin({
    max: 100,
    min: 1,
    step: 0.1,
    initval: simSettn.GauSig,
    decimals: 1,
    boostat: 5,
    maxboostedstep: 1,
    postfix: 'meV',
    mousewheel: true
});

$("#gausig_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($(this).val());
    simSettn.GauSig = tmp1.toFixed(1);
    calcInhom();
    calcHom();
});

$("#sechN_touch").TouchSpin({
    max: 10,
    min: 0.01,
    step: 0.01,
    initval: simSettn.SechN,
    decimals: 2,
    boostat: 5,
    maxboostedstep: 0.25,
    postfix: '',
    mousewheel: true
});

$("#sechN_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($(this).val());
    simSettn.SechN = tmp1.toFixed(2);
    calcInhom();
    calcHom();
});

$("#sechTau_touch").TouchSpin({
    max: 1000,
    min: 10,
    step: 1,
    initval: simSettn.SechTau,
    decimals: 0,
    boostat: 5,
    maxboostedstep: 10,
    postfix: '[fs]',
    mousewheel: true
});

$("#sechTau_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($(this).val());
    simSettn.SechTau = tmp1.toFixed(0);
    calcInhom();
    calcHom();
});

$("#tauR_touch").TouchSpin({
    max: 2000,
    min: 1,
    step: 1,
    initval: simSettn.LorTau,
    decimals: 0,
    boostat: 5,
    maxboostedstep: 10,
    postfix: '[fs]',
    mousewheel: true
});

$("#tauR_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($(this).val());
    simSettn.LorTau = tmp1.toFixed(0);
    selBroadFun(Lorentz, 'Lorentz');
    calcHom();
});

$("#tauBe_touch").TouchSpin({
    max: 500,
    min: 1,
    step: 1,
    initval: simSettn.DlTau1,
    decimals: 0,
    boostat: 5,
    maxboostedstep: 10,
    postfix: '[fs]',
    mousewheel: true
});

$("#tauBe_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($(this).val());
    simSettn.DlTau1 = tmp1.toFixed(0);
    selBroadFun(Dlorentz, 'Dlorentz');
    calcHom();
});

$("#tauBh_touch").TouchSpin({
    max: 500,
    min: 1,
    step: 1,
    initval: simSettn.DlTau2,
    decimals: 0,
    boostat: 5,
    maxboostedstep: 10,
    postfix: '[fs]',
    mousewheel: true
});

$("#tauBh_touch").on('touchspin.on.stopspin', function (e) {
    var tmp1 = Number($(this).val());
    simSettn.DlTau2 = tmp1.toFixed(0);
    selBroadFun(Dlorentz, 'Dlorentz');
    calcHom();
});

function selBroadFun(fun, funName){
    //fun:
    if ($("#pltHomConv").is(':checked')) {
        var kernel = makeFftKernel(fun);//use Lorentzian function in kernel
        var signal = padArray(inhomSpectr.plotArr);
        homSpectr.plotArr = unPad(fftConvo(signal, kernel));
    } else {
        broadFuns(funName);
    }
    hombr();
}

setJdosRadio();
setQwRadio();

$('input[type=radio][name=jdos]').change(function () {
    if (this.value == 'bulk') {
        simSettn.jdostype='bulk';
        $("#qwendetls").css('display','none');
        $('#qwdetails .hideshow').hide();
    } else if (this.value == 'qw') {
        simSettn.jdostype='qw';
        $("#qwendetls").css('display','block');
        $('#qwdetails .hideshow').hide();
    }
    setJdosRadio();
    makeJdos();       //density of states
    makeSommer();
    calcInhom();
});

$('input[type=radio][name=dirBut]').change(function () {
    //viewing direction: Parallel or perpendicular to quantum well
    $('#haideri').hide();
    $('#enhTE').prop('checked', true);
    $('#enhTM').prop('checked', false);
    simSettn.polarizat='TE';
    if (this.value == 'parallel') {
        $('#enhTE').attr('disabled',false);
        $('#enhTM').attr('disabled',false);
        simSettn.viewDir='parallel';
    } else if (this.value == 'perpend') {
        $('#enhTE').attr('disabled',true);
        $('#enhTM').attr('disabled',true);
        simSettn.viewDir='perpend';
    }
    makeSommer();
    calcInhom();
});

$('input[type=radio][name=enhBut]').change(function () {
    //Polarization selector:TE or TM
    if (this.value == 'TE') {
        simSettn.polarizat = 'TE';
        $('#haideri').hide();
    }
    else if (this.value == 'TM') {
        simSettn.polarizat = 'TM';
        $('#haideri').css('display','inline');
    }
    makeSommer();
    calcInhom();
});

/**
 * Function for graphing inhomog broadening
 * @function
 */
function inhombr() {
    var opts = plot.getOptions(); // get a reference to the options
    if (inhomSpectr.plotArr.length<inhomSpectr.numPoints) {
        alert('no data for plotting!');
        return; //exit plotting if no data
    }
    if (graphSettn.inhomLinlog=='log') {
        opts.yaxes[0].axisLabel='Log10  Intensity';
    }else{
        opts.yaxes[0].axisLabel='Rel. Intensity';
    }
    var newData = [
        {data:LinOrLogs(graphSettn.inhomLinlog,inhomSpectr.plotArr,plot),
            color: "#4d94ff", xaxis: 1, yaxis: 1, label: graphSettn.inhomLegend},
        {data:LinOrLogExp(inhomSpectr.experArr,graphSettn.inhomLinlog),
            color: "#ffb380", xaxis: 1, yaxis: 1, label: 'Measured'}
    ];
    plot.setData(newData);
    plot.setupGrid();
    plot.draw();
    var graphTitle1 = (simSettn.jdostype == 'qw') ? 'using qw-jdos' : 'using bulk-jdos';
    var canvas = plot.getCanvas();
    var context = canvas.getContext('2d');
    context.font = "12pt sans-serif";
    context.lineWidth = 2;
    context.strokeStyle = "#4d94ff"; //"rgba(35, 70, 237, .8)";
    context.strokeText(graphTitle1, 20, 15);
    context.strokeStyle ="#ffb380"; //"rgba(35, 70, 237, .8)";
    var widthi=canvas.scrollWidth;
    widthi=Math.ceil(widthi/2);
    context.strokeText(graphSettn.inhomFileN, widthi, 15);
    hombr();
}

/**
 * Function for graphing of homog broadening
 * @function
 */
function hombr() {
    var opts = plot2.getOptions(); // get a reference to the options
    var canvas = plot2.getCanvas();
    var context = canvas.getContext('2d');
    context.font = "12pt sans-serif";
    context.lineWidth = 2;
    var homLege='';
    if (graphSettn.homLinlog == 'log') {
        opts.yaxes[0].axisLabel = 'Log10  Intensity';
    } else {
        opts.yaxes[0].axisLabel = 'Rel. Intensity';
    }
    if ($("#pltNormalize").is(':checked')) {
        arrNormalize(homSpectr.plotArr);
    }
    if ($("#pltHomConv").is(':checked')) {
        homLege=graphSettn.inhomLegend+"*Lh";
    }else{//ei homog leviämisen laskemista vain funktio:
        homLege='';
        if ($('#pltLorentz').prop('checked')) {
            homLege="Lorentz";
        }
        if ($('#pltDlorentz').prop('checked')) {
            homLege = "Lorentz1 x Lorentz2";
        }
    }
    var newData=[];
    if (homSpectr.plotArr.length == homSpectr.numPoints && homSpectr.experArr.length>1) {
        //console.log('pitäis olla kolme käyrää experimentti mukana');
        newData = [
            {data: LinOrLogs(graphSettn.homLinlog, inhomSpectr.plotArr, plot2),
                color: "#4d94ff", xaxis: 1, yaxis: 1, label: graphSettn.inhomLegend},
            {data: LinOrLogs(graphSettn.homLinlog, homSpectr.plotArr, plot2),
                color: "#00cc00", xaxis: 1, yaxis: 1, label: homLege},
            {data: LinOrLogExp(homSpectr.experArr, graphSettn.homLinlog),
                color: "#ff6666", xaxis: 1, yaxis: 1, label: 'Measured'}
        ];
        plot2.setData(newData);
        plot2.setupGrid();
        plot2.draw();
        context.strokeStyle = "#4d94ff";
        context.strokeText('Inhom.Sim.', 20, 15);
        context.strokeStyle = "#00cc00"; //"rgba(35, 70, 237, .8)";
        context.strokeText('Homog.Sim', 120, 15);
        context.strokeStyle = "#ff6666"; //"rgba(35, 70, 237, .8)";
        var widthi = canvas.scrollWidth;
        widthi = Math.ceil(widthi / 2);
        context.strokeText(graphSettn.homFileN, widthi, 15);
        //console.log('homFileN: ',graphSettn.homFileN);
    }else if (homSpectr.plotArr.length == homSpectr.numPoints && homSpectr.experArr.length<1){
        //console.log('pitäis olla kaksi käyrää ei experimenttiä');
        newData = [
            {data: LinOrLogs(graphSettn.homLinlog,inhomSpectr.plotArr,plot2),
                color: "#4d94ff", xaxis: 1, yaxis: 1, label: graphSettn.inhomLegend},
            {data: LinOrLogs(graphSettn.homLinlog,homSpectr.plotArr,plot2),
                color: "#00cc00", xaxis: 1, yaxis: 1, label: homLege}
        ];
        plot2.setData(newData);
        plot2.setupGrid();
        plot2.draw();
        context.strokeStyle = "#4d94ff";
        context.strokeText('Inhom.Sim.', 20, 15);
        context.strokeStyle = "#00cc00"; //"rgba(35, 70, 237, .8)";
        context.strokeText('Homog.Sim', 120, 15);
    }else if (homSpectr.plotArr.length < homSpectr.numPoints && homSpectr.experArr.length>1){
        //console.log('pitäis olla kaksi käyrää, toisena experimentti');
        newData = [
            {data: LinOrLogs(graphSettn.homLinlog, inhomSpectr.plotArr, plot2),
                color: "#4d94ff", xaxis: 1, yaxis: 1, label: graphSettn.inhomLegend},
            {data: LinOrLogExp(homSpectr.experArr, graphSettn.homLinlog),
                color: "#ff6666", xaxis: 1, yaxis: 1, label: 'Measured'}
        ];
        plot2.setData(newData);
        plot2.setupGrid();
        plot2.draw();
        context.strokeStyle = "#4d94ff";
        context.strokeText('Inhom.Sim.', 20, 15);
        context.strokeStyle = "#ff6666"; //"rgba(35, 70, 237, .8)";
        var widthi = canvas.scrollWidth;
        widthi = Math.ceil(widthi / 2);
        context.strokeText(graphSettn.homFileN, widthi, 15);
    }else {
        //console.log('pitäis olla yksi käyrä: inhom simul');
        newData = [
            {data: LinOrLogs(graphSettn.homLinlog, inhomSpectr.plotArr, plot2),
                color: "#4d94ff", xaxis: 1,yaxis: 1,label: graphSettn.inhomLegend}
        ];
        plot2.setData(newData);
        plot2.setupGrid();
        plot2.draw();
        context.strokeStyle = "#4d94ff";
        context.strokeText('Inhom.Sim.', 20, 15);
    }
}

function makespArr(){
    var Start = parseFloat(simSettn.eVstart);//does not work without parseFloats
    var Stop = parseFloat(simSettn.eVstop);
    var n = parseInt(inhomSpectr.numPoints);
    var Del = (Stop - Start) / (n - 1);
    var helppi;
    inhomSpectr.eVarr=[];
    for (var i = 0; i < n; i++) {
        helppi = Start + i * Del;
        inhomSpectr.eVarr.push(helppi);
    }
}

function tune_Etr(Etr){
    var n=inhomSpectr.numPoints*(Etr-inhomSpectr.eVstart)/(inhomSpectr.eVstop-inhomSpectr.eVstart);
    var tempEtr=Math.round(n);
}

function makeSommer(){
    //does not work without parseFloats
    var n = parseInt(inhomSpectr.numPoints);
    var Etr=parseFloat(simSettn.eTr);
    var Eb=parseFloat(simSettn.exEb);
    var eVs;

    inhomSpectr.exenArr=[];
    for (var i = 0; i < n; i++) {
        eVs = parseFloat(inhomSpectr.eVarr[i]);
        inhomSpectr.exenArr.push(Sommerf(eVs,Etr,Eb));
    }
}

function Sommerf(E,Etr,Eb) {
    var Pi_alfa;
    var Se=0;
    if (simSettn.jdostype == 'bulk'){
        if (E > Etr){
            Pi_alfa = Math.PI * Math.sqrt(Eb / 1000 / (E - Etr));
            Se = 2 * Pi_alfa * Math.exp(Pi_alfa) / (Math.exp(Pi_alfa) -
                Math.exp(-Pi_alfa));
        }
    } else if (simSettn.jdostype == 'qw'){//jdos on qw
        if (simSettn.polarizat == 'TE'){
            if (E == Etr){
                Se = 2;
            }else if (E > Etr){
                Pi_alfa = Math.PI * Math.sqrt(Eb / 1000 / (E - Etr));
                Se = 2 * Math.exp(Pi_alfa) / (Math.exp(Pi_alfa) +
                    Math.exp(-Pi_alfa));
            }
            //return Se.toFixed(7);
        } else{
            //on TM polarisaatio:
            if (E > Etr){
                // use bias: simSettn.ex0 to prevent infinity at Etr
                Pi_alfa = Math.PI * Math.sqrt(Eb / 1000 / (E - Etr+simSettn.ex0/1000));
                Se = 2 * Math.exp(Pi_alfa) / (Math.exp(Pi_alfa) + Math.exp(-Pi_alfa));
                Se *=(1 + 4 * Eb/(E - Etr+simSettn.ex0/1000)/1000);
            }
        }
    }
    return Se.toFixed(7);
}

function makeBoltz(){
    var Etr = parseFloat(simSettn.eTr);
    var Temp = parseFloat(simSettn.kelvin);
    var n=parseInt(inhomSpectr.numPoints);
    var eVs;
    var m=0;
    inhomSpectr.fcvArr=[];
    for (var i = 0; i < n; i++) {
        eVs=parseFloat(inhomSpectr.eVarr[i]);
        if (Temp>0){//LED simulation:
            inhomSpectr.fcvArr.push(Boltzman(eVs,Etr,Temp));
        }else{// line emitter simulation:
            if (eVs<Etr || m>0){//no emission
                inhomSpectr.fcvArr.push(1E-30);
            }else {//emission only at one point, at or next to Etr
                inhomSpectr.fcvArr.push(1.0);
                m=1;
            }
        }
    }
}

function Boltzman(E, Etr, T) {
    var arvo = 0.0;
    if ((E - Etr) >= 0) {
        arvo = Math.exp(-eCha * (E - Etr) / (kBoltz * T));
    }
    return arvo;
}

function makeJdos() {
    inhomSpectr.jdosArr = [];
    var eVs;
    var num = parseInt(inhomSpectr.numPoints);
    var Etr = parseFloat(simSettn.eTr);
    var type = simSettn.jdostype;
    for (var i = 0; i < num; i++) {
        eVs = parseFloat(inhomSpectr.eVarr[i]);
        inhomSpectr.jdosArr.push(Jdos(Etr, eVs, type));
    }
}

/* functions for fft convolution
 *padArray pads values to array end making it equal in length with fft kernel
 */
function padArray(toPad){
    var padded=[];
    var toInsert;
    for (var i=0;i<fftN;i++){
        if (i<toPad.length) {
            toInsert=parseFloat(toPad[i]);
        }else{
            if (i<(fftN+toPad.length)/2){
                //pads empty cells half with previous value and half with zero
                //this eliminates artifacts at both spectrum ends
                toInsert=parseFloat(toPad[toPad.length-1]);
                //without this padding spectrum end bends down
            }else{
                toInsert=0;
                //without this padding spectrum beginning bends up
            }
        }
        padded.push(toInsert);
    }
    return padded;
}

/* Function for fft convolution
 *function unPad removes padded values from the convolved array making it equal in length
 * with original array before convolution
 */
function unPad(toUnpad){
    //console.log('unPadding');
    var unPadded = toUnpad.slice(0,inhomSpectr.numPoints);
    return unPadded;
}

/* Function for fft convolution
 * function makeFftKernel produces convolution kernel for FFT convolution
 */
function makeFftKernel(toKern){
    //toKern is zero centered broadening (filter) function with Energy as parameter
    //toKern: Urbach, symUrbach, Lorentz, Gaussian, DLorentz
    // Sech: funktiolle tätä funktiota ei käytetä. Kerneli tuotetaan FFT:llä
    var kerneli=new Array(fftN);
    var Del=(parseFloat(simSettn.eVstop)-parseFloat(simSettn.eVstart))/
        (parseInt(inhomSpectr.numPoints)-1);
    var sum=0;
    for (var i=0;i<fftN;i++){
        if (i<fftN/2){
            kerneli[i]=toKern(-i*Del);
        }else{
            kerneli[i]=toKern(-(i-fftN)*Del);
        }
        sum+=kerneli[i];
    }
    for (var i=0;i<fftN;i++){
        kerneli[i]/=sum;
    }
    return kerneli;
}

function fftConvo(signal,kernel){
    var convoRes=new Array(fftN);
    var kernelSum=0;
    var i=0;
    for (i=0;i<kernel.length;i++){
        //obtain normalization parameter:
        kernelSum+=kernel[i];
    }
    //apply FFT-script:
    convolveReal(signal, kernel, convoRes);
    for (i= 0;i<fftN;i++){//normalize result:
        convoRes[i]/=kernelSum;
        if (convoRes[i]<=0) convoRes[i]=1e-100;
    }
    return convoRes;
}

function Jdos(Etr,E,type){
    var arvo=0;
    if (E >= Etr) {
        if (type=='bulk'){
            arvo = Math.sqrt(E - Etr); //bulk materials
        }else{
            arvo=1;  //Heaviside step function for quantum wells
        }
    }
    return arvo.toFixed(7);
}

function makeLih() {
    //produces inhomog spectrum  at Ef
    //used only for function shape plotting
    var Ef = parseFloat(simSettn.eTr);
    var n = parseInt(inhomSpectr.numPoints);
    var eVs;
    inhomSpectr.Lih=[];
    for (var i = 0; i < n; i++) {
        eVs=parseFloat(inhomSpectr.eVarr[i]);
        if ($('#pltUrbach').prop('checked')){
            inhomSpectr.Lih.push(Urbach(Ef-eVs));
        } else if ($('#pltsUrbach').prop('checked')) {
            inhomSpectr.Lih.push(symUrbach(Ef-eVs));
        } else if ($('#pltGaussian').prop('checked')){
            inhomSpectr.Lih.push(Gaussian(Ef-eVs));
        }
    }
    if ($('#pltSech').prop('checked')) {
        var sechBroad=sechFun();// palauttaa kaksi vektoria reali ja imagi fourier muunnoksesta
        inhomSpectr.Lih=sechUnpad(sechBroad);
    }
}

function broadFuns(funk) {
    //plots a function with max value at Etr
    var Etr = parseFloat(simSettn.eTr);
    var Estart=parseFloat(simSettn.eVstart);
    var Estop=parseFloat(simSettn.eVstop);
    var n = parseInt(inhomSpectr.numPoints);
    var delE=(Estop-Estart)/(n-1);
    var helppi=0;
    var E;
    var max=-1;
    var hjelppi = [];
    for (var i= 0;i<n;i++) {
        E = Etr - (Estart + i * delE);//maximum will be at Etr
        switch (funk) {
            case 'Lorentz':
                helppi=Lorentz(E);
                break;
            case 'Dlorentz':
                helppi = Dlorentz(E);
                break;
        }
        max = (max > helppi) ? max : helppi; //get the maximum value
        hjelppi.push(helppi);
    }
    if (!max>0) max=1;
    homSpectr.plotArr=[];
    for (var i = 0; i < n; i++) {
        homSpectr.plotArr.push(hjelppi[i] / max); //Normalizes to unity peak
    }
}

function LinOrLog(graphed){
    var arr=[];
    var max=0;
    for (var i=0;i<inhomSpectr.numPoints;i++){
        var tempi=[];
        tempi.push(parseFloat(inhomSpectr.eVarr[i]));
        tempi.push(parseFloat(graphed[i]));
        arr.push(tempi);
        max=(max<tempi[1])? tempi[1]:max;
    }
    max=Math.ceil(Math.log10(max)); //autoscale log axis max
    var min=max-5;                  //autoscale log axis min
    if (graphSettn.inhomLinlog == 'log') {
        for (var i = 0; i < inhomSpectr.numPoints; i++) {
            arr[i][1] = (arr[i][1]>1E-6)? Math.log10(arr[i][1]):-6;
        }
        plot.getAxes().yaxis.options.min = min; //scale log axis min
        plot.getAxes().yaxis.options.max = max;  //scale log axis max
    }else{
        plot.getAxes().yaxis.options.min = null; //autoscale
        plot.getAxes().yaxis.options.max = null; //autoscale
    }
    return arr;
}

function LinOrLogs(linOlog,graphed,kuva) {
    //LinOrLogs:  joko lin tai log
    //graphed:    on piirrettävän käyrän vektori
    //kuva:       on joko plot (inhomog) tai plot2 (homog)
    var arr = [];
    var max = 0;
    var nPoints=inhomSpectr.numPoints;
    for (var i = 0; i < nPoints; i++) {
        var tempi = [];
        tempi.push(parseFloat(inhomSpectr.eVarr[i]));
        tempi.push(parseFloat(graphed[i]));
        arr.push(tempi);
        max = (max < tempi[1]) ? tempi[1] : max;
    }
    max = Math.ceil(Math.log10(max));   //autoscale log axis max
    var min = max - 5;                  //autoscale log axis min
    if (linOlog == 'log') {
        for (var i = 0; i < nPoints; i++) {
            arr[i][1] = (arr[i][1] > 1E-6) ? Math.log10(arr[i][1]) : -6;
        }
        kuva.getAxes().yaxis.options.min = min; //scale log axis min
        kuva.getAxes().yaxis.options.max = max;  //scale log axis max
    } else {
        kuva.getAxes().yaxis.options.min = 0; //autoscale
        kuva.getAxes().yaxis.options.max = null; //autoscale
    }
    return arr;
}

function LinOrLogExp(measArr,lineLoga) {
    //console.log('linorlog length: ',measArr.length);
    var arr=[];
    for (var i = 1; i < measArr.length; i++) {
        var tempi = [];
        tempi.push(measArr[i][0]);
        tempi.push(measArr[i][1]);
        arr.push(tempi);
    }
    if (lineLoga == 'log') {
        for (var i = 0; i < measArr.length-1; i++) {
            arr[i][1] = (arr[i][1] > 1E-6) ? Math.log10(arr[i][1]) : -6;
        }
    }
    return arr;
}

function Urbach(E) {
    var helppi = 0;
    var Eu = parseFloat(simSettn.eU);
    if (E >= 0) {
        helppi = Math.exp(-E * 1000 / Eu)*1000/Eu; //integrates to unity
    }
    return helppi;
}

function symUrbach(E) {
    var Eu = parseFloat(simSettn.eU);
    var helppi = Math.exp(-Math.abs(E) * 1000 / Eu)*500 / Eu; //integrates to unity
    return helppi;
}

function Lorentz(E){
    var tau = simSettn.LorTau * 1.0E-15; //to femtoseconds
    var helppi = eCha * hBar * tau / Math.PI / (hBar * hBar + tau * tau
        * E * E * eCha * eCha);
    return helppi;
}

function Dlorentz(E) {
    var tau1 = simSettn.DlTau1 * 1.0E-15; //in seconds
    var tau2 = simSettn.DlTau2 * 1.0E-15;
    var helppi = eCha * (tau1 + tau2) / Math.PI / hBar / (1 + tau1 * tau1 * E * E / hBar
        / hBar * eCha * eCha) / (1 + tau2 * tau2 * E * E / hBar / hBar * eCha * eCha);
    return helppi;
}

function Gaussian(E) {
    var sigma = simSettn.GauSig/1000; //meV to eV
    var helppi = (Math.exp(-E * E / 2 / sigma / sigma)) / sigma /
        Math.sqrt(2 * Math.PI);
    return helppi;
}

function sechFun() {
    var schN =simSettn.SechN;
    var schTau =simSettn.SechTau*1E-15; //Convert femtoseconds into seconds
    var E0=simSettn.eVstart;
    var E999=simSettn.eVstop;
    //fft time delta after padding:
    var eDelta=fftN*(E999-E0)/(inhomSpectr.numPoints-1)*eCha;
    // missä huomioitu paddingin tuoma lisäys spektrin pituuteen
    // h/deltaE=1/deltaf; Energy range determines frequency resolution,
    var tDelta=hPlanck/eDelta;
    //antaa saman kuin excelin sech-fun.xslx sheet
    // number of samples determines spectral (frequency) range
    tDelta=tDelta/schN/schTau; //for variable in: p(t) = sech^n(t/n/tau)
    // tehdään relaksaation aikafunktio p(t) prop. sech^n(t/n/tau)
    // mistä leviämisspectri sitten fft:llä
    var reali=[]; //fft:n reaaliosa
    var imagi=[]; //fft:n imaginääriosa
    var helppi;
    for (var i=0;i<(fftN);i++){
        var temp=(i-fftN/2)*tDelta;
        //raja jottei tule div. by zeroa:
        if(temp<Math.log(1E300) && temp>Math.log(1E-300)){
            helppi=Math.pow(2/(Math.exp(temp)+Math.exp(-temp)),schN); //sech(x)=1/cosh(x)
        }else {
            helppi=1E-300;
        }
        reali.push(helppi);
        imagi.push(0);
    }
    //tehdään fourier muunnos fft:llä
    transform(reali, imagi); //tässä on fft:n määräämä vektorien pituus (fftN)
    return [reali,imagi];
}

function sechUnpad(sechBroad){
    //tarvitaan redusoimaan fft:n tuottamat vektorit inhomSpectr.numPoints pituiseksi
    // vain leviämisspektrin piirtorutiinissa
    var Ef = parseFloat(simSettn.eTr);
    var n = parseInt(inhomSpectr.numPoints);
    var absVal=[];
    var TEMp;
    var positio = (Ef - simSettn.eVstart) / (simSettn.eVstop - simSettn.eVstart) * n;
    positio = Math.round(positio); //indexi johon sech spectrin huippu tulee
    for (var i = 0; i < n; i++) {
        var x = positio - i;
        if (x > 0) {
            TEMp=sechBroad[0][fftN - 1 - x] * sechBroad[0][fftN - 1 - x] + sechBroad[1][fftN - 1 - x] * sechBroad[1][fftN - 1 - x];
        } else {
            TEMp = sechBroad[0][-x] * sechBroad[0][-x] + sechBroad[1][-x] * sechBroad[1][-x];
        }
        absVal.push(Math.sqrt(TEMp));
    }
    return absVal;
}

// inhomogeneous plot Create a div for each axis
$.each(plot.getAxes(), function (i, axis) {
    if (!axis.show)
        return;
    var box = axis.box;
    $("<div class='axisTarget' style='position:absolute; left:" + box.left + "px; top:"
        + box.top +"px; width:" + box.width + "px; height:" + box.height + "px'></div>")
        .data("axis.direction", axis.direction)
        .data("axis.n", axis.n)
        .css({backgroundColor: "#f00", opacity: 0, cursor: "pointer"})
        .appendTo(plot.getPlaceholder())
        .hover(
            function () {//handler for hover in:
                $(this).css({opacity: 0.10});
                //-$("#clicked").text("You hovered 0.1 " + axis.direction + axis.n + "axis!");
                if (axis.direction=='y') {
                    showTooltip(box.left+box.width, box.top+box.height/2, 'Click to toggle lin/log');
                }else{
                    showTooltip(box.left+box.width/2, box.top-box.height, 'Click to edit graph');
                }
            },
            function () {//handler for hover out:
                $(this).css({opacity: 0});
                //-$("#clicked").text("You hovered 0 " + axis.direction + axis.n + "axis!");
                $("#tooltip").remove();
            }
        )
        .click(function () {
            if  (axis.direction=='y') {
                graphSettn.inhomLinlog = (graphSettn.inhomLinlog == 'lin') ? 'log' : 'lin';
                inhombr();
            }else{
                //click on x-axis: displays spectral settings selector
                inhomSettns_dialog()
                //$("#spRange").css('display','block');
                //$( "#paramDial" ).dialog('option', 'title', 'Spectral range in eV:');
                //$( "#paramDial" ).dialog( "open" );
                //$( "#settnDial" ).dialog( "close" );
            }
            //$("#clicked").text("You clicked the " + axis.direction + axis.n + "axis!");
        });
});

// inhomogeneous plot Create a div for each axis
$.each(plot2.getAxes(), function (i, axis) {
    if (!axis.show)
        return;
    var box = axis.box;
    $("<div class='axisTarget' style='position:absolute; left:" + box.left + "px; top:"
        + box.top + "px; width:" + box.width + "px; height:" + box.height + "px'></div>")
        .data("axis.direction", axis.direction)
        .data("axis.n", axis.n)
        .css({backgroundColor: "#f00", opacity: 0, cursor: "pointer"})
        .appendTo(plot2.getPlaceholder())
        .hover(
            function () {//handler for hover in:
                $(this).css({opacity: 0.10});
                //-$("#clicked").text("You hovered 0.1 " + axis.direction + axis.n + "axis!");
                if (axis.direction == 'y') {
                    showTooltip2(box.left + box.width, box.top + box.height / 2, 'Click to toggle lin/log');
                } else {
                    showTooltip2(box.left + box.width / 2, box.top - box.height, 'Click to edit graph');
                }
            },
            function () {//handler for hover out:
                $(this).css({opacity: 0});
                //-$("#clicked").text("You hovered 0 " + axis.direction + axis.n + "axis!");
                $("#tooltip").remove();
            }
        )
        .click(function () {
            if (axis.direction == 'y') {
                graphSettn.homLinlog = (graphSettn.homLinlog == 'lin') ? 'log' : 'lin';
                hombr();
            } else {
                //clicked on x-axis: display spectral range editor
                //$("#spRange").css('display', 'block');
                //-$("#spWhat").css('display','block');
                //$("#settnDial").dialog("open");
                homogSettns_dialog();
            }
            //$("#clicked").text("You clicked the " + axis.direction + axis.n + "axis!");
        });
});

inhombr();

$("#ph1_inhomog").mouseleave(function() {
    $("#tooltip").remove();
});
$("#ph2_homog").mouseleave(function () {
    $("#tooltip").remove();
});

$("#ph1_inhomog").bind("plothover", function (event, pos, item) {
    //$("#clicked").text("You hovered at: " + pos.x + ','+ pos.y+'event.target: '+event.target);
    showTooltip(40, 30, 'DblClick to edit graph');
    //-alert("You clicked at " + pos.x + ", " + pos.y);
    // axis coordinates for other axes, if present, are in pos.x2, pos.x3, ...
    // if you need global screen coordinates, they are pos.pageX, pos.pageY
    if (item) {
        var point='E: '+(pos.x).toFixed(4)+' val: '+ (pos.y).toFixed(4);
        showTooltip(40, 30, point);
        //highlight(item.series, item.datapoint);
        //$("#clicked").text("You hovered at: " + item.series + ',' +item.datapoint);
        //alert("You clicked a point!");
    }
});

$("#ph2_homog").bind("plothover", function (event, pos, item) {
    //$("#clicked").text("You hovered at: " + pos.x + ','+ pos.y+'event.target: '+event.target);
    showTooltip2(40, 30, 'DblClick to edit graph');
    //-alert("You clicked at " + pos.x + ", " + pos.y);
    // axis coordinates for other axes, if present, are in pos.x2, pos.x3, ...
    // if you need global screen coordinates, they are pos.pageX, pos.pageY
    if (item) {
        var point = 'E: ' + (pos.x).toFixed(4) + ' val: ' + (pos.y).toFixed(4);
        showTooltip2(100, 30, point);
        //highlight(item.series, item.datapoint);
        //$("#clicked").text("You hovered at: " + item.series + ',' +item.datapoint);
        //alert("You clicked a point!");
    }
});

function showTooltip(x, y, contents) {
    //console.log('showing tooltip: ',x,' ',y, ' ',contents);
    if ($("#tooltip").length > 0) {
        $("#tooltip").remove();
    }
    $('<div id="tooltip">' + contents + '</div>').css({
        position: 'absolute', display: 'none', top: y + 5, left: x + 5,
        border: '1px solid #fdd', padding: '2px', 'background-color': '#fee', opacity: 0.80
    }).appendTo("#ph1_inhomog").fadeIn(200);
}

function showTooltip2(x, y, contents) {
    //console.log('showing tooltip: ',x,' ',y, ' ',contents);
    if ($("#tooltip").length > 0) {
        $("#tooltip").remove();
    }
    $('<div id="tooltip">' + contents + '</div>').css({
        position: 'absolute', display: 'none', top: y + 5, left: x + 5,
        border: '1px solid #fdd', padding: '2px', 'background-color': '#fee', opacity: 0.80
    }).appendTo("#ph2_homog").fadeIn(200);
}

function setChkboxes(){
    $('#pltEpsilon').prop('checked', inhomSpectr.inPlot.eV);
    $('#pltJdos').prop('checked', inhomSpectr.inPlot.jdos);
    $('#pltSommerf').prop('checked', inhomSpectr.inPlot.Se);
    $('#pltFcv').prop('checked', inhomSpectr.inPlot.fcv);
    $('#pltUrbach').prop('checked', inhomSpectr.inPlot.Lurb);
    $('#pltsUrbach').prop('checked', inhomSpectr.inPlot.Lsurb);
    $('#pltGaussian').prop('checked', inhomSpectr.inPlot.Lgaus);
    $('#pltSech').prop('checked', inhomSpectr.inPlot.Lsech);
}

function setLegend(){
    graphSettn.inhomLegend = '';
    var dotti = '\u00B7'; //multiplication dot
    var regexi = /^\u00B7+/;
    if (inhomSpectr.inPlot.eV) graphSettn.inhomLegend = 'E';
    if (inhomSpectr.inPlot.jdos) graphSettn.inhomLegend += dotti + 'Jdos';
    if (inhomSpectr.inPlot.Se) graphSettn.inhomLegend += dotti + 'Se';
    if (inhomSpectr.inPlot.fcv) graphSettn.inhomLegend += dotti + 'Fcv';
    if ((inhomSpectr.inPlot.Lurb || inhomSpectr.inPlot.Lsurb) &&
        !inhomSpectr.inPlot.convo) graphSettn.inhomLegend='Lih';
    graphSettn.inhomLegend.trim();
    //remove leading multiplication dot(s):
    graphSettn.inhomLegend = graphSettn.inhomLegend.replace(regexi,'');
    if (inhomSpectr.inPlot.convo){
        graphSettn.inhomLegend = '(' + graphSettn.inhomLegend + ')*Lih';
    }
}

function multPlotted(arra){
    num=inhomSpectr.numPoints;
    if (inhomSpectr.plotArr.length<1){
        for (var i=0;i<num;i++) {
            inhomSpectr.plotArr.push(arra[i]);
        }
    }else{
        for (var j=0;j<num;j++) {
            inhomSpectr.plotArr[j]=arra[j]*inhomSpectr.plotArr[j];
        }
    }
}

function calcInhom(){
    inhomSpectr.plotArr=[];
    //valinnoista tehdään piirrettävä array:
    if (inhomSpectr.inPlot.eV){
        multPlotted(inhomSpectr.eVarr);
    }
    if (inhomSpectr.inPlot.jdos) {
        multPlotted(inhomSpectr.jdosArr);
    }
    if (inhomSpectr.inPlot.Se) {
        multPlotted(inhomSpectr.exenArr);
    }
    if (inhomSpectr.inPlot.fcv) {
        multPlotted(inhomSpectr.fcvArr);
    }//piirrettävä funktio saatiin valmiiksi konvoluutiota tai piirtoa varten
    //jos mitään ollut valittuna leviämisfunktion kanssa, piirretään vain leviämisfunktio:
    if (!inhomSpectr.inPlot.convo && (inhomSpectr.inPlot.Lurb || inhomSpectr.inPlot.Lsurb
        || inhomSpectr.inPlot.Lgaus || inhomSpectr.inPlot.Lsech)) {
        //siis ei konvoluutiota vain joku levenemisfunktioista piirtoon
        makeLih(); //laskee valitun levimisfunktion Etr kohtaan
        inhomSpectr.plotArr=[]; //tyhjennys
        //console.log('Lih piirto');
        multPlotted(inhomSpectr.Lih); //täyttö vain leviämisfunktio
    }
    if (inhomSpectr.inPlot.convo) {
        //valittu leviämisfunktio ja 'plotting selectorista' itemi(t):
        //vuorossa konvoluution laskeminen:
        var kernel=[]; //nollataan konvoluutiokernel
        var signal=padArray(inhomSpectr.plotArr); //tehdään konvolutoitavasta fftN pituinen
        if (inhomSpectr.inPlot.Lsurb) {//symmetrinen Urbach
            kernel = makeFftKernel(symUrbach); //symUrbach konvoluution kerneliksi
        } else if (inhomSpectr.inPlot.Lurb) {//asymmetric urbach
            kernel = makeFftKernel(Urbach); //Urbach konvoluution kerneliksi
        } else if (inhomSpectr.inPlot.Lgaus){//gaussian broadening
            kernel = makeFftKernel(Gaussian); //gaussin funktio konvoluution kerneliksi
        } else if (inhomSpectr.inPlot.Lsech){//sech functio laskettu fft:llä,
            // eroava  kernelin laskenta:
            var ckernel=sechFun(); //saadaan 2 (fftN-pituista) vektoria: ckernel[0] and ckernel[1]
            for (var I=0;I<fftN;I++){
                //kompleksiluvun abs arvot kerneliin
                kernel.push(Math.sqrt(ckernel[0][I]*ckernel[0][I]+ckernel[1][I]*ckernel[1][I]));
            }
        }
        inhomSpectr.plotArr=unPad(fftConvo(signal,kernel));//konvoluutio ja unpadding
    }
    if ($("#pltNormalize").is(':checked')) {
        arrNormalize(inhomSpectr.plotArr);
    }
    inhombr();
    if ($('#pltHomConv').prop('checked')) {
        calcHom();
        hombr();
    }
}

/*function normalizes convolution max value to 1
 *
 */
function arrNormalize(arr){
    var n=arr.length;
    var max = 0;
    var i;
    for (i = 0; i < n; i++) {
        max = (arr[i] > max) ? max = arr[i] : max;
    }
    for (i = 0; i < n; i++) {
        arr[i] = arr[i] / max;
    }
}

$("#pltUrbach, #pltsUrbach, #pltGaussian, #pltSech").click(function(){
    //checkbox selections for inhomogeneous broadening
    if ($(this).attr('id') == 'pltUrbach' && $(this).prop('checked')==true) {
        $('#pltsUrbach, #pltGaussian, #pltSech').prop('checked', false);//uncheck other broadenings:
    }
    if ($(this).attr('id') == 'pltsUrbach' && $(this).prop('checked')==true) {
        $('#pltUrbach, #pltGaussian, #pltSech').prop('checked', false);//uncheck other broadenings:
    }
    if ($(this).attr('id') == 'pltGaussian' && $(this).prop('checked') == true) {
        $('#pltUrbach, #pltsUrbach, #pltSech').prop('checked', false);//uncheck other broadenings:
    }
    if ($(this).attr('id') == 'pltSech' && $(this).prop('checked') == true) {
        $('#pltUrbach, #pltGaussian, #pltsUrbach').prop('checked', false);//uncheck other broadenings:
    }
    setLegend();
    calcInhom();
});

$("#pltHomConv").click(function(){
    if ($(this).is(':checked')){
        homSpectr.inPlot.convo=true;
    }else{
        homSpectr.inPlot.convo=false;
    }
});

//response inhomog checkbox change events:
$("#pltEpsilon, #pltJdos, #pltSommerf, #pltFcv, #pltUrbach, #pltsUrbach, #pltGaussian, #pltSech").change(function () {
    inhomSpectr.inPlot.eV = ($('#pltEpsilon').prop('checked'))? true : false;
    inhomSpectr.inPlot.jdos = ($('#pltJdos').prop('checked'))? true : false;
    inhomSpectr.inPlot.Se = ($('#pltSommerf').prop('checked')) ? true : false;
    inhomSpectr.inPlot.fcv = ($('#pltFcv').prop('checked')) ? true : false;
    inhomSpectr.inPlot.Lurb = ($('#pltUrbach').prop('checked')) ? true : false;
    inhomSpectr.inPlot.Lsurb = ($('#pltsUrbach').prop('checked')) ? true : false;
    inhomSpectr.inPlot.Lgaus = ($('#pltGaussian').prop('checked')) ? true : false;
    inhomSpectr.inPlot.Lsech = ($('#pltSech').prop('checked')) ? true : false;
    inhomSpectr.inPlot.convo = false;
    if ((inhomSpectr.inPlot.eV || inhomSpectr.inPlot.jdos || inhomSpectr.inPlot.Se
        || inhomSpectr.inPlot.fcv) && (inhomSpectr.inPlot.Lurb==true || inhomSpectr.inPlot.Lsurb==true
        || inhomSpectr.inPlot.Lgaus==true || inhomSpectr.inPlot.Lsech==true)) {
        inhomSpectr.inPlot.convo = true;
    }
    //console.log('klikattu: ',this.id,' checked: ',$(this).is(':checked'));
    //makeJdos();       //density of states
    setLegend();
    calcInhom();
});

//response to homog checkbox change events:
$("#pltLorentz, #pltDlorentz").change(function () {
    //console.log($(this).attr('id'),' changed', $(this).prop('checked'));
    var poksi = $(this).is(':checked'); //tai: var poksi=$(this).prop('checked'));
    //First uncheck both checkboxes:
    $('#pltLorentz, #pltDlorentz').prop('checked', false);
    $(this).prop('checked', poksi); //sets only clicked chkbox back to chosen state:
    if (!$(this).is(':checked')) {//valinnat ovat pois päältä
        homSpectr.plotArr = [];
    } else {
        switch ($(this).attr('id')) {
            case 'pltLorentz':
                if ($("#pltHomConv").is(':checked')) {//convolution plot:
                    var kernel = makeFftKernel(Lorentz);//use Lorentzian function in kernel
                    var signal = padArray(inhomSpectr.plotArr);
                    homSpectr.plotArr = unPad(fftConvo(signal, kernel));
                } else {//only plot function
                    broadFuns('Lorentz');
                }
                break;
            case 'pltDlorentz':
                if ($("#pltHomConv").is(':checked')) {//calculate and plot convolution:
                    var kernel = makeFftKernel(Dlorentz);//use DLorentzian function in kernel
                    var signal = padArray(inhomSpectr.plotArr);
                    homSpectr.plotArr = unPad(fftConvo(signal, kernel));
                    //arrNormalize(homSpectr.plotArr);
                } else {
                    broadFuns('Dlorentz');
                }
                break;
        }
    }
    hombr(); //piirtää käyrän
});

$("#pltHomConv").click(function () {
    homSpectr.inPlot.convo = ($(this).is(':checked'));
});

$("#pltHomConv").change(function () {
    if (!($("#pltDlorentz").is(':checked')) && !($("#pltLorentz").is(':checked'))) {
        homSpectr.plotArr = []; //kumpikaan leviämisfunktio ei ole valittuna
    } else {//jompikumpi levenemisistä on valittuna
        if (homSpectr.inPlot.convo==true) {//konvoluutio on valittuna
            if ($("#pltLorentz").is(':checked')) {
                var kernel = makeFftKernel(Lorentz);//use Lorentzian function in kernel
            } else {
                var kernel = makeFftKernel(Dlorentz);//use Dlorentzian function in kernel
            }
            var signal = padArray(inhomSpectr.plotArr);
            homSpectr.plotArr = unPad(fftConvo(signal, kernel));
        } else {//ei konvoluutiota vain toinen funktioista piirretään
            if ($('#pltLorentz').is(':checked')) {
                broadFuns('Lorentz');
            } else if ($('#pltDlorentz').is(':checked')){
                broadFuns('Dlorentz');
            }
        }
    }
    hombr();
});

$("#pltNormalize").change(function () {
    //calcHom();
    //hombr();
    if ($(this).is(':checked')) {
        arrNormalize(inhomSpectr.plotArr);
        inhombr();
    }else{
        calcInhom();
    }
});

function calcHom(){
    //check if any of the broadening functions is checked
    var broadSel = $('#pltLorentz').is(':checked');
    broadSel = broadSel || $('#pltDlorentz').is(':checked');
    if ($("#pltHomConv").is(':checked') && broadSel) {
        //convolution calculated and plotted
        if ($('#pltLorentz').is(':checked')) {
            //use Lorentzian function in kernel
            var kernel = makeFftKernel(Lorentz);
            var signal = padArray(inhomSpectr.plotArr);
        } else if ($('#pltDlorentz').is(':checked')) {
            //use Dlorentz in kernel
            var kernel = makeFftKernel(Dlorentz);
            var signal = padArray(inhomSpectr.plotArr);
        }
        homSpectr.plotArr = unPad(fftConvo(signal, kernel));
        //hombr();
    } else {
        //convolution not calculated only broadening function plotted
        if ($('#pltLorentz').is(':checked')) {
            broadFuns('Lorentz');
        } else if ($('#pltDlorentz').is(':checked')) {
            broadFuns('Dlorentz');
        }
    }
    hombr();
}

function makeExpArrs(){
    //treat experimental results for spectral range change;
    var m = inhomSpectr.experPlot.length; //data read from file
    var n = homSpectr.experPlot.length; //data read from file
    var k = inhomSpectr.numPoints - 1;
    inhomSpectr.experArr = [];
    homSpectr.experArr = [];
    for (var j = 0; j < m; j++) {
        var tmp1 = [];
        if (m > 0 && inhomSpectr.experPlot[j][0] > inhomSpectr.eVarr[0] && inhomSpectr.experPlot[j][0] < inhomSpectr.eVarr[k]) {
            tmp1.push(inhomSpectr.experPlot[j][0]);
            tmp1.push(inhomSpectr.experPlot[j][1]);
            inhomSpectr.experArr.push(tmp1);
        }
    }
    for (var i=0;i<n;i++){
        var tmp2 = [];
        if (n > 0 && homSpectr.experPlot[i][0] > inhomSpectr.eVarr[0] && homSpectr.experPlot[i][0] < inhomSpectr.eVarr[k]) {
            tmp2.push(homSpectr.experPlot[i][0]);
            tmp2.push(homSpectr.experPlot[i][1]);
            homSpectr.experArr.push(tmp2);
        }
    }
    //console.log('inhomSpectr.experArr.length: ',inhomSpectr.experArr.length);
    //console.log('homSpectr.experArr.length: ',homSpectr.experArr.length);
}

$("#rangeok, #evetok, #jdosok, #exenhaok, #urbachok, #sUrbachok, #whatok").click(function(){
    var tmp1;
    var tmp2;
    switch ($(this).attr('id')){
        case 'rangeok':
            tmp1 = Number($("#eVstart_touch").val());
            tmp2 = Number($("#eVstop_touch").val());
            if (tmp2-tmp1>0.1){
                simSettn.eVstart = tmp1.toFixed(3);
                simSettn.eVstop = tmp2.toFixed(3);
            }
            if (Math.abs(tmp1-tmp2)>=0.1) {
                if (tmp1>tmp2){//annettu väärin päin
                    simSettn.eVstart = tmp2.toFixed(3);
                    simSettn.eVstop = tmp1.toFixed(3);
                }else{//syötetty oikein päin
                    simSettn.eVstart = tmp1.toFixed(3);
                    simSettn.eVstop = tmp2.toFixed(3);
                }
            }else{//arvot liian lähekkäin, korjataan
                if ((tmp2 > tmp1) && tmp2 > 0.1) {
                    simSettn.eVstop = tmp2.toFixed(3);
                    simSettn.eVstart = (tmp2 - 0.1).toFixed(3);
                }else{
                    simSettn.eVstart = tmp1.toFixed(3);
                    simSettn.eVstop = (tmp1 + 0.1).toFixed(3);
                }
            }
            makespArr();       //recreate spectral array
            makeExpArrs();     //recreate experimental array
            makeJdos();
            makeBoltz();       //recreate Boltzmann distribution
            makeSommer();
            calcInhom();
            calcHom();
            $("#spRange").css('display','none');
            $("#paramDial").dialog('close');
            break;
        case 'evetok':
            //jdos, exiton and Boltzmann changes updated alrady after spinner events
            //but for the keyboard input option need to be also here
            tmp1 = Number($("#Et_touch").val());
            simSettn.eTr = tmp1.toFixed(3);
            tmp1 = Number($("#TemK_touch").val());
            simSettn.kelvin = tmp1.toFixed(3);
            makeJdos();       //density of states changes with Etr
            makeBoltz();      //Boltzmann distribution changes with Etr
            makeSommer();     //exciton enhanchement also
            calcInhom();
            calcHom();
            $("#eg_et").css('display', 'none');
            $("#paramDial").dialog('close');
            break;
        case 'jdosok':
            $("#spJdos").css('display','none');
            $("#paramDial").dialog('close');
            makeJdos(); //exiton changes updated in jdos radio button change event
            calcInhom();
            calcHom();
            break;
        case 'exenhaok':
            tmp1 = Number($("#eVbind_touch").val());
            simSettn.exEb = tmp1.toFixed(3);
            tmp1 = Number($("#ex0_touch").val());
            simSettn.ex0 = tmp1.toFixed(3);
            $("#exEnha").css('display', 'none');
            $("#paramDial").dialog('close');
            makeSommer();
            calcInhom();
            calcHom();
            break;
        case 'urbachok':
        case 'sUrbachok':
            tmp1 = Number($("#eveu_touch").val());
            simSettn.eU = tmp1.toFixed(3);
            $("#spUrbach").css('display', 'none');
            $("#urbachAsymm,#urbachSymm").css('display', 'none');
            $("#paramDial").dialog('close');
            calcInhom();
            calcHom();
            break;
        case 'whatok':
            break;
    }
    $('#settnDial').dialog('close');
    $('#paramDial').dialog('close');
});

$("#lorentzok").click(function(){
    $("#spLorentz").css('display','none');
    $("#paramDial").dialog('close');
    //selBroadFun(Lorentz, 'Lorentz');
    calcHom();
});

$("#dlorentzok").click(function () {
    $("#spDlorentz").css('display', 'none');
    $("#paramDial").dialog('close');
    //selBroadFun(Lorentz, 'Lorentz');
    calcHom();
});

$("#gaussianok").click(function () {
    $("#spGaussian").css('display', 'none');
    $("#paramDial").dialog('close');
    calcInhom();
    calcHom();
});

$("#sechok").click(function () {
    $("#spSech").css('display', 'none');
    $("#paramDial").dialog('close');
    calcInhom();
    calcHom();
});

$('#hrefEpsilon').click(function(){
    $("#settnDial").dialog("close");
    $("#spRange").css('display','block');
    //$("#rangeok").show();
    $("#paramDial").dialog('option', 'title', 'Spectral range in eV:');
    $("#paramDial").dialog("open");
    setJdosRadio();
});

$('#hrefJdos').click(function () {
    $("#spJdos").css('display','block');
    $("#settnDial").dialog("close");
    $("#paramDial").dialog('option', 'title', 'Joint density of states (JDOS):');
    $("#paramDial").dialog("open");
    setJdosRadio();
});

$('#hrefSommerf').click(function(){
    $("#exEnha").css('display','block');
    $("#settnDial").dialog("close");
    if (simSettn.jdostype=='bulk'){
        $("#paramDial").dialog('option', 'title', 'Exciton enhancement' +
            ' for bulk (3D-exciton model):');
    }else{
        $("#paramDial").dialog('option', 'title', 'Exciton enhancement' +
            ' for QW-material (2D-exciton model):');
    }
    $("#paramDial").dialog("open");
    setJdosRadio();
    setQwRadio();
});

$('#hrefTransito').click(function () {
    //click on transition energy title
    $("#eg_et").css('display','block');
    $("#settnDial").dialog("close");
    $("#paramDial").dialog('option','title','Parameters for Boltzmann distribution:');
    $("#paramDial").dialog('open');
    setJdosRadio();
    setQwRadio();
});

$('#hrefUrbach').click(function() {
    $("#spUrbach, #spLorentz, #spSurbach, #spDlorentz, #spGaussian, #spSech").css('display', 'none');
    $("#paramDial").dialog('option','title','Parameters for asymmetric Urbach tail inhomogeneous broadening:');
    $("#urbachSymm").css('display','none');
    $("#urbachAsymm").css('display','block');
    $("#settnDial").dialog("close");
    $("#spUrbach").css('display', 'block');
    $("#paramDial").dialog("open");
});

$('#hrefsUrbach').click(function () {
    $("#spUrbach, #spLorentz, #spSurbach, #spDlorentz, #spGaussian, #spSech").css('display', 'none');
    $("#paramDial").dialog('option','title','Parameters for symmetric Urbach tail inhomogeneous broadening:');
    $("#settnDial").dialog("close");
    $("#urbachAsymm").css('display','none');
    $("#urbachSymm").css('display','block');
    $("#spUrbach").css('display', 'block');
    $("#paramDial").dialog("open");
});

$('#hrefLorentz').click(function () {
    $("#spUrbach, #spLorentz, #spSurbach, #spDlorentz, #spGaussian, #spSech").css('display', 'none');
    $("#settnDial").dialog("close");
    $("#spLorentz").css('display', 'block');
    $("#paramDial").dialog('option', 'title', 'Parameters for Lorentzian broadening function:');
    $("#paramDial").dialog("open");
});

$('#hrefdLorentz').click(function () {
    $("#spUrbach, #spLorentz, #spSurbach, #spDlorentz, #spGaussian, #spSech").css('display', 'none');
    $("#settnDial").dialog("close");
    $("#spDlorentz").css('display', 'block');
    $("#paramDial").dialog('option', 'title', 'Parameters for LxL, (product of two Lorentzians) broadening function:');
    $("#paramDial").dialog("open");
});

$('#hrefGaussian').click(function () {
    $("#spUrbach, #spLorentz, #spSurbach, #spDlorentz, #spGaussian, #spSech").css('display', 'none');
    $("#settnDial").dialog("close");
    $("#spGaussian").css('display', 'block');
    $("#paramDial").dialog('option', 'title', 'Parameters for Gaussian inhomogeneous broadening:');
    $("#paramDial").dialog("open");
});

$('#hrefSech').click(function () {
    $("#spUrbach, #spLorentz, #spSurbach, #spDlorentz, #spGaussian, #spSech").css('display', 'none');
    $("#settnDial").dialog("close");
    $("#paramDial").dialog('option', 'title', 'Parameters for broadening from sech^n time relaxation:');
    $("#spSech").css('display', 'block');
    $("#paramDial").dialog("open");
});


/* Function for operations after local emission file selection has changed
 *  Handler for reading local emission data files
 */
$("#emisLocFiles").on("change", function () {
    var selected_file = $('#emisLocFiles').get(0).files[0];
    if (!selected_file) return;
    var dialoogi= $('#settnDial').dialog('option','title');
    if (dialoogi == 'Inhomogeneous spectrum') {
        if ($('#radioMeas').is(':checked')) {
            // measured spectrum array read to the inhomog plot
            // with eV and intensity values , one pair per row
            // after async read data processed in 'gotInhomFile' callback
            graphSettn.inhomFileN= selected_file.name;
            ReadLocFle(selected_file, gotInhomFile);
        } else {
            // reads simulation parameters to inhomog plot
            // after async read data processed in 'gotInhomSim' callback
            ReadLocFle(selected_file, gotInhomSim);
        }
    } else if (dialoogi == 'Homogeneous spectrum') {
        if ($('#radioMeas').is(':checked')) {
            // reads measured spectrum array to the homog plot
            // with eV and intensity values , one pair per row
            // after async read data processed in 'gotHomogFile' callback
            graphSettn.homFileN=selected_file.name;
            ReadLocFle(selected_file, gotHomogFile);
        } else {
            //reads simuation parameters to the homog plot
            // after async read data processed in 'gotHomogSim' callback
            ReadLocFle(selected_file, gotInhomSim);
        }
    }
});

$("#footer").prepend("Flot graph" + $.plot.version + " &ndash; ");

/**
 * Function for callback operation after reading local emission spectrum file
 * @function
 * @fileCont has the read text content
 */
function gotInhomFile(fileCont) {
    //callback after successfully reading a local emission file
    //console.log('filecont: ',fileCont);
    try {
        //console.log('filecont: ',filecont);
        inhomSpectr.experArr = splitToArr(fileCont);
        inhomSpectr.experPlot = splitToArr(fileCont);
        var descr = inhomSpectr.experPlot[0][2];
        descr = descr.replace(/"/g, "");
        $('#inhDescLbl').css('display', 'inline');
        $('#inhDesc').css('display', 'inline');
        $('#inhDesc').html(descr);
        inhombr();
    }
    catch(err) {
        alert('Error in selected inhomogeneous emission data');
    }
}

/**
 * Function for callback operation after reading local emission spectrum file
 * @function
 * @fileCont has the read text content
 */
function gotHomogFile(fileCont) {
    //callback after successfully reading a local emission file
    try {
        homSpectr.experArr = splitToArr(fileCont);
        homSpectr.experPlot = splitToArr(fileCont);
        var descr = homSpectr.experPlot[0][2];
        descr = descr.replace(/"/g, "");
        $('#homDescLbl').css('display', 'inline');
        $('#homDesc').css('display', 'inline');
        $('#homDesc').html(descr);
        hombr();
    }
    catch(err){
        alert('Error in selected homogeneous emission data');
    }
}


function gotInhomSim(fileCont){
    //Header: (E)x(qw-jdos)x(exp[(E-Etr)/kT])x(qw-ex.Enh)*(Symm.Urbach-brdng)
    var indeX1=fileCont.indexOf('Header:');
    var indeX2=fileCont.indexOf('Parameters:');
    try {
        if (indeX1 < 0 || indeX2 < 0) {
            throw "Error in simulation settings file";
            //return;
        }
        var prms = fileCont.substring(indeX2 + 11, (fileCont.length));
        prms = prms.trim();
        var headeri = fileCont.substring(indeX1 + 7, (fileCont.length));
        headeri = headeri.trim();
        setSettings(prms);
        console.log('gotinhomsim, simSettn.eTr: ',simSettn.eTr);
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
        hombr();
    }
    catch(err){
        alert('Error in processing simulation settings file');
    }
}

/**
 * Function for setting plotting options after reading local emission spectrum file
 * @function
 * @header {string} receives the selected options
 */
function setSelections(header){
    //console.log('header: ',header);
    //(E)x(qw-jdos)x(exp[(E-Etr)/kT])x(qw-ex.Enh)*(Symm.Urbach-brdng)
    inhomSpectr.inPlot.eV=(header.indexOf('(E)')>=0)? true:false; //photon energy
    inhomSpectr.inPlot.jdos= (header.indexOf('(qw-jdos)')>=0)? true: false; //density of states
    inhomSpectr.inPlot.fcv= (header.indexOf('(exp[(E-Etr)/kT])')>= 0)?  true: false; //state occupancy
    inhomSpectr.inPlot.Se= (header.indexOf('(qw-ex.Enh)') >= 0)? true: false; //exiton enhancement
    inhomSpectr.inPlot.convo = false; //inhomog convolution
    inhomSpectr.inPlot.Lurb = false;  //single sided urbach
    inhomSpectr.inPlot.Lsurb = false; //two sided urbach
    inhomSpectr.inPlot.Lgaus = false; //Gaussian distrib
    inhomSpectr.inPlot.Lsech = false; //sech^n(t/tau/n) relaxation function broadening
    homSpectr.inPlot.convo=false;
    $('#pltHomConv').prop('checked',false);
    $('#pltDlorentz').prop('checked',false);
    $('#pltLorentz').prop('checked',false);
    //if(document.getElementById('box').checked)
    if (header.indexOf('*(Asym.Urbach-brdng)') >= 0) {
        inhomSpectr.inPlot.convo = true;
        inhomSpectr.inPlot.Lurb = true;
    }
    if (header.indexOf('*(Symm.Urbach-brdng)') >= 0){
        inhomSpectr.inPlot.convo = true;
        inhomSpectr.inPlot.Lsurb = true;
    }
    if (header.indexOf('*(Gaussian-brdng)') >= 0) {
        inhomSpectr.inPlot.convo = true;
        inhomSpectr.inPlot.Lgaus = true;
    }
    if (header.indexOf('*(Sech^n(t/tau/n)-brdng)') >= 0) {
        inhomSpectr.inPlot.convo = true;
        inhomSpectr.inPlot.Lsech = true;
    }
    if (header.indexOf('*(Lorentzian brdng)') >= 0) {
        //console.log('*(Lorentzian brdng)',header.indexOf('*(Lorentzian brdng)')) ;
        homSpectr.inPlot.convo = true;
        $('#pltHomConv').prop('checked', true);
        $('#pltLorentz').prop('checked', true);
    }
    if(header.indexOf('*(Lorentzian1 x Lorentzian2 brdng)') >= 0){
        //console.log('*(Lorentzian1 x Lorentzian2 brdng)',header.indexOf('*(Lorentzian1 x Lorentzian2 brdng)')) ;
        homSpectr.inPlot.convo=true;
        $('#pltHomConv').prop('checked',true);
        $('#pltDlorentz').prop('checked',true);
    }
}

/**
 * Function for setting calculation parameters after reading local settings file
 * @function
 * @parSettn {string} receives the selected options
 */
function setSettings(parSettns) {
    //parSettns: {"Estart":1.3,"Estop":1.7,"Etr":1.4,"jdos":"qw",
    // "exiton":{"Eb_meV":5,"type":"QW-2D","viewDir":"parallel","polarizat":"TE"},
    // "Boltzmann":{"Epeak_eV":1.4,"Temp_K":293},"InhmgBrdng":{"type":"SymmUrbach","Eu_meV":8}}
    var objSettns=JSON.parse(parSettns);
    simSettn.eVstart=objSettns.Estart;
    $('#eVstart_touch').val(simSettn.eVstart);
    simSettn.eVstop=objSettns.Estop;
    $("#eVstop_touch").val(simSettn.eVstop);
    makespArr();
    simSettn.eTr = objSettns.Boltzmann.Epeak_eV;
    $('#Et_touch').val(simSettn.eTr);
    simSettn.jdostype = (objSettns.jdos && objSettns.jdos=='qw')?  'qw' : 'bulk';
    setJdosRadio();
    if (objSettns.exiton) {
        simSettn.exEb= objSettns.exiton.Eb_meV;
        $("#eVbind_touch").val(objSettns.exiton.Eb_meV);
        if (objSettns.exiton.type=="QW-2D"){
            simSettn.viewDir=objSettns.exiton.viewDir;
            if (objSettns.exiton.viewDir=='parallel'){
                $('#dirPar').prop('checked',true);
            }else{
                $('#dirPerp').prop('checked',true);
            }
            simSettn.polarizat=objSettns.exiton.polarizat;
            if (objSettns.exiton.polarizat=='TM'){
                simSettn.ex0=objSettns.exiton.shapePar;
                $('#haideri').css('display','inline');
                $("#ex0_touch").val(simSettn.ex0);
                $("enhTM").prop('checked',true);
            }else{
                $('#haideri').css('display','none');
                $("enhTE").prop('checked',true);
            }
        }
    }
    if (objSettns.Boltzmann) {
        simSettn.kelvin = objSettns.Boltzmann.Temp_K;
        $('#TemK_touch').val(simSettn.kelvin);
        $('#Et_touch').val(simSettn.eTr);
    }
    if (objSettns.InhmgBrdng) {
        if (objSettns.InhmgBrdng.type=="SymmUrbach" || objSettns.InhmgBrdng.type=="AsymUrbach") {
            simSettn.eU=objSettns.InhmgBrdng.Eu_meV;
            $("#eveu_touch").val(simSettn.eU);
        }
        if (objSettns.InhmgBrdng.type == "Gaussian") {
            simSettn.GauSig = objSettns.InhmgBrdng.sigma_meV;
            $("#gausig_touch").val(simSettn.GauSig);
        }
        if (objSettns.InhmgBrdng.type == "Sech^n(t/tau)") {
            simSettn.SechTau = objSettns.InhmgBrdng.tau_fs;
            simSettn.SechN = objSettns.InhmgBrdng.n;
            $("#sechTau_touch").val(simSettn.SechTau);
            $("#sechN_touch").val(simSettn.SechN);
        }
    }
    if (objSettns.HomogBrdng){ //arvot ovat saatavilla
        if (objSettns.HomogBrdng.type=='Lorentz X Lorentz'){
            $('#pltDlorentz').prop('checked', true);
            $('#pltLorentz').prop('checked', false);
            simSettn.DlTau1=objSettns.HomogBrdng.tau1_fs;
            $("#tauBe_touch").val(simSettn.DlTau1);
            simSettn.DlTau2=objSettns.HomogBrdng.tau2_fs;
            $("#tauBh_touch").val(simSettn.DlTau2);
        }
        if (objSettns.HomogBrdng.type == 'Lorentz') {
            simSettn.LorTau = objSettns.HomogBrdng.tau_fs;
            $('#pltLorentz').prop('checked', true);
            $('#pltDlorentz').prop('checked', false);
            $("#TauR_touch").val(simSettn.LorTau);
        }
    }
}

function gotHomogSim(filecont) {
    //console.log('Homog simulation parameters: ',filecont);
    //alert('gotHomogSim function not ready');
}



