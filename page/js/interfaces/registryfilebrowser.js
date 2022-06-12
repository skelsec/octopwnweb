var REGISTRY_FILE_ID = 0;

function createRegistryFileSystem(filepath) {
    if (filepath.startsWith('/browserfs/')) {
        filepath = filepath.substring(11);
    }
    let regid = REGISTRY_FILE_ID;
    REGISTRY_FILE_ID += 1;
    let fb = FILEBROWSER_LOOKUP['fileBrowserTable'];
    let ldapfs = new RegistryFileSystem(`reg-${regid}`, filepath);
    fb.mount(ldapfs);
}

function RegistryFileSystem(name, filename) {
    this.name = name;
    this.filename = filename;
    this.client = pyodideGetGlobal("createRegFileBrowser")(filename);
    this.driver = name;
    this.currentPath = '/';
    this.fstablename = undefined; // will be defined upon mount

    this.changeDirectory = async function(path) {
        this.currentPath = path;
        let entries = await this.listDirectory(path);
        return entries
    }

    this.listDirectory = async function(path) {
        let results = [];

        if (path == '/') {
            results.push(new FSEntry(this.fstablename, '..', '', '', '', true, 0, new Date(), new Date(), new Date(), true, this.driver));

            resProxy = await this.client.do_walk('');
            let res = resProxy.toJs();
            if (res[1] != undefined) {
                //console.log(res[1].toJs());
                //more error stuff needed!
                console.log('Error listing path!');
                return results;
            }
            for (let i = 0; i < res[0].length; i++) {
                let entry = res[0][i];
                results.push(new FSEntry(this.fstablename, entry[0], entry[0], '', '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
            }
            return results;
        }

        if (path.charAt(0) == '/') {
            path = path.substring(1);
        }
        let pathelements = path.split('\\');
        let prevpath = pathelements.slice(0, pathelements.length - 2).join('\\');
        results.push(new FSEntry(this.fstablename, '..', prevpath, prevpath, '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
        resProxy = await this.client.do_walk(path);
        res = resProxy.toJs();
        if (res[1] != undefined) {
            //console.log(res[1].toJs());
            //more error stuff needed!
            console.log('Error listing path!');
            return results;
        }
        for (let i = 0; i < res[0].length; i++) {
            let entry = res[0][i];
            let name = entry[0].substring(path.length + 1);
            let fsentry = new FSEntry(this.fstablename, name, entry[0], '', '', true, 0, new Date(), new Date(), new Date(), true, this.driver);
            if (entry[1].length > 0) {
                let tt = `
                <table id="regValTable" class="hover row-border order-column compact" cellspacing="0" width="100%">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>`;

                for (let x = 0; x < entry[1].length; x++) {
                    let valpath = entry[1][x][0];
                    let valtype = entry[1][x][1];
                    let value = entry[1][x][2];
                    let valpos = entry[1][x][3];

                    valpath = valpath.substring(entry[0].length + 1);

                    let tr = `
                        <tr>
                            <td>${valpath}</td>
                            <td>${valtype}</td>
                            <td>${value}</td>
                        </tr>
                    `
                    tt += tr;

                }
                tt += "</tbody></table>";
                fsentry.setinfo(entry[0], tt, ['regValTable']);
            }

            results.push(fsentry);
        }


        //let pathelements = path.split(',');
        //let prevpath = pathelements.slice(1).join(',');
        //results.push(new FSEntry(this.fstablename, '..', prevpath, prevpath, '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
        //let resProxy = await this.client.listDirectory(path);
        //let res = resProxy.toJs();
        //if (res[1] != undefined) {
        //    //console.log(res[1].toJs());
        //    //more error stuff needed!
        //    console.log('Error listing path!');
        //    return results;
        //}
        //
        //for (let i = 0; i < res[0].get('keys').length; i++) {
        //    let entry = res[0].get('keys')[i];
        //    let fullpath = entry;
        //    let name = entry.substring(0, entry.length - path.length - 1);
        //    let attrs = res[0].get(entry).get('attributes');
        //    infohtml = '';
        //    for (const key of attrs.keys()) {
        //        infohtml += `<div><span>${key}</span><span>${attrs.get(key)}</span></div>`;
        //    }
        //    fsentry = new FSEntry(this.fstablename, name, fullpath, path, '', true, 0, new Date(), new Date(), new Date(), true, this.driver);
        //    fsentry.setinfo('HELLO', infohtml);
        //    results.push(fsentry);
        //
        //}
        return results;
    }

    this.createDirectory = async function(path, dirname) {
        return;
    }

    this.deleteDirectory = async function(path) {
        return;
    }

    this.createFile = async function(filepath, filedata) {
        return;
    }

    this.deleteFile = async function(filepath) {
        return;
    }

    this.downloadFile = async function(pid, filepath, fileName, progress_cb, finished_cb) {
        return;
    }
}