/**
 * Created by Juha on 4/16/2017.
 */
// jQuery assignments:
var msgThread=$('#msgThread');
var btnSaveMsg=$('#btnSaveMsg');
var userMes=$('#userMes');
var msgTree=$('#msgTree');
var lblHeader=$('#lblHeader');
var msgHeader=$("#msgHeader");
var msgText=$("#msgText");
var msgLbl=$('#msgLbl');
var msgUser=window.sessionStorage.getItem('RTFuser');
var disa=(msgUser && msgUser=='Publ')? false:true;
msgThread.prop('disabled', disa); //remains always disabled except for Publ
if (msgUser && msgUser!='No login'){
    countMessages(msgUser); //counts messages and updates userN label
    btnSaveMsg.attr("disabled", false);
}else{//no login:
    btnSaveMsg.attr("disabled", true);
    userMes.text(msgUser); //=No login
}

var bTreeData = [
    {//-dummy data for message tree
        "text": "Root nod", "children": [
        {"text": "Child node 1"},
        {"text": "Child node 2"}
    ]
    }
];

/*console.log('userN: ',$('#userN').text());
 $('#userN').change(function(){
 console.log('userN muuttui');
 });*/


var mesTree = msgTree.jstree({
    'core': {
        "check_callback": true,
        "data":bTreeData
    }
});

//reads and updates msge tree with all moderated messages:
msgTreeUpdate();

btnSaveMsg.click(function () {//-can be: 'Create message' or 'Save message':
    if (msgUser.length < 1 || msgUser == 'No login') {
        //should never leak here, while this button is disabled for 'No login'
        $.notifyBar({//alert reason for token failure is in data
            cssClass: "error",
            html: 'Please login for messaging '
        });
        return;
    }
    //determine operation: 'Create message' or 'Save message':
    var butCapt=$(this).text();
    //-tai: $('#btnSaveMsg').text();
    if (butCapt=='Create message'){
        lblHeader.css('display','inline');
        msgHeader.css('display','inline');
        msgText.val('');
        btnSaveMsg.text('Submit message');
        msgLbl.text('New message:');
        msgHeader.val('');
        return;
    }
    //-came here, button caption =='Submit message'
    saveMessage();
    //-counts messages in server, and saves if less than four in moderation
});

/**
 * Function builds and checks the message filename before posting to server
 * @return string mngFileN
 */
function fleNmr() {
    var fNamed;
    var fileN = msgHeader.val();
    fileN = fileN.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
    var myRegxp1 = /^[\sa-zA-Z0-9\?\!\-\_]+$/i;//only alphanumerics with "-","_","!","?"  are allowed
    var myRegxp2 = /^[\sa-zA-Z0-9\?\!\-\_\/]+$/i;//only alphanumerics with "-", "_", "!", "?" and "/"  are allowed
    if (!myRegxp1.test(fileN)) {
        alert("Invalid header in: " + fileN);
        return fNamed;//undefined
    }
    var viestiPuu = msgTree.jstree(true); //get this jstree-instance
    var selctdNde = viestiPuu.get_selected(true)[0];//('get_selected')
    var dirN = makeLongName(selctdNde);
    dirN = dirN.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
    if (!myRegxp2.test(dirN)) {
        alert("Invalid thread: " + dirN);
        return fNamed;//undefined
    }
    if (msgText.val().length < 1) {//no message has been typed
        alert("No message content!");
        return fNamed;//undefined
    }
    var overLap = fileN.indexOf(dirN); //is thread already included in the beginning of messagename?
    fNamed = (overLap == 0) ? fileN : dirN + '/' + fileN;
    fNamed = fNamed.replace(/(^\/)|(\/$)/g, ""); // remove leading and trailing '/'
    return fNamed;
}

