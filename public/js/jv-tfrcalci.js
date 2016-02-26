/** JV-scripts for TFRCalc
 * Use this software only at your own risk
 *
 * To add user functions to jquery:
 * (function ($) {
 *	//Private user functions can be added to jquery using this plugin system see:::
 *	//http://jquery-howto.blogspot.fi/2008/12/what-heck-is-function-jquery.html
 *  })(jQuery);
 *
 * $ character in the following function: '$(function(){xxx});',
 * is aliased to word 'jQuery' [so that $(..) is equal to jQuery(..)], and
 * jQuery library has to be included in the head section of the html-files through a line:
 * script(src='/bower_components/jquery/dist/jquery.min.js')
 *
 * The function is included in the web-page html file through head section line:
 * script(src='/RefTran/js/jv-tfrcalci.js')
 * The script runs automatically after the HTML5 document has been loaded and parsed ready
 * on the browser. In automatic execution it is equivalent to
 * (=shorthand) to '$(document).ready(function(){xxx})'.
 * This procedure is necessary because, premature script execution is useless and erroneous on elements that
 * have not yet been parsed and available for script interactions.
 */

/* *****Global Variable declarations*****
* These should be kept out of document ready function, otherwise will not
 * be available
 *
*/
var aTreeData;       //Data object for directory tree (JSON data) obtained from mongo database
var dirUser='Publ';  //server directory user default (No Login)
var DFmngo;          //Dialogform for file operations
var locReader = new FileReader();
var matrlArr=[];     //first row: [nm|um|eV, n, k]
//initializes material string with some n and k values to show in table and graph:
var matrlStr = "nm\tn\tk\r\n500\t1.0\t0.0\r\n510\t1.5\t0.2\r\n520\t1.2\t0.4";
//var nkPlot;
var oMatOptTable = {};
var oMatTable={};       //objekti, materiaalilista dataTables widgetti� varten
var oStackTable = {};   //covermaterial, layers and substrate
var oTargOptTable = {}; //fitting targets menu
var otargTable = {};    //targettilista dataTables widgetti� varten
var selctdNde={};       //selected node in jsTree
var spArra=[,,];        //spectral points array for calculations and display
var spNum=201;          //number of spectral points
var stack={};           //thin film stack including cover and substrate materials
var stackArr=[['Cover','DblClick to edit!','bulk','no',[]],['Substr.','DblClick to edit!','bulk','no',[]]];
//ToDo: siirr� stackArr:in alustus document ready funktioon:
var userName = 'No login'; // after login obtained from web-server
var targArr = [];
//initialize target string with some R% values to show in table and graph:
var targStr = "nm\tR\t'sample data'\r\n500\t55.0\r\n510\t54.0\r\n520\t55.0";

