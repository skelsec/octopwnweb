// python packages to load. You must list all necessary packages
const pythonPackages = [
    'cffi', 'openssl', 'ssl', 'arc4', 'certifi', 'lxml', 'xmljson', 'pyndiff',
    'pillow', 'bitstruct', 'pyparsing', 'diskcache', 'asn1tools', 'asn1crypto',
    'wcwidth', 'asysocks', 'oscrypto', 'csrbuilder', 'pyperclip', 'winacl',
    'tqdm', 'minikerberos', 'prompt-toolkit', 'aiosmb', 'msldap', 'wsnet',
    'websockets', 'pypykatz', 'aardwolf', 'networkx', 'pytz', 'jackdaw', 'octopwn'
];


// this function is to fetch the luncher python code from a file
// allowing editing the python code in a separate python file insted of
// merging it here to JS code
const fetchPyCode = (path) => fetch(`${window.location.origin}/${path}`).then(async res => {
    const txt = await res.text();
    return txt;
});

// loads python packages and executes the luncher python code
// also sets up the command input interface (runCmd)
const loadPackages = (pyodide) => {
    loadingScreenMessage('Loading 3rd party python packages...');
    pyodide.loadPackage(pythonPackages).then(async() => {
        loadingScreenMessage('All Packages loaded!');
        loadingScreenMessage('Fetching OctoPwn bootstrap script...');
        const pyCode = await fetchPyCode('console.py');

        loadingScreenMessage("Initializing GUI...");
        initializeGUI();
        loadingScreenMessage("Setting up file browser...");
        setupFileBrowser("fileBrowserTable", "fileBrowserDiv");
        loadingScreenMessage('Starting Python console...');
        startPythonConsole("#pyConsoleDiv", pyodide);

        loadingScreenMessage('Bootstrapping OctoPwn (this might take a while)...');
        pyodide.runPythonAsync(pyCode).then(() => {
            loadingScreenMessage('OctoPwn bootstrapped OK!');
            //document.getElementById("statusButton").value = "RUNNING OK";

            loadingScreenMessage('Setting up JS<==>Py proxy functions...');
            // defining global functions...
            pyodideGetGlobal = (name) => {
                return pyodide.globals.get(name);
            }

            runCmd = async(command, clientid) => {
                let app = pyodide.globals.get('octopwnApp');
                app.input_handler(command, clientid);
                app.destroy();

            }
            octopwnAddTarget = async(ip, port, dcip, realm, hostname) => {
                let app = pyodide.globals.get('octopwnApp');
                await app.do_addtarget(ip, port, dcip, realm, hostname);
                app.destroy();
            }

            octopwnAddCredential = async(username_with_domain, secret, secrettype, certfile, keyfile) => {
                let app = pyodide.globals.get('octopwnApp');
                if (certfile == '') certfile = null;
                if (keyfile == '') keyfile = null;
                await app.do_addcred(username_with_domain, secret, secrettype, certfile, keyfile);
                app.destroy();
            }

            octopwnAddProxy = async(ptype, ip, port, agentid, username, password) => {
                let app = pyodide.globals.get('octopwnApp');
                await app.do_addproxy(ptype, ip, port, agentid);
                app.destroy();
            }

            octopwnCreateClient = async(ctype, cauth, cid, tid, pid) => {
                let app = pyodide.globals.get('octopwnApp');
                var respy = await app.do_createclient(ctype, cauth, cid, tid, pid);
                var res = respy.toJs();
                respy.destroy();
                var exc = undefined;
                if (res[1] != undefined) {
                    let excstr = res[1].toString();
                    let tbformat = pyodide.globals.get('gettb4exc');
                    let traceback = tbformat(res[1]);
                    exc = [excstr, traceback];
                }
                app.destroy();
                return [res[0], exc];
            }

            octopwnCreateScanner = async(stype) => {
                let app = pyodide.globals.get('octopwnApp');
                await app.do_createscanner(stype)
                app.destroy();
            }

            octopwnCreateServer = async(stype) => {
                let app = pyodide.globals.get('octopwnApp');
                await app.do_createserver(stype)
                app.destroy();
            }

            octopwnCreateUtil = async(stype) => {
                let app = pyodide.globals.get('octopwnApp');
                await app.do_createutil(stype)
                app.destroy();
            }

            octopwnChangeDescription = async(otype, oid, description) => {
                let app = pyodide.globals.get('octopwnApp');
                await app.do_changedescription(otype, oid, description)
                app.destroy();
            }

            octopwnGetMainCommands = () => {
                let app = pyodide.globals.get('octopwnApp');
                var availableCommandsProxy = app.command_list();
                var availableCommands = availableCommandsProxy.toJs();
                availableCommandsProxy.destroy();
                app.destroy();
                return availableCommands;
            }

            octopwnCreateNewChain = async(pids) => {
                let app = pyodide.globals.get('octopwnApp');
                var resproxy = await app.do_createchain();
                var res = resproxy.toJs();
                resproxy.destroy();
                if (res[3] != undefined) {
                    let excstr = res[3].toString();
                    let tbformat = pyodide.globals.get('gettb4exc');
                    let traceback = tbformat(res[3]);
                    exc = [excstr, traceback];
                    showPythonError(exc, 'Creating Chain Error');
                } else {
                    for (let i = 0; i < pids.length; i++) {
                        let addresproxy = await app.do_addproxychain(res[0], pids[i]);
                        let addres = addresproxy.toJs();
                        addresproxy.destroy();
                        if (addres[1] != undefined) {
                            let excstr = addres[3].toString();
                            let tbformat = pyodide.globals.get('gettb4exc');
                            let traceback = tbformat(addres[3]);
                            exc = [excstr, traceback];
                            showPythonError(exc, 'Adding Proxy to Chain Error');
                        }
                    }
                }
                app.destroy();
            }

            loadingScreenMessage('Everything is loaded and running OK!');
            stopLoadingScreenSuccess();
        });
    });
};


