// this table is used for invoking python clinet objects from JS
// it is mapping the clinetID to the actual client object (proxyied via pyodide)
var OCTOPWN_CLIENT_LOOKUP = {};

// session restore data
var loadSessionData = null;

// this is for the window handler for the python application to call
// when a new client is created.
// this will add a new window to the layout
function addNewClientWindow(cid, cliname, description, client) {
    ///https://github.com/golden-layout/golden-layout/issues/30
    var windowtype = 'client';
    if (cliname.search('NOTES') != -1) windowtype = 'notes';
    var newItemConfig = {
        id: 'client-tab-' + cid,
        title: cliname,
        type: 'component',
        componentName: 'mainWindowComponent',
        componentState: {
            text: 'text',
            clientid: cid,
            windowtype: windowtype,
        }
    };
    myLayout.root.contentItems[0].contentItems[0].contentItems[0].addChild(newItemConfig);
    if (cid in OCTOPWN_CLIENT_LOOKUP) {
        // if we already have the client stored then we'd need to destroy the proxy
        // otherwise there will be a memleak
        client.destroy();
    } else {
        OCTOPWN_CLIENT_LOOKUP[cid] = client;
    }

    var cmdhistory = document.getElementById(`history-${cid}`);
    var availableCommandsProxy = client.command_list();
    var availableCommands = availableCommandsProxy.toJs();
    var options = '';
    availableCommandsProxy.destroy();
    for (let i = 0; i < availableCommands.length; i++) {
        options += '<option value="' + availableCommands[i] + '" />';
    }
    cmdhistory.innerHTML = options;

    var table = $('#clientTable').DataTable()
    table.row.add([
        cid,
        cliname,
        description,
        ''
    ]).draw();
    if (windowtype == 'notes') {
        createEditor(cid);
    }
}

function signalClientMessage(cid) {
    // TODO: fix this!!!!
    return;
    var table = $('#clientTable').DataTable()
    var temp = table.row(cid).data();
    temp[2] = '!'; //maybe a warning icon?
    $('#clientTable').dataTable().fnUpdate(temp, 5, undefined, false);
}

function switchActiveClientTab(cid) {
    var contentItem = myLayout.root.getItemsById('client-tab-' + cid)[0];
    contentItem.tab.header.parent.setActiveContentItem(contentItem);
    if (cid == 'P') return;
    var inputbox = document.getElementById('consoleinputfield-' + cid);
    inputbox.focus();
}

async function addNewCredential() {
    var domain = document.getElementById('addCredentialDomain').value;
    var username = document.getElementById('addCredentialUsername').value;
    var secret = document.getElementById('addCredentialSecret').value;
    var keyfile = document.getElementById('addCredentialKeyfile').value;
    var certfile = document.getElementById('addCredentialCertfile').value;
    var secret_type = document.getElementById('addCredentialSecretType');

    var userdomain = username;
    if (domain != '') {
        userdomain = domain + '\\' + username;
    }

    var secrettypename = secret_type.options[secret_type.selectedIndex].text;
    if (secret_type.value == 5) {
        secrettypename = 'P12';
    }
    await octopwnAddCredential(userdomain, secret, secrettypename, certfile, keyfile);
    $('#addCredentialModal').modal('hide');
}

function addNewCredentialKeyTypeChanged(selection) {
    var keyFileDiv = document.getElementById('addNewCredentialKeyFileDiv');
    var certFileDiv = document.getElementById('addNewCredentialCertFileDiv');
    var credsecret = document.getElementById('addCredentialSecret');

    switch (true) {
        case (selection == 5):
            {
                certFileDiv.hidden = false;
                keyFileDiv.hidden = true;
                credsecret.placeholder = "Certfile password";
                break;
            }

        case (selection == 6):
            {
                keyFileDiv.hidden = false;
                certFileDiv.hidden = false;
                credsecret.placeholder = "Must be empty";
                break;
            }

        default:
            {
                keyFileDiv.hidden = true;
                certFileDiv.hidden = true;
                credsecret.placeholder = "User secret here";
                break;
            }
    }
}