/* *****Document ready function ***********
*   Runs after HTML page has been rendered
*   Initializes variables and prepares event handlers
*   (Avoideable by placing the jv-tfrcalci.js script tag to the bottom of
*   refletrans HTML body before the </body> tag. Here in refletrans.jade file)
*   script call to jquery.min.js has to be before this called to alias the $ char
*   for jquery
*   $( document ).ready(function() {
*       console.log( "ready!" );
*   });
*/
$(function() {
    //ask confirmation before page exit:
    window.onbeforeunload = function(){
        return 'Unsaved data?';
    };

    //Set default calculation parameters and materials
    stack=buildStack();

    //Build dialog form for opening and saving files
    buildMongoDial();

    //open default stack from server:
    var srvrFileTxt = 'Open stack file from';
    DFmngo=$('#mongoDialForm'); //dialog form
    DFmngo.dialog('option','title',srvrFileTxt);  // starts from stacks collection
    if (window.sessionStorage.getItem('RTFtoken') && window.sessionStorage.getItem('RTFtoken').length>0){
        userName=window.sessionStorage.getItem('RTFuser');
    }else{
        userName='No login';
        dirUser='Publ';
        var fiile='Defaults/R-Default';
        mongoGetOne(fiile,dirUser);// opens default stack from Publ dierectory
    }
    //Dummy target and material arrays
    targArr = splitToArr(targStr);
    matrlArr = splitToArr(matrlStr);

    //init jquery tabs widget
    $( "#tabis" ).tabs({
        //tabs panel täyttää sen verran, kun on tarpeen:
        heightStyle: "auto",
        //seuraava päivittää settingsit, graafin ja taulukot kun tabsia klikataan:
        activate: function (event, ui) {
            var poisTab=ui.oldTab.index(); //exitoituvan tabsin indexi
            var exitTab=$("#tabis").find("ul>li a").eq(poisTab).attr('id'); //exitoivan tabsin id
            if (exitTab=="Settings"){//Settings tabs values need to be updated on exit:
                stack.settings.polaris=$('input[name="polSel"]:checked').val();
                stack.settings.angle=parseFloat($("#incAng").spinner("value"));          //incidence angle in cover matrl
                stack.settings.RorT=$('input[name="setCalcfor"]:checked').val();//gets either R or T
                stack.settings.backR=$('#bottomR').is(':checked');          //back surface reflection: true/false
                stack.settings.frontR=$('#frontR').is(':checked');          //front surface reflection: true/false
                stack.settings.SubstrD=parseFloat($("#sThickn").spinner("value")*1000); //Substrate thickness in nm:
                stack.settings.CoverD= parseFloat($("#cThickn").spinner("value")*1000); //cover thickness in nm:
                stack.settings.spUnit=$('input[name="setUnit"]:checked').val();
                switch (stack.settings.spUnit){
                    case 'nm':
                        stack.settings.spStart=$("#SpStart").spinner("value");
                        stack.settings.spStop=$("#SpStop").spinner("value");
                        break;
                    case 'um':
                        stack.settings.spStart=$("#SpStart").spinner("value")*1000;
                        stack.settings.spStop=$("#SpStop").spinner("value")*1000;
                        break;
                    case 'eV':
                        stack.settings.spStart=(1239.8/$("#SpStart").spinner("value")).toFixed(2);
                        stack.settings.spStop=(1239.8/$("#SpStop").spinner("value")).toFixed(2);
                        break;
                }
                buildSpArray();                 //updates spectral wavelengths grid
                updNKspArra();                  //updates nk-values in materials stack
                updTargSpArra();                //updates target values
                updRTspArra();                  //updates calculated values
                updGraph();
            }
            //var nextTab =ui.newPanel.attr('id'); //antaa aktivoituvan tabsin href:in
            var nextTab = ui.newTab.index(); //antaa aktivoidun tabs:in indeksin ul:ss�
            var selecTab = $("#tabis").find("ul>li a").eq(nextTab).attr('id'); //aktivoidun tabsin id
            //var selecTab = $("#tabs ul>li a").eq(nextTab).attr('id');
            if (selecTab == "Targets") {
                //RorT = targArr[0][1];
                plotRT(targArr, 7);
                //$("p").css({ "color": "blue", "font-size": "1.2em"}).text("Text changed!");
                $('#targEditTabl').find('th:eq(0)').text("Wavel. [" + targArr[0][0] + "]")
                    .find('th:eq(1)').text(targArr[0][1] +  " %-value");
                    //settings tabs:in muutokset piirettiin Targets tabsiin
            }
            if (selecTab == "Materials") {
                plotNK(matrlArr, 8);
            }
            if (selecTab == "Settings") {
                if (window.sessionStorage.getItem('RTFtoken') && window.sessionStorage.getItem('RTFtoken').length>0){
                    userName=window.sessionStorage.getItem('RTFuser');
                }else{
                    userName='No login';
                }
                $('#UserName').text(userName);
            }
            if (selecTab == "Stack") {
                updGraph();
            }
        }
    });
//Set datatables jquery widget defaults:
//observe: dataTables uses jquery interface, but DataTables (with capital D) has it's own interface
    $.extend($.fn.dataTable.defaults, {
        "bPaginate": true,
        "bLengthChange": true,
        "bFilter": true,
        "bSort": false,
        "bInfo": true,
        "bAutoWidth": true
    });
//--------------------------------------------------------------------------------
//For tabs-1 -----------------------------
    //this tab does not include widgets or buttons

//For tabs-2 --------------------------
    //Toggle titles on mode event changes handler:
    $('input[name="setCalcfor"]').change(function () {
        if (this.value == "R") {
            $("#setTarg").text("Calculated  reflectance includes:");
            $("#CalcRes").text("&Reflectance is graphed on "+stack.settings.spUnit+" axis");//&nbsp &nbsp Reflectance is graphed on nm axis
            $("#targMode").text("Target spectrum for reflectance");
            $("#targCol2").text("R%-value");
            $("#StackRTb").text("Stack Reflectance");
        }else {
            $("#setTarg").text("Calculated  transmittance includes:");
            $("#CalcRes").text("Transmittance is graphed on "+stack.settings.spUnit+" axis");
            $("#targMode").text("Target spectrum for transmittance");
            $("#targCol2").text("T%-value");
            $("#StackRTb").text("Stack Transmittance");
        }
        //stack.settings.RorT will be set on exit from settings tab
    });
    $('#obliDiv').hide();       //hides oblique incidence spinner in startup

    var bottR=$('#bottomR');        //checkbox for substrate backside reflection
    bottR.attr('checked', false);   //initial value without bottom reflection
    var topR=$('#frontR');          //checkbox for cover matrl front reflection
    topR.attr('checked', false);    //initial value without front reflection

    bottR.click(function() {//event handler for backside reflection checkbox
        var calcType= $('input[name="setCalcfor"]:checked').val();
        topR.attr('checked', false);
        //console.log('calcType: ',calcType);
        if ($(this).is(':checked')) {
            $('#setReflLbl').text(' Reflectance includes substrate backside reflection');
            $('#setTranLbl').text(' Transmittance through all materials');
        }else{
            $('#setReflLbl').text(' Reflectance without substrate backside reflection');
            $('#setTranLbl').text(' Transmittance into substrate material');
        }
        //values updated to stack on exit from this tab
    });

    topR.click(function() {    //event handler for cover matrl front surface reflection checkbox
        //values updated to stack on exit from this tab
        if ($(this).is(':checked')) {
            bottR.attr('checked',false);
            if ($(this).is(':checked')) {
                $('#setReflLbl').text(' Reflectance includes cover material front reflection');
                $('#setTranLbl').text(' Transmittance into substrate material');
            }else{
                $('#setReflLbl').text(' Reflectance without cover material front reflection');
                $('#setTranLbl').text(' Transmittance from cover material into film layers');
            }
        }
    });

    $('input[name="incidenceA"]').change(function(){
        $("#incAng").spinner("value",0);
        //spinner value will be updated to 'stack.settings.angle on exit of this tab'
        if (this.value == "Normal") $('#obliDiv').hide();
        else {
            $('#obliDiv').show();
            $('#TEpol').prop('checked',true);
        }
    });

    $('input[name="polSel"]').change(function(){
    //value will be updated to 'stack.settings.polaris' on exit from settings tab
    });

//Tabs-2: Set wavelength spinners:-------------------------------------------------------

    $("#sThickn").spinner({
        max: 5000,
        min: 50,
        step:10,
        spin: function (event, ui) {
            //this.value; antaisi olleen arvon
            //ui.value antaisi tulevan uuden arvon
            var tmp1 = ui.value.toFixed(0);
        },
        change: function (event, ui) {
        }
        //will be updated to stack.settings.coverD on exit from settings tab
    }).val(1000);//thickness is in um, in calc multiplied by 1000 to get nm

    $("#cThickn").spinner({
        max: 5000,
        min: 50,
        step:10,
        spin: function (event, ui) {
            //this.value; antaisi olleen arvon
            //ui.value antaisi tulevan uuden arvon
            var tmp1 = ui.value.toFixed(0);
        },
        change: function (event, ui) {
        }
        //will be updated to stack.settings.coverD on exit from settings tab
    }).val(1000);//(=1mm) thickness is in um, in calc multiplied by 1000 to get nm

    $("#incAng").spinner({
        max: 90,
        min: 0,
        step:1,
        spin: function (event, ui) {
            //this.value; antaisi olleen arvon
            //ui.value antaisi tulevan uuden arvon
            var tmp1 = ui.value.toFixed(0);
        },
        change: function (event, ui) {
        }
        //will be updated to stack.settings.angle on exit from settings tab
    }).val(0);//angle is in degrees, multiplied by pi/180 for absolute units
    setSpinners();
    $("#SpStart").spinner({
        //max, min ja step asetettu setSpinners() funktiolla
        spin: function (event, ui) {
            //this.value; antaa olleen arvon
            //ui.value antaa tulevan arvon
            var tmp1 = ui.value; //.toFixed(4);
            $("#spRange1").text(tmp1);
        },
        change: function (event, ui) {
        }
        //will be updated to stack.settings.spStart on exit from settings tab
    }).val(stack.settings.spStart);//

    $("#SpStop").spinner({
        //max, min ja step asetettu setSpinners() funktiolla
        //max: 5000,
        //min: stack.settings.spStart,
        //step: 1,
        spin: function (event, ui) {
            // alert("event: "+event.target+" ui: "+ui.value);
            var tmp2 = ui.value;//.toFixed(4);
            $("#spRange2").text(tmp2);
        },
        change: function (event, ui) {
        }
        //will be updated to stack.settings.spStop on exit from settings tab
    }).val(stack.settings.spStop);

//------------------------------------------------------------------------------
//Spectral units sector:------------------------------------------------------
    $('input[name="setUnit"]').change(function (){
        stack.settings.spUnit = this.value;
        //alert(this.value);
        if (stack.settings.RorT=="T") {
            $("#CalcRes").text("Transmittance is graphed on "+stack.settings.spUnit+" axis");
        }else {
            $("#CalcRes").text("Reflectance is graphed on "+stack.settings.spUnit+" axis");
        }
        setSpinners();
        $("#spRange1").text(stack.settings.spStart);
        $("#spRange2").text(stack.settings.spStop);
    });
    buildSpArray(); //todo: tarkista paikka prepares wavelength grid
//-----------------------------------------------------------------
//Code for tabs-2 ends here

//tabs-6-----Film Stack--------------------------
//alustetaan kalvopakan taulukko:
    createStackTable();

//Tabs-6: tehd�� piirtomoodin muuttamisen event handler:
    $("input[name=graphMode]:radio").change(function () {
        updRTspArra();
        updNKspArra();
        updGraph();
    });

//Tabs-6: tehd��n toinen sarake editoitavaksi select-option rakenteen kanssa:
    oStackTable.on('dblclick', 'td:nth-child(2)', function (evt) {
        if ($(this)[0].editing) {
            //without this checking jquery editable function may be triggered twice
            //and results in error message: "too much recursion"
            return;
        }
        $(this).editable(function (value, settings) {
            return (value);
        },
        {//huom. jquery.jeditable.js:ssa oletuksena on click.editable
        event: 'dblclick.editable',
        type: 'select',
        onblur: 'submit',
        data: function () {
            var optsString;
            if (stack.Materials.length < 1) {
                optsString = "{'':'Empty materials list','-':'Populate it on'," +
                    "'--':'Materials Tab'}"
            }else {
                optsString = "{'':'Select:'";
                for (var i = 0; i < stack.Materials.length; i++) {
                    optsString = optsString + ",'" + stack.Materials[i].Name +
                        "':'" + stack.Materials[i].Name + "'";
                }
                optsString = optsString + "}";
            }
            return optsString;
        },
        onsubmit: function (settings, td) {
            var input = $(this).find('select');
            //var arvo = input.text();
        },
        "callback": function (value, settings) {
            //kelpuutetun uuden arvon prosessointi:
            var aPos = oStackTable.fnGetPosition(this);
            //kakkossarakkeeseen tulee valitun materiaalin nimi
            stackArr[aPos[0]][aPos[1]] = value;
            stack.Layers[aPos[0]][aPos[1]] = value;  //aPos[1]=1; p.o. toinen sarake
            //console.log('stack.Layers[aPos[0]][aPos[1]]: ',value);
            oStackTable.fnClearTable();
            oStackTable.fnAddData(stackArr);
            updNKspArra();
            updRTspArra();
            updGraph();
        },
        "height": "14px",
        "width": "100%"
        });
        //$(this).trigger("edit"); // ei toimi
        $(this).dblclick(); //toimii
    });

    if (stack.settings.usedTarg!=""){
        var targe=stack.settings.usedTarg;
        $('#stackTargs option[value=targe]');
    }

    $('#stackTargs').change(function () {
        //select object on stack-Tab
        var selTarg = $('#stackTargs option:selected').text();
        if ($('#stackTargs option').length == 0 || selTarg == 'Select:') return;
        else {
            stack.settings.usedTarg=selTarg;
            updTargSpArra();//update selected target to target array
            updGraph();     //update graph
        }
    });

    $('#descStack').change(function () {
        //input object on stack-Tab
        var describe = $('#descStack').val();
        describe= describe.replace(/(^[\"\']+)|([\"\']+$)/g, "");
        stack.settings.Descriptor=describe;
        //console.log('descriptor: ',describe);
    });


//Tabs-6: Add a custom editable number input to jeditable for film thickness
    $.editable.addInputType('qumber', {
        element: function (settings, original) {
            var minput = $('<input id="arvotus">');//creates input box
            minput.attr("type", "number");
            minput.attr("min", "0");        //sets min. value for film thickness
            //minput.attr("value", "15");   //sets initial value for thickness
            minput.attr("max", "10000");    //sets maximum value for film thickness
            $(this).append(minput);
            // Hidden input to store value which is submitted to server.
            var hidden = $('<input type="hidden">');
            $(this).append(hidden);
            return (hidden);
        },
        submit: function (settings, original) {
            var value = $('#arvotus').val();
            $("input", this).val(value);
        }
    });

//Tabs-6: Add a custom editable chkbox input to jeditable
    $.editable.addInputType('checkbox', {
        // From web-page: http://code.google.com/p/jquery-datatables-editable/
        // source/browse/trunk/media/js/jeditable.checkbox.js?r=218
        element: function (settings, original) {
            $(this).append('<input type="checkbox"/>');
            var hidden = $('<input type="hidden"/>');
            $(this).append(hidden);
            return (hidden);
        },
        submit: function (settings, original) {
            settings = $.extend({
                checkbox: {
                    trueValue: '1',
                    falseValue: '0'
                }
            }, settings);
            if ($(':checkbox', this).is(':checked')) {
                $(':hidden', this).val(settings.checkbox.trueValue);
            } else {
                $(':hidden', this).val(settings.checkbox.falseValue);
            }
        },
        content: function (data, settings, original) {
            settings = $.extend({
                checkbox: {
                    trueValue: '1',
                    falseValue: '0'
                }
            }, settings);
            if (data == settings.checkbox.trueValue) {
                $(':checkbox', this).attr('checked', 'checked');
            } else {
                $(':checkbox', this).removeAttr('checked');
            }
        }
    });

//Tabs-6: Use the earlier made custom number inbut type: 'qumber' to set
// film thickness values in the 4th column:
    oStackTable.on('dblclick', 'td:nth-child(3)', function (evt) {
        var layerCount = stackArr.length;
        var rowIndex = $(this).parent().index();
        if ($(this)[0].editing || rowIndex === 0 || rowIndex === layerCount - 1) {
            //without the first condition, editable function may be triggered twice
            //This results in error message: "too much recursion"
            //The second condition prevents adjustments on cover and substrate layers
            return;
        }
        $(this).editable(function (value, settings) {
            return (value);
        },
        {event: 'dblclick.editable', //click.editable is the default in jquery.jeditable.js
            type: 'qumber',     //custom made number input
            onblur: 'submit',   //submits also on exit
            submit: 'OK',       //text on submit button
            callback: function (value, settings) {//is called once editable is submitted
                //processing the newly obtained thickness:
                var aPos = oStackTable.fnGetPosition(this);
                stackArr[aPos[0]][aPos[1]] = value; //aPos[1]=2; p.o. toinen l. paksuussarake
                //console.log('aPos[0]: '+aPos[0]+' aPos[1]: '+aPos[1]+' value: '+value);
                stack.Layers[aPos[0]][aPos[1]] = value;
                stack.Layers[aPos[0]][4] = value; //tallennetaan myös peruutussarakkeeseen
                //console.log('stack.Layers: ',stack.Layers);
                oStackTable.fnClearTable();
                oStackTable.fnAddData(stackArr);
                updNKspArra();
                updRTspArra();
                updGraph();
            },
            "height": "14px",
            "width": "100%"
        });
        $(this).dblclick();
    });


//Tabs-6 Tuning is by default not available:
    $("#adjustThs").css( "border", "3px solid red" );
    $("#adjustThs").hide();

//Tabs-6: tehd��n nelj�s sarake editoitavaksi checkboxin kanssa:
    oStackTable.on('dblclick', 'td:nth-child(4)', function (evt) {
        var layerCount = stackArr.length;
        var rowIndex = $(this).parent().index();
        if ($(this)[0].editing || rowIndex === 0 || rowIndex === layerCount - 1) {
            //without the first condition, editable function may be triggered twice
            //This results in error message: "too much recursion"
            //The second condition prevents adjustments on cover and substrate layers
            return;
        }
        $(this).editable(function (value, settings) {
            return (value);
        },
        {//click.editable is the default in jquery.jeditable.js
            event: 'dblclick.editable', //changed editable action to dblclick
            type: 'checkbox',
            onblur: 'submit', //does not seem to work
            //cancel: 'Cancel', is not needed
            submit: 'OK',
            checkbox: {trueValue: 'Yes', falseValue: 'No' },
            callback: function (value, settings) {//runs on submit
                var aPos = oStackTable.fnGetPosition(this); //gets the selected cell in the table:
                stackArr[aPos[0]][aPos[1]] = value;         //gets checkbox value: Yes/No
                //console.log('aPos[0]: '+aPos[0]+' aPos[1]: '+aPos[1]+' value: '+value);
                stack.Layers[aPos[0]][aPos[1]] = value;
                stack.Layers[aPos[0]][4]=stackArr[aPos[0]][2]; //save start value for revertion
                oStackTable.fnClearTable();
                oStackTable.fnAddData(stackArr); //redraws stack on browser
                var jj=stackArr.length;
                var tuneds = false;
                for (var j=0;j<jj;j++){ //check if atleast one tuning checkbox has 'Yes'
                    if (stackArr[j][3]==="Yes") tuneds=true;
                    }
                    if (tuneds) {
                        $("#adjustThs").show(); //show tuning toolbox
                    }else{
                        $("#adjustThs").hide();
                    }
            }
        });
        $(this).dblclick(); //activates editable
    });

//Tabs-6: tehdään kalvopakan editointinappuloiden enablointi-disablointi handleri
    oStackTable.on('click', 'td', function (evt) {
        //will not work with selector 'tr'
        // clicked element will also be set as selected: now 'td' gets selected but 'tr' remains unselected
        var layerCount = stackArr.length;
        var rowIndex = $(this).parent().index();
        EnDisButt('Disabled', '#btnAddFilm');
        EnDisButt('Disabled', '#btnDelFilm');
        if ($(this).closest('tr').hasClass('row_selected')) {
            //clicked layer (row) was already in selected state:
            oStackTable.$('tr').removeClass('row_selected');//remove selection from all layers
            EnDisButt('Disabled', '#btnAddFilm');//disable buttons, no rows remain selected
            EnDisButt('Disabled', '#btnDelFilm');
        }else {
            //unselected row was clicked:
            oStackTable.$('tr').removeClass('row_selected');//remove selection from all other layers as well
            $(this).closest('tr').addClass('row_selected');//set clicked to selected state
                if (rowIndex !== 0) {
                    EnDisButt('Enabled', '#btnAddFilm');//addition on top of cover not allowed
                    EnDisButt('Disabled', '#btnDelFilm');//not allowed to delete cover material
                }
                if (rowIndex !== 0 && rowIndex !== layerCount - 1) {
                    //not on cover or substrate:
                    EnDisButt('Enabled', '#btnAddFilm');
                    EnDisButt('Enabled', '#btnDelFilm');
                }
                updGraph();
        }
    });

//Tabs-6: Document ready funktio tekee kalvokerroksen lis�ykselle handlerin:
    $('#btnAddFilm').click(function () {
        var uusFilm;
        var layerCount = stackArr.length;
        //console.log("kalvoja: " + layerCount);
        uusFilm = [];
        var anSelected = fnGetSelected(oStackTable);
        var rowIndex = oStackTable.fnGetPosition($(anSelected).closest('tr')[0]);
        if (anSelected.length !== 0 && rowIndex !== 0) {//Ylin kerros on indeksillä 0, sen päälle ei saa lisätä
            uusFilm = [" ", "Select material", "0", "no",0]; //viimeinen nolla on paksuus peruutusta varten
            stackArr.splice(rowIndex, 0, uusFilm);
            stack.Layers.splice(rowIndex, 0, uusFilm);
            for (var i = 1; i < layerCount; i++) {
                stackArr[i][0] = "Film#: " + (layerCount - i);
                stack.Layers[i][0]="Film#: " + (layerCount - i);
            }
            oStackTable.fnClearTable();
            oStackTable.fnAddData(stackArr);
        }
        stackArr.ready=false;
    });

//Tabs-6: tehdaan kalvokerroksen poiston handleri:
    $('#btnDelFilm').click(function () {
        var layerCount = stackArr.length;
        EnDisButt('Disabled', '#btnDelFilm');
        var anSelected = fnGetSelected(oStackTable);
        if (anSelected.length !== 0 && stackArr.length > 2) {
            var rowIndex = oStackTable.fnGetPosition($(anSelected).closest('tr')[0]);
            stackArr.splice(rowIndex, 1); //removes one row at rowIndex
            stack.Layers.splice(rowIndex, 1);
            for (var i = 1; i < layerCount - 2; i++) {
                stackArr[i][0] = "Film#: " + (layerCount - 2 - i);
                stack.Layers[i][0] = "Film#: " + (layerCount - 2 - i);
            }
            oStackTable.fnClearTable();
            oStackTable.fnAddData(stackArr);
            updNKspArra();
            updRTspArra();
            updGraph();
        }
    });

//Tabs-6: Tuning percentage:
    $("#tuneSpin").spinner({
        max: 100,
        min: -100,
        step:0.1,
        spin: function (event, ui) {
            //this.value; antaisi olleen arvon
            //ui.value antaisi tulevan uuden arvon
        },
        change: function (event, ui) {
            stack.settings.tunePrcnt=this.value;
            //console.log('setting tunePrcnt to: ',this.value);
            //at event when spinner loses focus
        }
    }).val(stack.settings.tunePrcnt);//starting value from stack settings
    //$("#tuneSpin")


    $('#repTune').click(function(){
        stack.settings.tunePrcnt=$('#tuneSpin').val();
        tuneOneTime();
    });

    var tmeInterval;
    $('#repTune').mousedown(function () {
        var tStamp;
        stack.settings.tunePrcnt=$('#tuneSpin').val();
        //do something here
        tmeInterval = setInterval(function () {
            tStamp=Date.now();
            tuneOneTime();
            tStamp=Date.now()-tStamp;
            //console.log('tStamp: ',tStamp);
        }, 500);
        return false;
    });
    $('#repTune').mouseout(function () {
        clearInterval(tmeInterval);
        return false;
    });
    $('#repTune').dblclick(function () {
        clearInterval(tmeInterval);
        tuneOneTime();
        return false;
    });
    $('#repTune').mouseup(function () {
        clearInterval(tmeInterval);
        return false;
    });

//Tabs-6: Revert tuning button
    $('#reveTune').click(function(){
        revertTune();
        $("#adjustThs").hide();
    });

//Tabs-6: Event handler for autoTune button
    $('#autoTune').click(function(){
        var buttone=$(this).children('.ui-button-text','span'); //returns button span for button text
        buttone.text((buttone.text()=='AutoTune')? 'StopTune':'AutoTune'); //toggle: AutoTune, StopTune
        //console.log(buttone.text());
        if (buttone.text()=='StopTune') {
            if (iter1()=='Stop') return; // no tuned films selected, some layer with zero thickness?
            var tunePrcnt=10; //multiply thicknesses with ratio 1.1*
            //following setTimeout structure is merely to avoid browser
            // interface freeze out during the iteration process
            setTimeout(function(tunePrcnt,calliBacki){
                //tunPrcnt=tunePrcnt;
                //var currentdate = new Date();
                //var startAt = "iter2Start: "
                //    + currentdate.getHours() + ":"
                //    + currentdate.getMinutes() + ":"
                //    + currentdate.getSeconds();
                //console.log(startAt);
                calliBacki(tunePrcnt);
            },10,tunePrcnt,iter2); //callback name is given here: 'iter2' and
            // tunePrcnt is the parameter passed to that callback function
            //iterStop=false;
        }else {
            //iterStop=true;
            //alert('iteration stop');
        }
    });

//------------------------------------------------------------------------------------
//Tabs-7: alustetaan reflectanssitargetti:
    //targArr = splitToArr(targStr);
    createTargEditTable(); //voisi nimet� paremmin, kun luodaan otargTable
    otargTable.fnClearTable();
    otargTable.fnAddData(targArr.slice(1));
    //RorT = targArr[0][1];
    plotRT(targArr, 7);//tämäkö
    otargTable.on('click contextmenu', 'td', function (evt) {
        //var rowInd0 = 0;
        //rowInd0 = otargTable.fnGetPosition($(this).closest('tr')[0]);
        //Huom! 'click contextmenu' on molemmat (vasen click) tai (oikea click)
        EnDisButt('Enabled', '#btnDelTargRow');
        EnDisButt('Enabled', '#btnAddTargRow');
        if (evt.which !== 1) {
            //oikeanpuoleinen klikkaus, estet��n contextmenun avaus:
            evt.preventDefault();
            EnDisButt('Disabled', '#btnDelTargRow');
            EnDisButt('Disabled', '#btnAddTargRow');
            if (otargTable.$('tr.row_selected').length !== 0) {
                otargTable.$('tr.row_selected').removeClass('row_selected');
            }
        }
        //vasemmanpuoleinen hiiren nappi:
        else {
            if ($(this).closest('tr').hasClass('row_selected')) {
                $(this).closest('tr').removeClass('row_selected');
                //Disable Add & Del butts.
                EnDisButt('Disabled', '#btnDelTargRow');
                EnDisButt('Disabled', '#btnAddTargRow');
            } else {
                otargTable.$('tr.row_selected').removeClass('row_selected');
                $(this).closest('tr').addClass('row_selected');
                //Enable Add & Del butts.
                EnDisButt('Enabled', '#btnDelTargRow');
                EnDisButt('Enabled', '#btnAddTargRow');
            }
        }
    });

//Tabs-7 event liitett�v� delegaatilla, muuten uudet rivit eiv�t ole editoitavissa:
    otargTable.on('dblclick', 'td', function (evt) {
        if ($(this)[0].editing) {
            //ilman t�t� tarkistusta editable funktio voi liipaistua
            //uudelleen, mik� aiheuttaa virheen ja ilmoituksen:
            //"too much recursion"
            return;
        }
        $(this).editable(function (value, settings) {
            return (value);
        },
        { tooltip: 'Click to select row, dblclick to edit...',
            //huom. jquery.jeditable.js:ssa oletuksena on click.editable
            event: 'dblclick.editable', //contMenu.editable on paras toteutus mutta ei toimi IE:ssa
            onsubmit: function (settings, td) {
                var input = $(td).find('input');
                var original = input.val();
                //console.log('targ edited : '+original);
                //console.log('targ edited is numeric: '+isNumeric(original));
                return isNumeric(original);
                // if (isNumeric(original)) {
                //    return true;
                //} else {
                ////input.css('background-color','#c00').css('color', '#fff');
                //    return false;
                //}
            },
            "callback": function (value, settings) {
                //kelpuutetun uuden arvon prosessointi:
                var aPos = otargTable.fnGetPosition(this);
                targArr[aPos[0] + 1][aPos[1]] = value;
                //sort the array after new data:
                targArr = sorttaa(targArr);
                otargTable.fnClearTable();
                otargTable.fnAddData(targArr.slice(1));
                plotRT(targArr, 7);//tämäkö?
                $('#ediTarge').val('Unsaved target');
                $('#descTarge').val('Edited target data');
            },
            "height": "14px",
            "width": "100%"
        });
        $(this).dblclick();
    });

//Tabs-7 tehd��n paikalliseen tiedostojen tallennukseen click handler:
//$("#btnLclTSave").click(function () {
//    var seivString;
//    var failneim = $('#ediTarge').val();
//    alert('Save file name: '+failneim);
//    //ToDo: build saveString from target data
//    //ToDo: take filename proposal from inputput box
//    seivString = 'Hellot worldit';
//    failneim = 'huihai.txt';
//    seiv_loucal(failneim, seivString);
//});

//Tabs-7: Click handler for 'delete row' in target or measurement data
    $('#btnDelTargRow').click(function () {
        var anSelected = fnGetSelected(otargTable);
        var rowS = targArr.length;
        var rowIndex;
        if (anSelected.length !== 0 && rowS > 1) {
            rowIndex = otargTable.fnGetPosition($(anSelected).closest('tr')[0]);
            targArr.splice(rowIndex + 1, 1);
            otargTable.fnClearTable();
            otargTable.fnAddData(targArr.slice(1));
            plotRT(targArr, 7); //tämäkö?
            $('#ediTarge').val('Unsaved target data');
            $('#descTarge').val('Edited target data');
            EnDisButt('Disabled', '#btnUseTarg');
            //RTPlot(targArr, 7);
        }else {
            rowIndex = otargTable.fnGetPosition($(anSelected).closest('tr')[0]);
            alert("Cannot remowe row No: " + rowIndex + " !");
        }
        EnDisButt('Disabled', '#btnDelTargRow');
        EnDisButt('Disabled', '#btnAddTargRow');
    });

//Tabs-7: Click handler for 'Add row' in target or measurement data
    $('#btnAddTargRow').click(function () {
        EnDisButt('Disabled','#btnUseTarg');
        var uusDat = [];
        var anSelected = fnGetSelected(otargTable);
        var rowIndex;
        if (anSelected.length !== 0) {
            rowIndex = oMatTable.fnGetPosition($(anSelected).closest('tr')[0]);
            uusDat = [anSelected.find('td:eq(0)').html(), "0.0"];
            targArr.splice(rowIndex + 1, 0, uusDat);
            targArr = sorttaa(targArr);
            otargTable.fnClearTable();
            otargTable.fnAddData(targArr.slice(1));
            plotRT(targArr, 7);//tämäkö?
            $('#ediTarge').val('Unsaved target data');
            $('#descTarge').val('Edited target data');
            EnDisButt('Disabled', '#btnUseTarg');
            //RTPlot(targArr, 7);
        }
    });

//tabs-7 alustetaan spektritargettien lista
    createTargOptsTable();
    // alustetaan spektrien valinta handleri, joka enabloi/disabloi poistonappulaa:
    oTargOptTable.on('click', 'td', function (evt) {
        //huom ei toimi jos 'td':n sijalla 'tr' (klikattu rivi on aina selected)
        //valittu target spektri graafiin ja editointitaulukkoon:
        var rowIndex=oTargOptTable.fnGetPosition($(this).closest('tr')[0]);
        targArr=[];//suora:'targArr=stack.Targets[rowIndex].Data' tekee editoinnit suoraan stackiin
        var n=stack.Targets[rowIndex].Data.length;
        for (var i=0;i<n;i++){
            var x=[];
            targArr.push([]);
            var m=stack.Targets[rowIndex].Data[i].length;
            for (var j=0;j<m;j++){
                targArr[i].push(stack.Targets[rowIndex].Data[i][j]);
            }
        }
        //targArr.push.apply(targArr, stack.Targets[rowIndex].Data);//siirtää solujen editoinnin suoraan stackiin
        plotRT(targArr, 7); //vaihdettiin graafiin, vielä input bokseihin:
        $('#descTarge').val((targArr[0][3])? matrlArr[0][3]:'');
        $('#ediTarge').val(stack.Targets[rowIndex].File);
        otargTable.fnClearTable(); //laitetaan taulukkoon:
        otargTable.fnAddData(targArr.slice(1)); //poistettiin otsikkorivi, muutetaan aallonpituusyksikkö:
        $('#targEditTabl').find('th:eq(0)').text("Unit [" + targArr[0][0] + "]");

        if ($(this).closest('tr').hasClass('row_selected')) {
            oTargOptTable.$('tr').removeClass('row_selected');
            EnDisButt('Disabled', '#btnRmvTarg');
        }else {
            //poistetaan kaikilta riveilt� valinta
            oTargOptTable.$('tr').removeClass('row_selected');
            //valitaan klikattu rivi
            $(this).closest('tr').addClass('row_selected');
            EnDisButt('Enabled', '#btnRmvTarg');
        }
    });

//Tabs-7 tehd��n targettilistalle lis�ysnapin event handler:
    $('#btnUseTarg').click(function () {
        var trgOptsArr = [];
        var owneri;
        var omist=$('#ediTargeLbl').text();
        var omistN=omist.lastIndexOf('Public');
        if (omistN>-1){
            owneri='Publ';
        }else {
            omistN=omist.lastIndexOf('Local');
            if (omistN>-1){
                owneri='Local';
            }else{
                owneri=userName;
            }
        }
        var rivit = 0;
        //lisätään uusi targetti:
        EnDisButt('Disabled', '#btnRmvTarg');
        if ($('#ediTarge').val().length > 0) {
            var targtFileNme = $('#ediTarge').val();
            var menuName=menuTitle(targtFileNme);
            addTo_specOpts(targtFileNme, menuName, owneri, targArr);
            trgOptsArr = makeOptsArr(stack.Targets);
            oTargOptTable.fnClearTable();
            rivit = trgOptsArr.length;
            if (rivit > 0) {
                oTargOptTable.fnAddData(trgOptsArr);
            }
        }
        StackTargSelUpd();
    });



//Tabs-7 tehdaan targettilistalta poistonapin event handler:
    $('#btnRmvTarg').click(function () {
        var targOptsArr = [];
        EnDisButt('Disabled', '#btnRmvTarg');
        EnDisButt('Disabled','#btnUseTarg');
        var anSelected = fnGetSelected(oTargOptTable);
        if (anSelected.length !== 0 && stack.Targets.length > 0) {
            var rowIndex;
            var tmpRow;
            rowIndex = oTargOptTable.fnGetPosition($(anSelected).closest('tr')[0]);
            stack.Targets.splice(rowIndex, 1);
            targOptsArr = makeOptsArr(stack.Targets);
            oTargOptTable.fnClearTable();
            if (targOptsArr.length > 0) {
                oTargOptTable.fnAddData(targOptsArr)
            }
        }
        StackTargSelUpd();
        //console.log('stack.Targets: ',stack.Targets);
    });

//Tabs-7: targettilistaan Label tulee tiedostonimest�, mik� sattaa olla 'hankala'
//oTargOptTable.delegate("td:nth-child(2)","dblclick",function(){
//tai sitten:
    oTargOptTable.on('dblclick', 'td:nth-child(2)', function (evt) {
        if ($(this)[0].editing) {
            //ilman t�t� tarkistusta editable funktio voi liipaistua
            //uudelleen, mik� aiheuttaa virheen ja ilmoituksen:
            //"too much recursion"
            return;
        }
        $(this).editable(function (value, settings) {
            return (value);
        },
        {tooltip: 'to edit dblclick 2:nd col. elsewhere to select',
            //event : 'contextmenu.editable', //huom. jquery.jeditable.js:ssa oletuksena on click.editable
            event: 'dblclick.editable', //on paras toteutus mutta ei toimi IE:ssa
            //serveri-submittin tilalle funktio, jolloin editointi selaimessa ilman serveri roundtrippia:
            onsubmit: function (settings, td) {
                var input = $(td).find('input');
                var original = input.val();
                if (original.length > 0) {
                    return true;
                } else {
                    //input.css('background-color','#c00').css('color', '#fff');
                    return false;
                }
            },
            "callback": function (value, settings) {
                //uuden arvon prosessointi taulukkoon:
                var targOptsArr = [];
                var aPos = oTargOptTable.fnGetPosition(this);
                stack.Targets[aPos[0]].Name = value;
                targOptsArr = makeOptsArr(stack.Targets);
                if (targOptsArr.length > 0) {
                    oTargOptTable.fnClearTable();
                    oTargOptTable.fnAddData(targOptsArr);
                }
            },
            "height": "14px",
            "width": "100%"
        });
            //yll� tehtiin handleri sitten viel�:
            // liipaistaan dblclick: solu muuttuu editoitavaksi
            $(this).dblclick();
    });

 //Code for tabs-7 ended above
 // **********************************************************************************

//Tabs-8 set default n & k values for table and graph init. jotakin mit� n�ytt�� alussa:

    //matrlArr = splitToArr(matrlStr);
    plotNK(matrlArr, 8);//tämäkö
    createMatEditTable(); //Voisi olla parempi funktion nimi; luodaan oMatTable
    oMatTable.fnClearTable();
    oMatTable.fnAddData(matrlArr.slice(1));
    /* lis�t��n click handler riveille
    * Jotta handler toimii my�s j�ljest� lis�ttyjen rivien kanssa
    * pit�� k�ytt�� .on('click',.....) tyyli�, kuten alla.
    *  [.click(function(    )] tyyli ei toimi ajon aikana lis�ttyjen kanssa.
    */
    oMatTable.on('click', 'td', function (evt) {
        //var rowIndex = oMatTable.fnGetPosition($(this).closest('tr')[0]);
        //console.log('rowindex: ',rowIndex);
        if ($(this).closest('tr').hasClass('row_selected')) {
            $(this).closest('tr').removeClass('row_selected');
            //Disable Add & Del butts.
            EnDisButt('Disabled', '#btnDelMatRow');
            EnDisButt('Disabled', '#btnAddMatRow');
        }else {
            oMatTable.$('tr.row_selected').removeClass('row_selected');
            $(this).closest('tr').addClass('row_selected');
            //Enable Add & Del butts.
            EnDisButt('Enabled', '#btnDelMatRow');
            EnDisButt('Enabled', '#btnAddMatRow');
        }
    });


//Tabs-7 and Tabs-8 Button handler for 'File open'
    $('#btnOpenTarg, #btnOpenMat, #btnOpenStack').click(function () {
        //console.log('klikattu: '+this.id);
        var selDirTxt;
        var srvrFileTxt;
        var openLegend='';
        switch (this.id) {
            case 'btnOpenMat':
                selDirTxt = 'Materials';
                srvrFileTxt = 'Open material file from';
                break;
            case 'btnOpenTarg':
                selDirTxt = 'Targets';
                srvrFileTxt = 'Open target file from';
                break;
            case 'btnOpenStack':
                selDirTxt = 'Stacks';
                srvrFileTxt = 'Open stack file from';
                break;
            default:
                alert('unknown file request');
                break;
        }
        //console.log('seldirtxt: '+selDirTxt);
        DFmngo
            .css('display', 'inline')
            .dialog('option','title',srvrFileTxt)  // which mongo db collection
            .dialog('open');
            //$('#FilTreLege').text(openLegend);
            return;
    });

//Tabs-8 materials option table:
    createMatOptsTable(); //luodaan tyhja taulukko, lisaykset a.o. napilla
//Tabs-8 alustetaan listalle lisaysnapin event handler:
    $("#btnUseMat").click(function () {
        var owneri;
        var omist=$('#ediMaterLbl').text();
        var omistN=omist.lastIndexOf('Public');
        if (omistN>-1){
            owneri='Publ';
        }else {
            omistN=omist.lastIndexOf('Local');
            if (omistN>-1){
                owneri='Local';
            }else{
                owneri=userName;
            }
        }
        var matOptsArr = [];
        //lisataan uusi materiaali listaan :
        EnDisButt('Disabled', '#btnRmvMat');
        if ($('#ediMater').val().length > 0) {
            var matrlFileNme = $('#ediMater').val();
            var menuName=menuTitle(matrlFileNme);
            if ($('#ediMaterLbl').text().indexOf('Local')>-1){
                owneri='Local file';
            }
            addTo_matOpt(matrlFileNme, menuName, owneri, matrlArr);
            matOptsArr = makeOptsArr(stack.Materials);
            oMatOptTable.fnClearTable();
            if (matOptsArr.length > 0) {
                oMatOptTable.fnAddData(matOptsArr);
            }
        }
    });

//Tabs-8: alustetaan paikallisen materiaalitiedoston lukunappulan handleri:
    $("#btnReadLMat").click(function () {
        //opens "open local file form"
        $("#matLocFiles").focus().click();
    });

//Tabs-8: alustetaan materiaalilistalta poistamisen event handlerit:
//a) alustetaan taulukkodatan klikkaus handleri enabloi/disabloi nappulaa:
    oMatOptTable.on('click', 'td', function (evt) {
        //huom ei toimi jos 'td':n sijalla 'tr' (klikattu rivi on aina selected)

        //klikattu materiaali graafiin ja editointitaulukkoon:
        var rowIndex=oMatOptTable.fnGetPosition($(this).closest('tr')[0]);
        matrlArr=[];//suora:'matrlArr=stack.Materials[rowIndex].Data' tekee editoinnit suoraan stackiin
        var n=stack.Materials[rowIndex].Data.length;
        for (var i=0;i<n;i++){
            var x=[];
            matrlArr.push([]);
            var m=stack.Materials[rowIndex].Data[i].length;
            for (var j=0;j<m;j++){
                matrlArr[i].push(stack.Materials[rowIndex].Data[i][j]);
            }
        }
        //matrlArr.push.apply(matrlArr, stack.Materials[rowIndex].Data);//stack editoituu suoraan
        plotNK(matrlArr, 8); //vaihdettiin graafiin, input bokseihin:
        $('#descMater').val((matrlArr[0][3])? matrlArr[0][3]:'');
        $('#ediMater').val(stack.Materials[rowIndex].File);
        oMatTable.fnClearTable(); //laitetaan taulukkoon:
        oMatTable.fnAddData(matrlArr.slice(1)); //poistettiin otsikkorivi, muutetaan aallonpituusyksikkö:
        $('#matEditTabl').find('th:eq(0)').text("Unit [" + matrlArr[0][0] + "]");

        //enabloidaan/disabloidaan poistonappula:
        if ($(this).closest('tr').hasClass('row_selected')) {
            EnDisButt('Disabled', '#btnRmvMat');
        } else {
            EnDisButt('Enabled', '#btnRmvMat');
        }
    });

//b) make event handler for row removal:
    $('#btnRmvMat').click(function () {
        var matOptsArr = [];
        EnDisButt('Disabled', '#btnRmvMat');
        EnDisButt('Disabled','#btnUseMat');
        var anSelected = fnGetSelected(oMatOptTable);
        if (anSelected.length !== 0 && stack.Materials.length > 0) {
            var rowIndex = oMatOptTable.fnGetPosition($(anSelected).closest('tr')[0]);
            stack.Materials.splice(rowIndex, 1);
            matOptsArr = makeOptsArr(stack.Materials);
            oMatOptTable.fnClearTable();
            if (matOptsArr.length > 0) {
                oMatOptTable.fnAddData(matOptsArr);
            }
        }
            //console.log('stack.Materials: ',stack.Materials);
    });

//Tabs-8: Materiaalilistaan Label tulee tiedostonimesta, mika sattaa olla 'hankala'
//alustetaan delegaatti mahdollistamaan (2.:n sarakkeen) editointi:
    oMatOptTable.on('dblclick', 'td:nth-child(2)', function (evt) {
        //oMatOptTable.delegate(" td:nth-child(2)", "contextmenu", function () {
        EnDisButt('Disabled', '#btnRmvMat');
        if ($(this)[0].editing) {
            //ilman tata tarkistusta editable funktio voi liipaistua
            //uudelleen, mika aiheuttaa virheen ja ilmoituksen:
            //"too much recursion"
            return;
        }
        $(this).editable(function (value, settings) {
            return (value);
        },
        {tooltip: 'Click selects row, dblclick edits Label',
        //huom. jquery.jeditable.js:ssa oletuksena on click.editable
        event: 'dblclick.editable',
        onsubmit: function (settings, td) {
            var input = $(td).find('input');
            var original = input.val();
            if (original.length > 0) {
                return true;
            }else {
                //input.css('background-color','#c00').css('color', '#fff');
                return false;
            }
        },
        "callback": function (value, settings) {
            //kelpuutetun uuden arvon prosessointi taulukkoon:
            var matOptsArr = [];
            var aPos = oMatOptTable.fnGetPosition(this);
            stack.Materials[aPos[0]].Name = value;
            matOptsArr = makeOptsArr(stack.Materials);
                if (matOptsArr.length > 0) {
                    oMatOptTable.fnClearTable();
                    oMatOptTable.fnAddData(matOptsArr);
                }
        },
        "height": "14px",
        "width": "100%"
        });
        $(this).dblclick();
    });

//Tabs-8: save material data to a local directory
    /*$('#cl').click(function () {
        var seivString;
        var failneim = $('#ediMater').val();
        //ToDo: build saveString from materials data
        //ToDo: take filename proposal from inputput box
        seivString = 'Hellot worldit';
        failneim = 'huihai.txt';
        seiv_loucal(failneim, seivString);
    });*/

// Tabs-7 and Tabs-8: Save button click handler:
    $('#btnSaveMat, #btnSaveTarg, #btnSaveStack').click(function(){
        //console.log('klikattu: '+this.id);
        //alert('nappi: ' + this.id);
        var selDirTxt;
        var srvrFileTxt;
        var saveLegend='';
        switch (this.id) {
            case 'btnSaveMat':
                selDirTxt = 'Materials';
                srvrFileTxt = 'Save material data to';
                $('#mongFileDesc').val($('#descMater').val());
                $('#mongFileDescLbl').text('Material file description:');
                saveLegend= (userName=='No login')?
                "Material files in public directory":"Material files in "+userName+"\'s directory";
                break;
            case 'btnSaveTarg':
                selDirTxt = 'Targets';
                srvrFileTxt = 'Save target data to';
                $('#mongFileDesc').val($('#descTarge').val());
                $('#mongFileDescLbl').text('Target file description:');
                saveLegend= (userName=='No login')?
                "Target files in public directory":"Target files in user\'s directory";
                break;
            case 'btnSaveStack':
                selDirTxt = 'Stacks';
                srvrFileTxt = 'Save stack data to';
                $('#mongFileDescLbl').text('Stack file description:');
                $('#mongFileDesc').val($('#descStack').val());
                saveLegend= (userName=='No login')?
                    "Stack files in public directory":"Stack files in user\'s directory";
                break;
            default:
                alert('No server file access for: '+selDirTxt);
        }
        DFmngo
            .css('display', 'inline')
            //.dialog('option','title', "Server upload to "+selDirTxt+" directory")
            .dialog('option','title',srvrFileTxt )  // which mongo db collection
            .dialog('open');
        $('#FilTreLege').text(saveLegend);
        return;
    //---------
    });

//Tabs-8: delete one row in material data editor table
    $('#btnDelMatRow').click(function () {
        var anSelected = fnGetSelected(oMatTable);
        var rowS = matrlArr.length - 1;
        var rowIndex;
        if (anSelected.length !== 0 && rowS > 1) {
            rowIndex = oMatTable.fnGetPosition($(anSelected).closest('tr')[0]);
            matrlArr.splice(rowIndex + 1, 1);
            oMatTable.fnClearTable();
            oMatTable.fnAddData(matrlArr.slice(1));
            $('#matEditTabl').find('th:eq(0)').text("Wavel. [" + matrlArr[0][0] + "]");
            plotNK(matrlArr, 8); //tämäkö?
            $('#ediMater').val('Unsaved material');
            $('#descMater').val('Edited material data');
        }else {
            rowIndex = oMatTable.fnGetPosition($(anSelected).closest('tr')[0]);
            alert("Cannot remowe row No: " + rowIndex + " !");
        }
        EnDisButt('Disabled', '#btnDelMatRow');
        EnDisButt('Disabled', '#btnAddMatRow');
    });

//Tabs-8: materiaalilistalle lisäyksen handleri:
    $('#btnAddMatRow').click(function () {//Click handler for 'Add row' in material data editor
        var uusDat;
        uusDat = [];
        var anSelected = fnGetSelected(oMatTable);
        EnDisButt('Disabled','#btnUseMat');
        rowIndex = oMatTable.fnGetPosition($(anSelected).closest('tr')[0]);
        if (anSelected.length !== 0) {
            uusDat = [anSelected.find('td:eq(0)').html(), "n", "k"];
            matrlArr.splice(rowIndex + 1, 0, uusDat);
            //sortataan data aallonpituuden mukaan:
            matrlArr = sorttaa(matrlArr);
            oMatTable.fnClearTable();
            oMatTable.fnAddData(matrlArr.slice(1));
            $('#matEditTabl').find('th:eq(0)').text("Wavel. [" + matrlArr[0][0] + "]");
            plotNK(matrlArr, 8);
            $('#ediMater').val('Unsaved material');
            $('#descMater').val('Edited material data');
        }
    });

//Tabs-8: tehd��n nk-taulukko editoitavaksi:
    oMatTable.on('dblclick', 'td', function (evt) {
        //oMatTable.delegate("td", "contextmenu", function () {
        if ($(this)[0].editing) {
            //ilman t�t� tarkistusta editable funktio voi liipaistua
            //uudelleen, aiheuttaen virheen ja ilmoituksen:
            //"too much recursion"
            return;
        }
        $(this).editable(function (value, settings) {
            return (value);
        },
        {tooltip: 'Click to select row, dblclick to edit',
        //event : 'contextmenu.editable', //huom. jquery.jeditable.js:ssa oletuksena on click.editable
        event: 'dblclick.editable',
        onsubmit: function (settings, td) {
            var input = $(td).find('input');
            var original = input.val();
            if (isNumeric(original)) {
                return true;
            }else {
                input.css('background-color', '#c00').css('color', '#fff');
                return false;
            }
        },
        "callback": function (value, settings) {
            //kelpuutetun uuden arvon prosessointi:
            var aPos = oMatTable.fnGetPosition(this);
            matrlArr[aPos[0] + 1][aPos[1]] = value;
            matrlArr = sorttaa(matrlArr);
            oMatTable.fnClearTable();
            oMatTable.fnAddData(matrlArr.slice(1));
            $('#matEditTabl').find('th:eq(0)').text("Wavel. [" + matrlArr[0][0] + "]");
            plotNK(matrlArr, 8);
            $('#ediMater').val('Unsaved material');
            $('#descMater').val('Edited material data');
        },
        "height": "14px",
        "width": "100%"
        });
            $(this).dblclick();
    });
//Code for tabs-8 ended here---------------------

// Get selected row
    function fnGetSelected(oTableLocal) {
        return oTableLocal.$('tr.row_selected');
    }

    function isNumeric(value) {
        //if ((value == null) || !value.toString().match(/^[-]?\d*\.?\d*$/)) return false;
        if ((!value.toString().match(/^\d*\.?[0-9]+([eE][-][0-9]+)?$/)) || (!value)) return false;
            return true;
    }
    //var regex = /Film-No:\s[0-9]+/g;

//Tabs-6, 7 & 8 Handler for input-file, for reading local files:
    $("#matLocFiles, #targLocFiles, #stackLocFiles").on("change", function () {
        var selected_file = '';
        switch (this.id) {
            case 'matLocFiles':
                selected_file = $('#matLocFiles').get(0).files[0];
                if (!selected_file) return;
                //matrlFileNme = selected_file.name;
                $("#ediMaterLbl").text("Local File: ");
                //console.log('this.value: '+this.value);
                $('#ediMater').val(this.value);
                break;
            case 'targLocFiles':
                selected_file = $('#targLocFiles').get(0).files[0];
                if (!selected_file) return;
                $('#ediTarge').val(selected_file.name);
                $("#ediTargeLbl").text("Local File:");
                break;
            case 'stackLocFiles':
                //#stackLocFiles is hidden 'file input' on Tabs-6
                selected_file = $('#stackLocFiles').get(0).files[0];
                //console.log('selected stack file:',selected_file);
                if (!selected_file) return;
                $('#ediStack').val(selected_file.name);
                $("#ediStackLbl").text("Local File:");
                break;
        }
        //Read local file with callback:
        ReadLocFle(selected_file, gotTextFile);
    });

    function sorttaa(aRRay) {
        var tmpR1 = aRRay.slice(0, 1); //t�ss� vain ensimm�inen rivi
        var tmpR2 = aRRay.slice(1); //t�ss� loput
        tmpR2.sort(function (a, b) {//sortataan ensimm�isen sarakkeen [0] mukaan:
            return a[0] - b[0];
        });
        return tmpR1.concat(tmpR2);
    }

//Tabs-8: Materialien  taulukko muutetaan editoitavaksi:
    oMatOptTable.on('click contextmenu', 'td', function (evt) {
        //var rowInd0 = 0;
        //rowInd0 = oMatOptTable.fnGetPosition($(this).closest('tr')[0]);
        //Huom! 'click contextmenu' on joko (vasen click) tai (oikea click)
        if (evt.which !== 1) {
            //oikeanpuoleinen klikkaus, estet��n contextmenun avaus:
            //alert("klikkaus oikealla");
            evt.preventDefault();
            //k�ytet��n contextmenu eventti� vasta otargTable.delegatessa
            if (oMatOptTable.$('tr.row_selected').length !== 0) {
                oMatOptTable.$('tr.row_selected').removeClass('row_selected');
            }
            //console.log('nappi:'+evt.which);
            //return;
        }else {//vasemmanpuoleinen hiiren nappi:
            if ($(this).closest('tr').hasClass('row_selected')) {
                $(this).closest('tr').removeClass('row_selected');
                $(".ui-dialog-buttonpane button:contains('Delete Selected')")
                    .attr("disabled", true)
                    .addClass("ui-state-disabled");
                $(".ui-dialog-buttonpane button:contains('Update Label')")
                    .attr("disabled", true)
                    .addClass("ui-state-disabled");
            }else {
                oMatOptTable.$('tr.row_selected').removeClass('row_selected');
                $(this).closest('tr').addClass('row_selected');
                $(".ui-dialog-buttonpane button:contains('Delete Selected')")
                    .attr("disabled", false)
                    .removeClass("ui-state-disabled");
                $(".ui-dialog-buttonpane button:contains('Update Label')").attr("disabled", false)
                    .removeClass("ui-state-disabled");
            }
        }
    });

//ilman seuraavaa funktiota reflektanssi/transmissio seke� n-k-Graafit eiv�t
//skaalaudu oikein sivun kokoa muutettaessa

    $(window).resize(function () {
        // redraw the graphs in the resized divs:
        plotRT(targArr, 7);//tämäkö?
        plotNK(matrlArr, 8);
        //plotNK(matrlArr, 8);
        //ToDo:check resize-scaling in stack plot
    });
});
//***********************************************************************
//**End of document ready  jQuery  function

function tuneOneTime(){
    var ii=stackArr.length;
    var tunePerz=stack.settings.tunePrcnt;
    for (var i=0;i<ii;i++){
        if (stackArr[i][3]==="Yes") {//layer is selected for thickness tuning
            stackArr[i][2] *= (1 + tunePerz/100);
            stackArr[i][2]=(Math.round(stackArr[i][2]*1000))/1000;
            //stack.Layers[i][2]=stackArr[i][2];
        }
    }
    oStackTable.fnClearTable();
    oStackTable.fnAddData(stackArr);
    var diffs=evalDif();
    $('#tuneVar').val(diffs.difVar);
    $('#tuneDif').val(diffs.difAve);
    updRTspArra();
    updGraph();
}

function StackTargSelUpd() {
    var stckT=$('#stackTargs');
    stckT.empty();
    stckT.append('<option selected="selected" value="whatever">List is empty</option>');
    //$('#stackTargs option[html=selTarg]').prop('selected', 'selected').change();
    var n = stack.Targets.length;
    var selN;
    for (var i = 0; i < n; i++) {
        if (i == 0) {
            //spectral targets are available insert heading for options:
            stckT.empty();
            stckT.append($('<option></option>').val(0).html('Select:'));
        }
        stckT.append($('<option>', {
            value: i+1,
            text: stack.Targets[i].Name
        }));
        //console.log('stack.Targets[i].Name: ',stack.Targets[i].Name);
        if (stack.settings.usedTarg==stack.Targets[i].Name){
            selN=i+1;
        }
        //stckT.append($('<option></option>').val(i).html(stack.Targets[i].Name));
    }
    //console.log('selTarg: ',selN);
    if (stack.settings.usedTarg!=""){
        $('#stackTargs option').prop('selected', false);
        $('#stackTargs option[value="' + selN + '"]').prop('selected', 'selected');
    }
}

/**
 * Function to add a R- or T-spectrum to the targets menu
 * @function
 * @param fileName (text) giving the filename on server or on local drive
 * @param nickName (text) giving the name to be used on the targets menu
 * @param ownr (text) indicates the data file location: local or under publ or user name on server
 * @param rawArr (array) Spectral data of the reflectance or transmittance target
 *
 */
function addTo_specOpts(fileName, nickName, ownr, rawArr) {
    var tempObj = {
        File: fileName, //fileName with path
        Name: nickName, //short name for use in calculations
        Owner: ownr,    //local, publ or userName
        Data: rawArr    //numeric data in array in format: [[],[],[],....]
        // On first line: [(Unit:nm, um or eV),(R or T),(% or abs)]
    };
    stack.Targets.push(tempObj);
}

//Add material to menu list of materials
/**
 * Function to add a nk-spectrum to the materials menu
 * @function
 * @param fileName (text) Filename on server or local drive
 * @param nickName (text) Name to be used on the materials menu
 * @param ownr (text) data file location: local, library or under user name in the server
 * @param rawArr (array) spectral nk-data for the material
 * On array first line: [(Unit:nm, um or eV),'n','k']
 */
function addTo_matOpt(fileName, nickName, ownr, rawArr) {
    var tempObj = {
        File: fileName,
        //Filename with path for server file, full filepath is not allowed on browsers with local files
        Name: nickName,
        //Initialized as filename without file ending .*** (can be edited while browsing)
        Owner: ownr,
        // 'Local' for local files owner
        // 'Library' for public server files
        // =userName for private files
        Data: rawArr
        // wavelength vs n and k- data
    };
    stack.Materials.push(tempObj);
    //console.log('stack: ',JSON.stringify(stack));
}

function setSpinners(){
    switch (stack.settings.spUnit) {
        case 'nm':
            $("#SpStart").spinner({
                max: stack.settings.spStop,
                min: 300,
                step:1
            }).val(stack.settings.spStart);
            $("#SpStop").spinner({
                max: 5000,
                min: stack.settings.spStart,
                step: 1
            }).val(stack.settings.spStop);
            $("#lblStartUn").text("[ nm ]");
            $("#lblStopUn").text("[ nm ]");
            break;
        case 'um':
            $("#SpStart").spinner({
                max: stack.settings.spStop / 1000,
                min: 0.300,
                step:0.001
            }).val(stack.settings.spStart / 1000);
            $("#SpStop").spinner({
                max: 5.000,
                min: stack.settings.spStart / 1000,
                step: 0.001
            }).val(stack.settings.spStop / 1000);
            $("#lblStartUn").text("[ um ]");
            $("#lblStopUn").text("[ um ]");
            break;
        case 'eV':
            var tmpT = (1239.8 / stack.settings.spStart).toFixed(4);
            var tmpP = (1239.8 / stack.settings.spStop).toFixed(4);
            var tmpD = ((tmpT - tmpP) / 600).toFixed(7);
            $("#SpStart").spinner({
                step: tmpD,
                max: (1239.8/300).toFixed(4),
                min: tmpP
            }).val(tmpT);
            $("#SpStop").spinner({
                step: tmpD,
                max: tmpT,
                min: (1239.8/5000).toFixed(4)
            }).val(tmpP);
            $("#lblStartUn").text("[ eV ]");
            $("#lblStopUn").text("[ eV ]");
            break;
        default:
            $("#SpStart").spinner({
                step: 1,
                max: stack.settings.spStop,
                min: 300
            }).val(stack.settings.spStart);
            $("#SpStop").spinner({
                step: 1,
                max: 5000,
                min: stack.settings.spStart
            }).val(stack.settings.spStop);
            $("#lblStartUn").text("[ nm ]");
            $("#lblStopUn").text("[ nm ]");
    }
}

//Tabs-7 & Tabs-8 nappien enablointi disablointi:
function EnDisButt(enDis, Butto) {
    //alert(Butto +': '+enDis);
    //Enables / Disables Add and Delete buttons
    if (enDis == 'Disabled') {
        $(Butto).disabled = true;
        $(Butto).attr("disabled", "disabled");
        $(Butto).addClass('ui-button-disabled ui-state-disabled');
    }
    else {
        $(Butto).disabled = false;
        $(Butto).removeAttr("disabled");
        $(Butto).removeClass('ui-button-disabled ui-state-disabled');
    }
}

/**
 * Function to calculate reflectivity at a surface with
 * differing refractive indices
 * @function
 * @param Nincid (Complex) complex refractive index of incidence material
 * @param Nexit (Complex) complex refractive index of exiting material
 * @return Rprcnt (number) reflectance in percents of intensity
 */
function reflCalc(Nincid,Nexit){
    var x = Nincid.sub(Nexit);//substracts two complex numbers
    var y = Nincid.add(Nexit);//adds two complex numbers
    var z=x.divBy(y);//divides two complex numbers
    var Rprcnt = 100*z.mult(Complex.conj(z));
    return Rprcnt.abs();
}

/**
 * Function builds a comlex refracrive index
 * @function
 * @param (number) n - refractive index
 * @param (number) k - extinction index
 * @return (Complex) N - complex refractive index
 */
function complN(n,k){
    var N = Math.Complex(n,k);
    return N;
}

function matrixMult() {
    var tmpAng=stack.settings.angle*Math.PI/180;
    var theta0=Math.Complex(tmpAng,0);// is the complex incidence angle
    var k = stackArr.length; //number of material layers
    var kk = spArra.length;  //number of wavelength points to evaluate (starts from index 1)
    for (var ii = 1; ii < kk; ii++) {//****looping through all spectral wavelength points***
        var lambda=spArra[ii][0];//wavelength ii
        var N0=Math.Complex(stackArr[0][4][ii],-stackArr[0][5][ii]);
        var eta0= stack.settings.polaris == "TE" ? N0.mul(theta0.cos()) : N0.div(theta0.cos());
        //eta0 is the propagation index in cover (incidence) material
        var Ns=Math.Complex(stackArr[k-1][4][ii],-stackArr[k-1][5][ii]);//complex refractive index of substrate
        var thetas=(theta0.sin().mul(N0.div(Ns))).asin();//complex angle in substrate
        var etas = stack.settings.polaris == "TE" ? Ns.mul(thetas.cos()) : Ns.div(thetas.cos());
        //etas equals the complex propagation index in substrate
        var etm0=Math.Complex(1,0);//starting value(=1) for result vector, topmost cell
        var etm1=etas;  //starting value for result vector, bottommost cell (=eta in substrate)
        //****loops through all material layers, starting multiplication from first layer on substrate:*****
        for (var i = k-2; i > 0; i--) {
            if (!stackArr.ready) break;
            var Nm=Math.Complex(stackArr[i][4][ii],-stackArr[i][5][ii]);//complex refractive index for layer
            var thetam=(theta0.sin().mul(N0.div(Nm))).asin();//propagation angle in layer
            var cosThetaM=thetam.cos();
            var etam = stack.settings.polaris == "TE" ? Nm.mul(cosThetaM) : Nm.div(cosThetaM);
            var deltaR=lambda>0? Math.Complex(2*Math.PI*stackArr[i][2]/lambda,0).mul(Nm.mul(cosThetaM)):NaN;
            var x11=deltaR.cos();
            var x12=Math.Complex(0,1).mul(deltaR.sin().div(etam));
            var x21=Math.Complex(0,1).mul(etam.mul(deltaR.sin()));
            var x22=x11;
            //Det=x11.mul(x22).sub(x21.mult(x12)); //used for checking: should always give: 1 !
            //console.log('Determinant: '+ Det;
            var etm0t=x11.mul(etm0).add(x12.mul(etm1));
            var etm1t=x21.mul(etm0).add(x22.mul(etm1));
            etm0=etm0t;
            etm1=etm1t;
        }
        var Yy= etm0.abs()>0 ? etm1.div(etm0): NaN;
        var roo= (eta0.add(Yy)).abs()>0 ? ((eta0.sub(Yy)).div(eta0.add(Yy))).abs(): NaN;
        var cetm1=etm1.con();
        var hh=cetm1.mul(etm0).re;
        var bb=stackArr[k-1][4][ii];
        var tee=(1-roo*roo)*bb/hh;//Equ: 2.104 in mcLeod
        //pick what is requested; reflectance or transmittance
        if (stack.settings.RorT == "R") {//reflectance is calculated
            if (!stack.settings.backR && !stack.settings.frontR){//Backside and front reflections are not included
                spArra[ii][1] = roo * roo * 100;
            }
            else {//Backside is included
                if (stack.settings.backR) {
                    var Rb = ((eta0.sub(etas)).div(eta0.add(etas))).abs(), //back surface reflectivity
                        alfa = 4 * Math.PI / spArra[ii][0] * (etas.im), //substrate absorption index with propagation angle
                        D = $("#sThickn").spinner("value")*1000; //Substrate thickness in nm:
                    Rb *= Rb;//backside intensity reflectance
                    var Rtmp = Math.exp(2 * alfa * D) * Rb * tee * tee / (1 - roo * roo * Rb * Math.exp(2 * alfa * D));
                    spArra[ii][1] = (roo * roo + Rtmp) * 100;
                }
                else {//front reflection is included
                    //air with index 1 is assumed as the first and topmost material
                    var Nt=Math.Complex(1,0); //refractive index in air assumed as 1.
                    //but incidence angle is still given in eta0
                    var thetaT=(theta0.sin().mul(N0.div(Nt))).asin();//complex angle in topmost mat: Air
                    var etaT=thetaT.cos(); //with oblique incidence this leads to error in absorbing cover materials
                    var Rt = ((eta0.sub(etaT)).div(eta0.add(etaT))).abs(), //top surface reflectivity
                        alfa = 4 * Math.PI / spArra[ii][0] * (eta0.im),//cover.mat absorption index with propagation angle
                        D = $("#cThickn").spinner("value")*1000; //Cover.mat thickness in nm:
                    Rt *= Rt;//front surface intensity reflectance
                    var Ttmp = Rt+ Math.exp(2*alfa*D)*(1-Rt)*(1-Rt)*roo*roo/(1-Math.exp(2*alfa*D)*roo*roo*Rt);
                    spArra[ii][1] = Ttmp * 100;
                }
            }
        }else {//Transmittance is calculated
            var cetm1=etm1.con();
            var hh=cetm1.mul(etm0).re;
            var bb=stackArr[k-1][4][ii];
            var tee=(1-roo*roo)*bb/hh;//Equ: 2.104 in mcLeod
            if (!stack.settings.backR && !stack.settings.frontR){//Backside or front reflectivity are not included
                spArra[ii][1] = tee*100;
            }else {//either backside or front reflectance is to be included
                if (stack.settings.backR) {
                    var Rb = ((eta0.sub(etas)).div(eta0.add(etas))).abs(), //back surface reflectivity
                        alfa = 4 * Math.PI / spArra[ii][0] * (etas.im), //substrate absorption index with propagation angle
                        D = stack.settings.SubstrD;//Substrate thickness in nm:
                    Rb *= Rb;//backside intensity reflectance
                    var Ttmp = Math.exp(alfa * D) * (1 - Rb) * tee / (1 - Math.exp(2 * alfa * D) * roo * roo * Rb);
                    spArra[ii][1] = Ttmp * 100;
                }
                else {
                    //air with index 1 is assumed as the first and topmost material
                    //todo:refractive index of air!!
                    var Nt=Math.Complex(1,0); //refractive index in air assumed as 1.
                    //but incidence angle is still given in eta0
                    var thetaT=(theta0.sin().mul(N0.div(Nt))).asin();//complex angle in topmost mat: Air
                    var etaT=thetaT.cos(); //with oblique incidence this leads to error in absorbing cover materials
                    var Rt = ((eta0.sub(etaT)).div(eta0.add(etaT))).abs(), //top surface reflectivity
                        alfa = 4 * Math.PI / spArra[ii][0] * (eta0.im),//cover.mat absorption index with propagation angle
                        //D = $("#cThickn").spinner("value")*1000; //cover.mat thickness in nm:
                        D = stack.settings.CoverD; //cover.mat thickness in nm:
                    Rt *= Rt;//front surface intensity reflectance
                    var Ttmp = Math.exp(alfa * D) * (1 - Rt) * tee / (1 - Math.exp(2 * alfa * D) * roo * roo * Rt);
                    spArra[ii][1] = Ttmp * 100;
                }
            }
        } //calculated either R% or T% into spArra
    } //wavelengths loop ends
}

/*t�ll� rakenteella voi lis�t� omia funktioita jqueryyn:
 (function($){
 $.fn.extend({
 huuhaas: function(text) {
 console.log(text);
 console.log('huuhaas');
 return text+ ' huuhaa ittelles vaan!';
 }
 //another_method: function()}{
 // Another method code
 //}
 });
 })(jQuery); */