function msgTreeUpdate() {
    //bTreeData=[];
    msgHeader.prop('disabled', false);
    msgText.prop('disabled', false);
    //-fetches all moderated message titles on the server:
    //-directly uses messages collection in mongodb:
    var checkAllMsgs = $.post('/auth/getMessages', {
            moderated:'all'
        })
            .done(function (data, status, xhr) {//
                if (data) {
                    //console.log('data received: ',data);
                    if (data.statCode == 200) {
                        bTreeData = JSON.parse(data.resString);
                        //console.log('bTreeData: ',bTreeData);
                        msgTree.jstree(true).settings.core.data = bTreeData;
                        msgTree.jstree(true).refresh();
                    } else {
                        $.notifyBar({
                            cssClass: "error",
                            html: data.error
                        });
                    }
                } else {
                    //console.log('no data received');
                    $.notifyBar({
                        //-position: "bottom",
                        cssClass: "error",
                        html: "could not obtain user messages from server"
                    });
                }
            })
            .fail(function () {
                //console.log('failed to read user messages ');
                $.notifyBar({
                    //-position: "bottom",
                    cssClass: "warning",
                    html: "(Connection or database error)"
                });
            })
        /*.error(function(XMLHttpRequest, textStatus, errorThrown){
         console.log('status:' + XMLHttpRequest.status + ', status text: ' + XMLHttpRequest.statusText);
         })*/
    ;
}

msgTree.on("change.jstree deselect_all.jstree select_node.jstree",
    function (e, data) {
        switch (e.type) {
            case 'deselect_all':
                //deselect all is triggered before new selected cell is activated
                msgThread.val('');
                msgHeader.val('');
                $('#msgTxt').val('');
                break;
            case 'select_node':
                btnSaveMsg.text('Create message');
                lblHeader.css('display','none');
                msgHeader.css('display','none');
                selctdNde = data.instance.get_selected(true)[0];
                msgThread.val(selctdNde.text);
                var longName=selctdNde.text;
                var n=0;
                var findIt=selctdNde.parent;
                var doIf=(findIt!="#");
                while (doIf) {//build long filename for selected node
                    n+=1;
                    if (n>20) break; //avoid infinete loop
                    var parnt='';
                    parnt = bTreeData.filter(function (e) {//find parent:
                        return e.id == findIt;
                    });
                    //console.log('filtered parnt[0].id: ',parnt[0].id);
                    findIt=parnt[0].parent; //to search in previous dir tree level
                    if (findIt.length>0) longName=parnt[0].text+'/'+longName;
                    doIf=(parnt[0].parent.length>0 && parnt[0].parent!='#');
                }
                //read message for the selected node:
                var msgRead = $.post('/auth/getOneMessage', {
                    messageId: selctdNde.id
                })
                    .done(function (data, status, xhr) {//
                        if (data) {
                            //show message in the text area:
                            var thisMessa=JSON.parse(data.resString);
                            msgText.val(thisMessa.uMessage);
                            //show message sender and date on the lbl:
                            var lblText=thisMessa.username+' wrote on '+thisMessa.dateRec;
                            msgLbl.text(lblText);
                        } else {
                            //console.log('message text was not received');
                            $.notifyBar({
                                //position: "bottom",
                                cssClass: "error",
                                html: data.error
                            });
                        }
                    })
                    .error(function (XMLHttpRequest, textStatus, errorThrown) {
                        //console.log('XMLHttpRequest: ',XMLHttpRequest);
                        //console.log('message read textStatus: ',textStatus);
                        //console.log('message read errorThrown: ',errorThrown);
                        $.notifyBar({
                            //position: "bottom",
                            cssClass: "error",
                            html: errorThrown
                        });
                    });
                break;
            default:
                //console.log('default case:');
                break;

        }
    }); //btree on.change ready