async function addNewTarget() {
    var ip = document.getElementById('addTargetIP').value;
    var hostname = document.getElementById('addTargetHostname').value;
    var dcip = document.getElementById('addTargetDCIP').value;
    var realm = document.getElementById('addTargetRealm').value;

    await octopwnAddTarget(ip, null, dcip, realm, hostname);
    $('#addTargetModal').modal('hide');
}

async function addNewProxy() {
    var ip = document.getElementById('addProxyIP').value;
    var port = document.getElementById('addProxyPort').value;
    var agentid = document.getElementById('addNewProxyAgentID').value;
    var username = document.getElementById('addNewProxyUsername').value;
    var password = document.getElementById('addNewProxyPassword').value;
    var ptypeobj = document.getElementById('addProxyType');
    var isTLS = document.getElementById('addProxyTLS').checked;
    var ptype = ptypeobj.options[ptypeobj.selectedIndex].text;

    if (isTLS && ptypeobj.value != 5) {
        ptype += 'S';
    }

    await octopwnAddProxy(ptype, ip, port, agentid, username, password);
    $('#addProxyModal').modal('hide');
}

function addNewProxyTypeChanged(selection) {
    var usernamediv = document.getElementById('addNewProxyUsernameDiv');
    var passworddiv = document.getElementById('addNewProxyPasswordDiv');
    var agentiddiv = document.getElementById('addNewProxyAgentIDDiv');

    switch (true) {
        case (selection == 1):
            {
                usernamediv.hidden = false;
                passworddiv.hidden = false;
                agentiddiv.hidden = true;
                break;
            }

        case (selection == 6):
            {
                usernamediv.hidden = true;
                passworddiv.hidden = true;
                agentiddiv.hidden = false;
                break;
            }

        default:
            {
                usernamediv.hidden = true;
                passworddiv.hidden = true;
                agentiddiv.hidden = true;
                break;
            }
    }
}


/// loading screen control functions
function startLoadingScreen() {
    var pf = document.getElementById("startupParameterForm");
    pf.hidden = true;
    var loadingtextarea = document.getElementById("loadingMessageTextArea");
    loadingtextarea.hidden = false;
    var sb = document.getElementById("startPyodideButton");
    sb.parentNode.removeChild(sb);
    var lb = document.getElementById("loadingProgressBar");
    lb.hidden = false;
    lb.enabled = true;

}

function stopLoadingScreenSuccess() {
    setTimeout(
        function() {
            $('#starterModal').modal('hide');

        },
        1000
    );

}

function stopLoadingScreenError(msg) {
    console.log(msg);
    textbox.innerHTML += '[-] ' + msg + '\n';
    textbox.scrollTop = textbox.scrollHeight;
}

function loadingScreenMessage(msg) {
    console.log(msg);
    var textbox = document.getElementById("loadingMessageTextArea");
    textbox.innerHTML += '[+] ' + msg + '\n';
    textbox.scrollTop = textbox.scrollHeight;
}

function loadingscreenProgress() {
    //not used currently
}

// basic tables are now datatables
function AddDataTableEntry(tableid, p1) {
    var table = $(tableid).DataTable()
    table.row.add([p1]).draw();
}

function AddDataTableEntryP3(tableid, p1, p2, p3) {
    var table = $(tableid).DataTable()
    table.row.add([
        p1,
        p2,
        p3
    ]).draw();
}

function AddDataTableEntryP4(tableid, p1, p2, p3, p4) {
    var table = $(tableid).DataTable()
    table.row.add([
        p1,
        p2,
        p3,
        p4,
    ]).draw();
}

function AddDataTableEntryP5(tableid, p1, p2, p3, p4, p5) {
    var table = $(tableid).DataTable()
    table.row.add([
        p1,
        p2,
        p3,
        p4,
        p5
    ]).draw();
}

function AddDataTableEntryP6(tableid, p1, p2, p3, p4, p5, p6) {
    var table = $(tableid).DataTable()
    table.row.add([
        p1,
        p2,
        p3,
        p4,
        p5,
        p6
    ]).draw();
}

