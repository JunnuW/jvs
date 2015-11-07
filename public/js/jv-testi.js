/** JV-scripts for TFRCalc
* Use this software at your own risk
* To add user functions to jquery:
* (function ($) {
*	//Private user functions can be added to jquery using this plugin system see::: 
*	//http://jquery-howto.blogspot.fi/2008/12/what-heck-is-function-jquery.html
*  })(jQuery);
*/
/**The $ character in the following function, starting as: '$(function(){xxx});',
 * is aliased to word 'jQuery' [so that $(..) is equal to jQuery(..)], and
 * jQuery library has to be included in the head section of the html-files through line:
 * script(src='/bower_components/jquery/dist/jquery.min.js')
 *
 * The function is included in the web-page html file through head section line:
 * script(src='/RefTran/js/jv-tfrcalc.js')
 * The script runs automatically after the HTML5 document has been loaded and parsed ready
 * on the browser. In automatic execution it is equivalent to
 * (=shorthand) to '$(document).ready(function(){xxx})'.
 * This procedure is necessary because, premature script execution is useless and erroneous on elements that
 * have not yet been parsed and available for script interactions.
 * $(document).ready(function(){}); you can use this shortcut: jQuery(function(){//dom ready codes});
*/
jQuery(function () {
    console.log('running jv-testi');
    //get user name from server:
    //var huuhaa="jj";

   /* var cookies = get_cookies_array();
    for(var name in cookies) {
        console.log('cookiename: '+name+' : '+cookies[name]);
        //document.write( name + " : " + cookies[name] + "<br />" );
    }
    if (cookies.length<1) console.log('no cookies');*/

    //RTFtoken and RTFuser have possibly been set earlier in login (see login.jade):
    if (window.sessionStorage.getItem('RTFtoken')&&window.sessionStorage.getItem('RTFtoken').length>0){
       userName=window.sessionStorage.getItem('RTFuser');
    }else{
       userName='No login';
    }
    console.log('username: '+userName);
    jQuery("#tabsX").tabs({
        //tabs panel täyttää koko näytön korkeuden:
        heightStyle: "fill",
        //seuraava päivittää graafit ja taulukot kun tabsia klikataan:
        activate: function (event, ui) {
            var poisTab=ui.oldTab.index();
            var exitTab=$("#tabsX").find("ul>li a").eq(poisTab).attr('id'); //exitoituvan tabsin id
            //var nextTab =ui.newPanel.attr('id'); //antaa aktivoituvan tabsin href:in
            var nextTab = ui.newTab.index(); //antaa aktivoidun tabs:in indeksin ul:ssä
            var selecTab = $("#tabsX").find("ul>li a").eq(nextTab).attr('id'); //aktivoidun tabsin id
            //var selecTab = $("#tabs ul>li a").eq(nextTab).attr('id');
            console.log('edellinen tabsX',exitTab,' uusi: ',selecTab);
        }

    });



    //--------------------------------------------------------------------------------  
});                                     //***********End of Document ready function*********




 		