function saveMessage(){
    var msgName = fleNmr(); //-builds name for a new message
    if (!msgName) return;
    var msgTxt = msgText.val();
    var mesLen = msgTxt.length;
    if (mesLen > 501) {//max length of message
        $.notifyBar({//alert reason for token failure is in data
            cssClass: "error",
            html: 'Your message is too long'
        });
        return;
    }
    var tokene = window.sessionStorage.getItem('RTFtoken');
    var msgSave = $.post('/auth/messageSave', {
        userNme: msgUser,
        Collection: 'messages',
        rtftoken: tokene,
        fName: msgName,
        Text: msgTxt
    }).done(function (data, status, xhr) {//
        if (data) {
            if (data.token == 'invalid') {
                //-token check returns invalid, otherwise data.token==undefined,
                //-(OK saving does not return token in data)
                window.sessionStorage.setItem('RTFuser', 'No login');
                window.sessionStorage.setItem('RTFtoken', null);
                $.notifyBar({//-alert reason for token failure is in data
                    cssClass: "error",
                    html: data.response
                });
                return;
            }
            if (data.statCode == 200) {//-success in saving
                $.notifyBar({
                    cssClass: "success",
                    html: "Thank's! Your message was send to moderator."
                });
                btnSaveMsg.text('Create message');
                msgHeader.val('');
                msgText.val('');
                countMessages(msgUser);
            } else {
                $.notifyBar({
                    cssClass: "error",
                    html: data.error
                });
            }
        } else {
            $.notifyBar({
                cssClass: "error",
                html: data.error
            });
        }
    })
        .error(function (XMLHttpRequest, textStatus, errorThrown) {
            //-console.log('XMLHttpRequest: ',XMLHttpRequest);
            //-console.log('textStatus: ',textStatus);
            //-console.log('errorThrown: ',errorThrown);
            if (XMLHttpRequest.status == 409) {
                //console.log('409 responseText: ',XMLHttpRequest.responseText);
                var virhe=JSON.parse(XMLHttpRequest.responseText);
                $.notifyBar({
                    cssClass: "warning",
                    html: virhe.resString
                });
            } else {
                $.notifyBar({
                    //position: "bottom",
                    cssClass: "warning",
                    html: "Connection or server database eror: "+ errorThrown
                    //html: errorThrown
                });
            }
        });
}

function userNupdate(data){
    //show message in the text area:
    var MessaCount = JSON.parse(data.MessageCount);
    var viesti = 'You have posted ' + (MessaCount.all - MessaCount.inModeration) + ' messages';
    if (MessaCount.inModeration > 0) {
        viesti = viesti + ' + ' + MessaCount.inModeration + ' in moderation';
    }
    userMes.text(viesti);
}

function countMessages(msgUser){
    var msgCount = $.post('/auth/countMessages', {
        username: msgUser
    })
        .done(function (data, status, xhr) {//
            if (data) {
                userNupdate(data);
            } else {
                //console.log('message count could not be obtained from server');
                var MessaCount ={'all':false,'inModeration':data.error};
                $.notifyBar({
                    cssClass: "error",
                    html: data.error
                });
            }
        })
        .error(function (XMLHttpRequest, textStatus, errorThrown) {
            //console.log('XMLHttpRequest: ',XMLHttpRequest);
            //console.log('message count textStatus: ', textStatus);
            //console.log('message count errorThrown: ', errorThrown);
            $.notifyBar({
                cssClass: "error",
                html: errorThrown
            });
        });
}

function makeLongName(selNod) {
    var longName = selNod.text;
    var n = 0;
    var findIt = selNod.parent;
    var doIf = (findIt != "#"); //already root item
    while (doIf) {//build long filename for selected node
        n += 1;
        if (n > 20) break; //avoid infinite loop
        var parnt = '';
        parnt = bTreeData.filter(function (e) {//find parent:
            return e.id == findIt;
        });
        //console.log('filtered parnt[0].id: ',parnt[0].id);
        findIt = parnt[0].parent; //to search in previous dir tree level
        if (findIt.length > 0) longName = parnt[0].text + '/' + longName;
        doIf = (parnt[0].parent.length > 0 && parnt[0].parent != '#');
    }
    return longName;
}

