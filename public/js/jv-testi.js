
    $(function() {
        var uName;
        if (window.sessionStorage.getItem('RTFtoken')&&window.sessionStorage.getItem('RTFtoken').length>0){
            userName=window.sessionStorage.getItem('RTFuser');
        }else{
            uName='No login';
        }
        console.log('username: '+uName);
        $( "#tabsiX" ).tabs();
    });





 		











