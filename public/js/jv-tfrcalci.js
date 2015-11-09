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
 * jQuery library has to be included in the head section of the html-files through a line eq.:
 * script(src='/bower_components/jquery/dist/jquery.min.js')
 *
 * The function is included in the web-page html file through head section line:
 * script(src='/RefTran/js/jv-tfrcalc.js')
 * The script runs automatically after the HTML5 document has been loaded and parsed ready
 * on the browser. In automatic execution it is equivalent to
 * (=shorthand) to '$(document).ready(function(){xxx})'.
 * This procedure is necessary because, premature script execution is useless and erroneous on elements that
 * have not yet been parsed and available for script interactions.
 */
    $(function() {
        alert('jv-tfrcalci toimii');
        // Variable declarations:
         var aTreeData;   //Data object holding directory tree JSON data from mongo database
         var backR;       //true or false back reflection included or not
         var dirUser='Publ'; //server directory user default
         var DFmngo;
         var frontR;         //true or false front reflection included or not
         var locReader = new FileReader();
         var matrlArr=[];    //first row: [nm|um|eV, n, k]
         var matrlFileNme;
         //to initialize material string with some n and k values to show in table and graph:
         var matrlStr = "nm\tn\tk\r\n500\t1.0\t0.0\r\n510\t1.5\t0.2\r\n520\t1.2\t0.4";
         var matOpt = [];    //materials to be used in calculations, including their nk-tables,
         var nkPlot;         //Graph for n&k Data
         var oMatOptTable = {};
         var oMatTable={};   //objekti, materiaalilista dataTables widgettiä varten
         var oStackTable = {};
         var oTargOptTable = {};
         var otargTable = {};  //objekti, targettilista dataTables widgettiä varten
         var polaris;          //porization direction 'TE' (s) or 'TM' (p)
         //var resTarg = [,]; //Array for calculation result and target
         var RorT = 'R';    //Spectrum type R (=default) for reflectance T for transmittance
         var rowInd1 = 0;
         var RTPlot;        //Graph for R&T Data
         var selctdNde={};   //selected node in jsTree
         var spArra=[,,];   //spectral points array for calculations and display
         var spNum=201;     //number of spectral points
         var spectOpts = [];//list of selected target or measured spectra
         var spStart=400;   //first spectral point in calculations
         var spStop=1000;   //last spectral point in calculations
         var spUnit='nm';   //käytössä oleva spektrin yksikkö (nm oletus),
         //initialize film stack to have only substrate and cover materials:
         //refractive index data is added as n- and k-vectors to the end of each stack line:
         var stackArr = [['Cover','DblClick to edit!','bulk','no'],['Substr.','DblClick to edit!','bulk','no']];
         //ToDo: siirrä stackArr:in alustus document ready funktioon:
         var stackPL;       //Graph for stack R|T or film nk
         var userName = 'No login'; // after login obtained from web-server
         var targArr = [];
         //initialize target string with some R% values to show in table and graph:
         var targStr = "nm\tR\t'sample data'\r\n500\t55.0\r\n510\t54.0\r\n520\t55.0";
         var targtFileNme;
         var theta0;        //complex incidence angle
        var uName;
        if (window.sessionStorage.getItem('RTFtoken') && window.sessionStorage.getItem('RTFtoken').length>0){
            userName=window.sessionStorage.getItem('RTFuser');
        }else{
            uName='No login';
        }
        console.log('username: '+uName);
        $( "#tabis" ).tabs();
    });





 		