function AddDataTableEntryP7(tableid, p1, p2, p3, p4, p5, p6, p7) {
    var table = $(tableid).DataTable()
    table.row.add([
        p1,
        p2,
        p3,
        p4,
        p5,
        p6,
        p7
    ]).draw();
}

function AddDataTableEntryP8(tableid, p1, p2, p3, p4, p5, p6, p7, p8) {
    var table = $(tableid).DataTable()
    table.row.add([
        p1,
        p2,
        p3,
        p4,
        p5,
        p6,
        p7,
        p8
    ]).draw();
}

function ClearDataTable(tableid) {
    var table = $(tableid).DataTable()
    table.rows().remove().draw();
}

function initializeGUI() {
    myLayout.on('initialised', function() {
        var credtable = $('#credentialTable').DataTable({
            "paging": false,
            "info": false,
            "fixedHeader": true,
            "columnDefs": [
                //{ "width": "10%", "targets": [0] },
                { "render": $.fn.dataTable.render.text(), "targets": [0, 1, 2, 3, 4, 5, 6, 7] },
                { "visible": false, "targets": [2, 3, 4, 5, 7] },
            ],
            "dom": 'Bfrtip',
            buttons: [{
                    text: '+',
                    action: function(e, dt, node, config) {
                        $('#addCredentialModal').modal('show');
                    }
                },
                'copy'
            ]
        });

        //table.buttons().container()
        //    .appendTo('btn btn-primary btn-sm');

        $('#credentialTable tbody').on('click', 'tr', function() {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                credtable.$('tr.selected').removeClass('selected');
                $(this).addClass('selected');

                var selectedrow = credtable.row('.selected').data();
                createClientUpdateCredential(selectedrow[0], selectedrow[6]);
            }
        });

        var targettable = $('#targetTable').DataTable({
            "paging": false,
            "info": false,
            "fixedHeader": true,
            "columnDefs": [
                //{ "width": "10%", "targets": [0] },
                { "render": $.fn.dataTable.render.text(), "targets": [0, 1, 2, 3, 4, 5] },
                { "type": "num", "targets": [0] },
                { "visible": false, "targets": [2, 3, 5] },
            ],
            "dom": 'Bfrtip',
            buttons: [{
                    text: '+',
                    action: function(e, dt, node, config) {
                        $('#addTargetModal').modal('show');
                    }
                },
                'copy'
            ]
        });

        //table.buttons().container()
        //    .appendTo('btn btn-primary btn-sm');

        $('#targetTable tbody').on('click', 'tr', function() {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                targettable.$('tr.selected').removeClass('selected');
                $(this).addClass('selected');

                var selectedrow = targettable.row('.selected').data();
                createClientUpdateTarget(selectedrow[0], selectedrow[4]);
            }
        });

        var proxytable = $('#proxyTable').DataTable({
            "paging": false,
            "info": false,
            "fixedHeader": true,
            "columnDefs": [
                { "render": $.fn.dataTable.render.text(), "targets": [0, 1, 2, 3, 4] },
                { "visible": false, "targets": [4] },
            ],
            "dom": 'Bfrtip',
            buttons: [{
                    text: '+',
                    action: function(e, dt, node, config) {
                        $('#addProxyModal').modal('show');
                    }
                },
                'copy'
            ]
        });

        //table.buttons().container()
        //    .appendTo('btn btn-primary btn-sm');

        $('#proxyTable tbody').on('click', 'tr', function() {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                proxytable.$('tr.selected').removeClass('selected');
                $(this).addClass('selected');

                var selectedrow = proxytable.row('.selected').data();
                createClientUpdateProxy(selectedrow[0], selectedrow[3]);
            }
        });

        var clienttable = $('#clientTable').DataTable({
            "paging": false,
            "info": false,
            "fixedHeader": true,
            "columnDefs": [
                { "render": $.fn.dataTable.render.text(), "targets": [0, 1, 2, 3] },
            ],
            "dom": 'Bfrtip',
            buttons: [{
                    text: '+',
                    action: function(e, dt, node, config) {
                        var contentItem = myLayout.root.getItemsById('createclienttab-0')[0];
                        contentItem.tab.header.parent.setActiveContentItem(contentItem);
                    }
                },
                'copy'
            ]
        });

        //table.buttons().container()
        //    .appendTo('btn btn-primary btn-sm');

        $('#clientTable tbody').on('click', 'tr', function() {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
            } else {
                clienttable.$('tr.selected').removeClass('selected');
                $(this).addClass('selected');

                var selectedrow = clienttable.row('.selected').data();
                switchActiveClientTab(selectedrow[0]);
            }
        });

        // Adding default tabs
        var table = $('#clientTable').DataTable()
        table.row.add([
            0,
            'MAIN',
            'MAIN CONSOLE',
            ''
        ]).draw();
        table.row.add([-1,
            'PYTHON',
            'Python interpreter',
            ''
        ]).draw();
    });

    myLayout.init();
}

