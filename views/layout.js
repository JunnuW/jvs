/**
 * Created by Juha on 4/16/2017.
 */
//for google analytics:
(function (i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;
    i[r] = i[r] || function () {
            (i[r].q = i[r].q || []).push(arguments)
        },
        i[r].l = 1 * new Date();
    a = s.createElement(o),
        m = s.getElementsByTagName(o)[0];
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m)
})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');
ga('create', 'UA-97032034-1', 'auto');
ga('send', 'pageview');

var tokenee = window.sessionStorage.getItem('RTFtoken');
var userLuser = window.sessionStorage.getItem('RTFuser');
if (userLuser==null||userLuser=='No login'||userLuser=='No Login'){
    $('#userN').text('No login');
    $("#lokoutti2").css('display','none');
}else{
    $('#userN').text('User: '+ userLuser);
    $("#lokoutti2").css('display','inline');
}
vanhentunutko();
$('#hoiMenu').click(function () {
    var tokenee = window.sessionStorage.getItem('RTFtoken');
    var userLuser=window.sessionStorage.getItem('RTFuser');
    //as default assume no login:
    //$('#userN').text(userLuser);
    $('#lokoutti').hide();  //piilottaa menusta pois 'logout' option
    $('#pwdchangi').hide(); //piilottaa menusta pois 'password change' option
    $('#loginni').show();   //näyttää menussa 'login' option
    $('#signuppi').show();  //näyttää menussa 'signup' option
    if (userLuser != null && userLuser != 'No login') {//user has logged in but is that still valid?
        var loginStatus = $.post('/checklogin', {
            userNme: userLuser,
            rtftoken: tokenee
        }).done(function (data, status, xhr) {
            if (data) {
                //console.log('checklogin: ', data);
                if (data.token == 'valid') {//login is ok, set menus:
                    $('#lokoutti').show();
                    $('#pwdchangi').show();
                    $('#loginni').hide();
                    $('#signuppi').hide();
                } else {//invalid token set menus:
                    window.sessionStorage.setItem('RTFuser', 'No login');
                    window.sessionStorage.setItem('RTFtoken', null);
                }
            }
        })
    }
});
$('#lokoutti, #lokoutti2').click(function(){
    window.sessionStorage.setItem('RTFuser', 'No login');
    window.sessionStorage.setItem('RTFtoken', null);
    $('#userN').text('No login');
    $("#lokoutti2").css('display','none');
    $('#userMes').text('No Login');         //on custmesgs page
    $('#btnSaveMsg').attr("disabled", true);//on custmesgs page
    //class="disabled"
});

function vanhentunutko() {
    var today = new Date();
    var aika=myTime(today);
    var jokovanha = setTimeout(vanhentunutko, 60000); //minuutin päästä uusi tarkistus
    var userLuser = window.sessionStorage.getItem('RTFuser');
    if (userLuser == null || userLuser == 'No login' || userLuser == 'No Login') {
        console.log('login ei voimassa, ei tarkisteta voimassa oloa:',aika);
        $('#lokoutti').hide();
        $("#lokoutti2").hide();
        $('#pwdchangi').hide();
        $('#loginni').show();
        $('#signuppi').show();
        $('#userN').text('No login');
        clearTimeout(jokovanha); //ei tarvitse ajastettua tarkistusta, on jo vanhaksi todettu
        return;
    } else {
        //console.log('tarkistetaan onko login voimassa: ',aika);
        var loginStatus = $.post('/checklogin', {
            userNme: userLuser,
            rtftoken: tokenee
        }).done(function (data, status, xhr) {
            if (data) {
                //console.log('checklogin: ', data);
                if (data.token == 'valid') {//login is ok, set menus:
                    $('#lokoutti').show();
                    $('#lokoutti2').show();
                    $('#pwdchangi').show();
                    $('#loginni').hide();
                    $('#signuppi').hide();
                } else {//invalid token set menus:
                    window.sessionStorage.setItem('RTFuser', 'No login');
                    window.sessionStorage.setItem('RTFtoken', null);
                    $('#lokoutti').hide();
                    $("#lokoutti2").hide();
                    $('#pwdchangi').hide();
                    $('#loginni').show();
                    $('#signuppi').show();
                    $('#userN').text('No login');
                    $('#userMes').text('No Login');         //on custmesgs page
                    $('#btnSaveMsg').attr("disabled", true);//on custmesgs page
                }
            }
        })
    }
}

function myTime(today){
    var h = today.getHours();
    var m = today.getMinutes();
    var s = today.getSeconds();
    s = (s<10)? "0"+s: s;
    m = (m<10)? "0"+m: m;
    h = (h<10)? "0"+h: h;
    var aikaon=h + ":" + m + ":" + s;
    return aikaon;
}
