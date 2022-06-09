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
    console.log(cliname);
    if (cliname.search('NOTES') != -1) windowtype = 'notes';
    if (cliname.search('SMB') == 1) windowtype = 'smb';
    if (cliname.search('LDAP') == 1) windowtype = 'ldap';
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
    if (windowtype == 'smb') {
        createSMBFileSystem(cid, client);
    }
    if (windowtype == 'ldap') {
        createLDAPFileSystem(cid, client);
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
    if (inputbox != undefined) {
        inputbox.focus();
    } else {
        console.log("Selected window doesnt have an inputfield, nothing to focus on!");
    }
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

    var cmdhistory = document.getElementById('history-0');
    var availableCommands = octopwnGetMainCommands();
    var options = '';
    for (let i = 0; i < availableCommands.length; i++) {
        options += '<option value="' + availableCommands[i] + '" />';
    }
    cmdhistory.innerHTML = options;


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

// no draw here!!!!! (target refresh times...)
function AddDataTableEntryP6(tableid, p1, p2, p3, p4, p5, p6) {
    var table = $(tableid).DataTable()
    table.row.add([
        p1,
        p2,
        p3,
        p4,
        p5,
        p6
    ]);
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

function RefreshDataTable(tableid) {
    var table = $(tableid).DataTable();
    table.draw();
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
        $('#credentialTable tbody').on('dblclick', 'tr', function() {
            var data = credtable.row(this).data();
            showCredentialEditModal(data[0], data[7], data[6]);
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

        $('#targetTable tbody').on('dblclick', 'tr', function() {
            var data = targettable.row(this).data();
            showTargetEditModal(data[0], data[5], data[4]);
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
                {
                    text: '&#9939',
                    action: function(e, dt, node, config) {
                        showCreateProxyChainModal();
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
        $('#proxyTable tbody').on('dblclick', 'tr', function() {
            var data = proxytable.row(this).data();
            showProxyEditModal(data[0], data[2], data[3]);
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
        $('#clientTable tbody').on('dblclick', 'tr', function() {
            var data = clienttable.row(this).data();
            showClientEditModal(data[0], data[1], data[2]);
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
    var res = await octopwnCreateClient(clienttype, authproto, cid, tid, pid);
    if (res[1] != undefined) {
        showPythonError(res[1], 'Client creation');
    }
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

function showProxyEditModal(pid, ptype, description) {
    $(`<div class="modal fade editObjectModal" id="editProxyModal" tabindex="-1" role="dialog" aria-labelledby="editProxyModal" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-md">
            <div class="modal-content">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h4 class="modal-title" id="myModalLabel">Edit Proxy</h4>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <form class="form-horizontal">
                        <div class="form-group">
                            <!-- left column -->
                            <div>
                                <div class="form-group">
                                    <label for="editProxyModalProxyId" class="col-sm-2 control-label">Proxy ID</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control consoleinput" id="editProxyModalProxyId" readonly value='${pid}'>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editProxyModalProxyType" class="col-sm-2 control-label">Proxy type</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control consoleinput" id="editProxyModalProxyType" readonly value='${ptype}'>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editProxyModalDescription" class="col-sm-2 control-label">Description</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control" id="editProxyModalDescription" value='${description}'>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Modal Footer -->
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="addCredentialSubmit" data-bs-dismiss="modal" onclick="editProxyDescription(${pid})">Update</button>
                        </div><!-- End Modal Footer -->
                    </form>
                </div> <!-- End modal body div -->
            </div> <!-- End modal content div -->
        </div> <!-- End modal dialog div -->
    </div> <!-- End modal div -->`).appendTo("body").finish();
    $('#editProxyModal').modal('show');
}

function showClientEditModal(cid, ctype, description) {
    $(`<div class="modal fade editObjectModal" id="editClientModal" tabindex="-1" role="dialog" aria-labelledby="editClientModal" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-md">
            <div class="modal-content">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h4 class="modal-title" id="myModalLabel">Edit Client</h4>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <form class="form-horizontal">
                        <div class="form-group">
                            <!-- left column -->
                            <div>
                                <div class="form-group">
                                    <label for="editClientModalClientId" class="col-sm-2 control-label">Client ID</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control consoleinput" id="editClientModalClientId" readonly value='${cid}'>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editClientModalClientType" class="col-sm-2 control-label">Client type</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control consoleinput" id="editClientModalClientType" readonly value='${ctype}'>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editClientModalDescription" class="col-sm-2 control-label">Description</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control" id="editClientModalDescription" value='${description}'>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Modal Footer -->
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="addCredentialSubmit" data-bs-dismiss="modal" onclick="editClientDescription(${cid})">Update</button>
                        </div><!-- End Modal Footer -->
                    </form>
                </div> <!-- End modal body div -->
            </div> <!-- End modal content div -->
        </div> <!-- End modal dialog div -->
    </div> <!-- End modal div -->`).appendTo("body").finish();
    $('#editClientModal').modal('show');
}

function showCredentialEditModal(cid, ctype, description) {
    $(`<div class="modal fade editObjectModal" id="editCredentialModal" tabindex="-1" role="dialog" aria-labelledby="editCredentialModal" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-md">
            <div class="modal-content">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h4 class="modal-title" id="myModalLabel">Edit Credential</h4>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <form class="form-horizontal">
                        <div class="form-group">
                            <!-- left column -->
                            <div>
                                <div class="form-group">
                                    <label for="editCredentialModalCredentialId" class="col-sm-2 control-label">Credential ID</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control consoleinput" id="editCredentialModalCredentialId" readonly value='${cid}'>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editCredentialModalCredentialType" class="col-sm-2 control-label">Credential</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control consoleinput" id="editCredentialModalCredentialType" readonly value='${ctype}'>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editCredentialModalCredentialDescription" class="col-sm-2 control-label">Description</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control" id="editCredentialModalCredentialDescription" value='${description}'>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Modal Footer -->
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="editCredentialSubmit" data-bs-dismiss="modal" onclick="editCredentialDescription(${cid})">Update</button>
                        </div><!-- End Modal Footer -->
                    </form>
                </div> <!-- End modal body div -->
            </div> <!-- End modal content div -->
        </div> <!-- End modal dialog div -->
    </div> <!-- End modal div -->`).appendTo("body").finish();
    $('#editCredentialModal').modal('show');
}


function showTargetEditModal(cid, ctype, description) {
    $(`<div class="modal fade editObjectModal" id="editTargetModal" tabindex="-1" role="dialog" aria-labelledby="editTargetModal" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-md">
            <div class="modal-content">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h4 class="modal-title" id="myModalLabel">Edit Target</h4>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <form class="form-horizontal">
                        <div class="form-group">
                            <!-- left column -->
                            <div>
                                <div class="form-group">
                                    <label for="editTargetModalTargetId" class="col-sm-2 control-label">Target ID</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control consoleinput" id="editTargetModalTargetId" readonly value='${cid}'>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editTargetModalTargetType" class="col-sm-2 control-label">Target</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control consoleinput" id="editTargetModalTargetType" readonly value='${ctype}'>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="editTargetModalTargetDescription" class="col-sm-2 control-label">Description</label>
                                    <div class="col-sm-8">
                                        <input type="text" class="form-control" id="editTargetModalTargetDescription" value='${description}'>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Modal Footer -->
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="editTargetSubmit" data-bs-dismiss="modal" onclick="editTargetDescription(${cid})">Update</button>
                        </div><!-- End Modal Footer -->
                    </form>
                </div> <!-- End modal body div -->
            </div> <!-- End modal content div -->
        </div> <!-- End modal dialog div -->
    </div> <!-- End modal div -->`).appendTo("body").finish();
    $('#editTargetModal').modal('show');
}


async function editTargetDescription(cid) {
    var description = document.getElementById('editTargetModalTargetDescription').value;
    await octopwnChangeDescription('targ', cid, description);
    $('#editTargetModal').modal('hide');
    removeEditorModalMenu();
}

async function editCredentialDescription(cid) {
    var description = document.getElementById('editCredentialModalCredentialDescription').value;
    await octopwnChangeDescription('cred', cid, description);
    $('#editCredentialModal').modal('hide');
    removeEditorModalMenu();
}

async function editClientDescription(cid) {
    var description = document.getElementById('editClientModalDescription').value;
    await octopwnChangeDescription('cli', cid, description);
    $('#editClientModal').modal('hide');
    removeEditorModalMenu();
}

async function editProxyDescription(pid) {
    var description = document.getElementById('editProxyModalDescription').value;
    await octopwnChangeDescription('prox', pid, description);
    $('#editProxyModal').modal('hide');
    removeEditorModalMenu();
}

function removeEditorModalMenu() {
    const elements = document.getElementsByClassName('editObjectModal');
    while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}

function showPythonError(exc, title = '') {
    // exc is an array with exception string and traceback string
    $(`<div class="modal fade pythonExceptionModalClass" id="pythonExceptionModal" tabindex="-1" role="dialog" aria-labelledby="pythonExceptionModal" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-md">
            <div class="modal-content">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h4 class="modal-title" id="pythonExceptionModalTitle">Error :(</h4>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <form class="form-horizontal">
                        <div class="form-group">
                            <!-- left column -->
                            <div>
                                <div class="form-group">
                                    <label for="pythonExceptionModalException" class="col-sm-2 control-label">Exception</label>
                                    <div class="col-sm-8">
                                        <textarea class="consoleoutputfield" id="pythonExceptionModalException" rows=1 readonly></textarea>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="pythonExceptionModalTraceback" class="col-sm-2 control-label">Traceback</label>
                                    <div class="col-sm-8">
                                        <textarea class="consoleoutputfield" id="pythonExceptionModalTraceback" rows=10 readonly></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Modal Footer -->
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal" onclick="removeClass('pythonExceptionModalClass')">Well..</button>
                        </div><!-- End Modal Footer -->
                    </form>
                </div> <!-- End modal body div -->
            </div> <!-- End modal content div -->
        </div> <!-- End modal dialog div -->
    </div> <!-- End modal div -->`).appendTo("body").finish();
    if (title != '' && title != undefined) {
        document.getElementById("pythonExceptionModalTitle").innerHTML = title;
    }
    document.getElementById("pythonExceptionModalException").innerHTML = exc[0];
    document.getElementById("pythonExceptionModalTraceback").innerHTML = exc[1];
    $('#pythonExceptionModal').modal('show');
}

function removeClass(classname) {
    const elements = document.getElementsByClassName(classname);
    while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}


function showCreateProxyChainModal(cid, ctype, description) {
    removeClass('createProxyChainModalClass');
    $(`<div class="modal fade createProxyChainModalClass" id="createProxyChainModal" tabindex="-1" role="dialog" aria-labelledby="createProxyChainModal" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-md">
            <div class="modal-content">
                <!-- Modal Header -->
                <div class="modal-header">
                    <h4 class="modal-title" id="myModalLabel">Create Proxy Chain</h4>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                
                <!-- Modal Body -->
                <div class="modal-body">
                    <form class="form-horizontal">
                        <div class="form-group">
                            <!-- left column -->
                            <div>
                                <div class="form-group">
                                    <label for="createProxyChainModalAddChain-1" class="col-sm-2 control-label">1 st</label>
                                    <div class="col-sm-8">
                                        <select class="form-select" id="createProxyChainModalAddChain-1" aria-label="Default select example">
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="createProxyChainModalAddChain-1" class="col-sm-2 control-label">2 nd</label>
                                    <div class="col-sm-8">
                                        <select class="form-select" id="createProxyChainModalAddChain-2" aria-label="Default select example">
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="createProxyChainModalAddChain-1" class="col-sm-2 control-label">3 rd</label>
                                    <div class="col-sm-8">
                                        <select class="form-select" id="createProxyChainModalAddChain-3" aria-label="Default select example">
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="createProxyChainModalAddChain-1" class="col-sm-2 control-label">4 th</label>
                                    <div class="col-sm-8">
                                        <select class="form-select" id="createProxyChainModalAddChain-4" aria-label="Default select example">
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="createProxyChainModalAddChain-1" class="col-sm-2 control-label">5 th</label>
                                    <div class="col-sm-8">
                                        <select class="form-select" id="createProxyChainModalAddChain-5" aria-label="Default select example">
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Modal Footer -->
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="addCredentialSubmit" data-bs-dismiss="modal" onclick="addProxyChain()">Create</button>
                        </div><!-- End Modal Footer -->
                    </form>
                </div> <!-- End modal body div -->
            </div> <!-- End modal content div -->
        </div> <!-- End modal dialog div -->
    </div> <!-- End modal div -->`).appendTo("body").finish();

    var options = '<option value="-1" selected>Select if needed</option>';
    var proxytable = $('#proxyTable').DataTable();
    proxytable.rows().every(function(rowIdx, tableLoop, rowLoop) {
        var data = this.data();
        if (data[2] != 'CHAIN') {
            options += '<option value="' + data[0] + '">' + data[4] + '</option>';
        }

    });

    let optsel = document.getElementById(`createProxyChainModalAddChain-1`);
    optsel.innerHTML = '<option value="0" selected>WSNET</option>';


    for (let i = 2; i < 6; i++) {
        let optsel = document.getElementById(`createProxyChainModalAddChain-${i}`);
        optsel.innerHTML = options;
    }


    $('#createProxyChainModal').modal('show');
}

async function addProxyChain() {
    var pids = []
    for (let i = 1; i < 6; i++) {
        let optobj = document.getElementById(`createProxyChainModalAddChain-${i}`);
        var optidx = optobj.options[optobj.selectedIndex].value;
        if (optidx != '-1') {
            pids.push(optidx);
        }
    }
    if (pids.length > 1) {
        await octopwnCreateNewChain(pids);
    }
    $('#createProxyChainModal').modal('hide');
    removeClass('createProxyChainModalClass');
}

/*
function addScreenSaver() {
    $(` <div id="screenSaver" class="fade-in">
            <img src="../img/yesman2.jpg">
        </div>`).appendTo("body").finish();
}


(function() {
    const interval = 1000;
    const timeout = 5;
    let idleCounter = 0;
    window.onload = document.onmousemove = document.onkeypress = function() {
        idleCounter = 0;
        let test = document.getElementById("screenSaver");
        if (test != null) {
            test.remove();
            window.setInterval(function() {
                if (++idleCounter >= timeout) {
                    let test = document.getElementById("screenSaver");
                    if (test == null) addScreenSaver();
                    idleCounter = 0;
                }
            }, interval);
        }
    };
    window.setInterval(function() {
        if (++idleCounter >= timeout) {
            let test = document.getElementById("screenSaver");
            if (test == null) addScreenSaver();
            idleCounter = 0;
        }
    }, interval);
})();
*/