function createClientUpdateCredential(credentialID, credentialLine) {
    var createClientCredentialID = document.getElementById("createClientCredentialID");
    createClientCredentialID.innerHTML = credentialID;

    var cline = document.getElementById("createClientCredentialLine");
    cline.innerHTML = credentialLine;
}

function createClientUpdateTarget(targetID, targetLine) {
    var tidobj = document.getElementById("createClientTargetID");
    tidobj.innerHTML = targetID;

    var cline = document.getElementById("createClientTargetLine");
    cline.innerHTML = targetLine;
}

function createClientUpdateProxy(proxyID, proxyLine) {
    var tidobj = document.getElementById("createClientProxyID");
    tidobj.innerHTML = proxyID;

    var cline = document.getElementById("createClientProxyLine");
    cline.innerHTML = proxyLine;
}



function createClientProtocolTypeChanged(selection) {
    switch (true) {
        case (selection == 1 || selection == 2):
            {
                //SMB and LDAP
                supportedProtocols = ["NTLM", "KERBEROS"];
                break;
            }
        case (selection == 3):
            {
                //Kerberos
                supportedProtocols = ["PLAIN", "NT", "RC4", "AES", "P12"];
                break;
            }
        case (selection == 4):
            {
                //RDP
                supportedProtocols = ["NTLM", "KERBEROS", "PLAIN"];
                break;
            }
        case (selection == 5):
            {
                //RDP
                supportedProtocols = ["NONE", "DES"];
                break;
            }

    }

    var str = ""
    for (var item of supportedProtocols) {
        str += "<option>" + item + "</option>"
    }
    document.getElementById("createClientAuthProtocol").innerHTML = str;

}

async function createNewClient() {
    var cid = document.getElementById("createClientCredentialID").innerHTML;
    var tid = document.getElementById("createClientTargetID").innerHTML;
    var pid = document.getElementById("createClientProxyID").innerHTML;
    if (pid == '') pid = '0'; // default proxy always exists
    var authprotoelem = document.getElementById('createClientAuthProtocol');
    var authproto = authprotoelem.options[authprotoelem.selectedIndex].text;

    var clienttypeelem = document.getElementById('createNewClientType');
    var clienttype = clienttypeelem.options[clienttypeelem.selectedIndex].text;
    await octopwnCreateClient(clienttype, authproto, cid, tid, pid);
}

async function createNewScanner() {
    var scannertypeelem = document.getElementById('createNewScannerType');
    var scannertype = scannertypeelem.options[scannertypeelem.selectedIndex].text;
    await octopwnCreateScanner(scannertype);
}

async function createNewUtil() {
    var utiltypeelem = document.getElementById('createNewUtilType');
    var utiltype = utiltypeelem.options[utiltypeelem.selectedIndex].text;
    await octopwnCreateUtil(utiltype);
}

async function createNewServer() {
    var servertypeelem = document.getElementById('createNewServerType');
    var servertype = servertypeelem.options[servertypeelem.selectedIndex].text;
    await octopwnCreateServer(servertype);
}