const startPyodide = async() => {
    startLoadingScreen();

    // loading the pyodide core. (this will load the core only)
    loadingScreenMessage("Loading Pyodide core...");
    //document.getElementById("statusButton").value = "Loading Pyodide";
    const pyodide = await loadPyodide({ indexURL: "/js/pyodide/" });
    // Pyodide core is now ready to use

    // setting up virtual filesystem
    // this needs to happen after the core is loaded
    loadingScreenMessage('Setting up virtual filesystem...');
    BrowserFS.configure({
        fs: "MountableFileSystem",
        options: {
            '/volatile': { fs: "InMemory" },
            '/static': { fs: "LocalStorage" }
        }
    }, function(e) {
        if (e) {
            loadingScreenMessage(e);
            stopLoadingScreenError('Error while setting up virtual filesystem...');

            // An error happened!
            throw e;
        }
        // Otherwise, BrowserFS is ready-to-use!

        var fs = BrowserFS.BFSRequire('fs');
        let FS = pyodide._module.FS;
        let PATH = pyodide._module.PATH;
        let ERRNO_CODES = pyodide._module.ERRNO_CODES;
        var BFS = new BrowserFS.EmscriptenFS(FS, PATH, ERRNO_CODES);
        //FS.mkdir('data');
        loadingScreenMessage('Mounting LocalStorage based filesystem...');
        FS.mkdir('/static');
        loadingScreenMessage('Mounting memory filesystem...');
        FS.mkdir('/volatile');
        FS.mount(BFS, { root: '/static' }, '/static');
        FS.mount(BFS, { root: '/volatile' }, '/volatile');

        if (loadSessionData != null) {
            loadingScreenMessage('Writing session data to file...');
            let bfsBuffer = BrowserFS.BFSRequire('buffer');
            data = bfsBuffer.Buffer.from(loadSessionData);
            fs.writeFileSync("/static/octopwn.session", data);
            loadingScreenMessage('Session data written to file');
        }


    });
    //refreshFileList();

    // loading packages and starting the python application
    loadPackages(pyodide);
};