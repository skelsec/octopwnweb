function createSMBFileSystem(cid, client) {
    let fb = FILEBROWSER_LOOKUP['fileBrowserTable'];
    console.log(fb);
    let smbfs = new SMBFileSystem(`smb-${cid}`, client);
    console.log(`smb-${cid}`);
    fb.mount(smbfs);
}

function smbFSdt2js(x) {
    return new Date(x);
}

function SMBFileSystem(name, client) {
    this.name = name;
    this.client = client;
    this.driver = name;
    this.currentPath = '/';
    this.fstablename = undefined; // will be defined upon mount

    this.changeDirectory = async function(path) {
        if (path == '/' && this.client.logon_ok == false) {
            await this.client.do_login();
        }
        this.currentPath = path;
        let entries = await this.listDirectory(path);
        return entries
    }

    this.listDirectory = async function(path) {
        let results = [];

        if (path == '/') {
            //shares as directories
            results.push(new FSEntry(this.fstablename, '..', '', '', '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
            let res = await this.client.do_shares(false);
            let shares = this.client.shares.toJs();
            for (const share of shares.keys()) {
                results.push(new FSEntry(this.fstablename, share, share, '', '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
            }
            return results;
        }

        if (path.charAt(0) == '/') {
            path = path.substring(1);
        }
        if (path.substring(path.length - 2) != '\\') {
            path = path + '\\';
        }

        let pathelements = path.split('\\');
        let prevpath = pathelements.slice(0, pathelements.length - 2).join('\\');
        results.push(new FSEntry(this.fstablename, '..', prevpath, prevpath, '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
        let resProxy = await this.client.listDirectory(path);
        let res = resProxy.toJs();
        if (res[1] != undefined) {
            console.log(res[1].toJs());
            //more error stuff needed!
            console.log('Error listing path!');
            return results;
        }
        for (let i = 0; i < res[0].length; i++) {
            let entry = res[0][i];
            let fullpath = path + entry.get('name');
            if (entry.get('type') == 'dir') {
                results.push(new FSEntry(this.fstablename, entry.get('name'), fullpath, path, '', true, 0, smbFSdt2js(entry.get("creation_time")), smbFSdt2js(entry.get("last_write_time")), smbFSdt2js(entry.get("last_access_time")), false, this.driver));
            } else {
                results.push(new FSEntry(this.fstablename, entry.get('name'), fullpath, path, '', false, entry.get('size'), smbFSdt2js(entry.get("creation_time")), smbFSdt2js(entry.get("last_write_time")), smbFSdt2js(entry.get("last_access_time")), false, this.driver));
            }
        }
        return results;
    }

    this.createDirectory = async function(path, dirname) {
        if (path.charAt(0) == '/') path = path.substring(1);
        if (path.charAt(path.length - 1) != '\\') path = path + '\\';
        let fullpath = path + dirname;
        let resProxy = await this.client.createDirectory(fullpath);
        let res = resProxy.toJs();
        if (res[1] != undefined) {
            console.log(res[1].toJs());
            //more error stuff needed!
            console.log('Error creating directory!');
            return;
        }
        console.log('directory created!');
    }

    this.deleteDirectory = async function(path) {
        if (path.charAt(0) == '/') path = path.substring(1);
        let resProxy = await this.client.deleteDirectory(path);
        let res = resProxy.toJs();
        if (res[1] != undefined) {
            console.log(res[1].toJs());
            //more error stuff needed!
            console.log('Error deleting directory!');
            return;
        }
        console.log('directory deleted!');
    }

    this.createFile = async function(filepath, filedata) {
        let fs = BrowserFS.BFSRequire('fs');
        let bfsBuffer = BrowserFS.BFSRequire('buffer');
        data = bfsBuffer.Buffer.from(filedata);
        await fs.writeFile(filepath, data);
    }

    this.deleteFile = async function(filepath) {
        if (filepath.charAt(0) == '/') filepath = filepath.substring(1);
        let resProxy = await this.client.deleteFile(filepath);
        let res = resProxy.toJs();
        if (res[2] != undefined) {
            console.log(res[1].toJs());
            //more error stuff needed!
            console.log('Error downloading file!');
            return;
        }
    }

    this.downloadFile = async function(pid, filepath, fileName, progress_cb, finished_cb) {
        if (filepath.charAt(0) == '/') filepath = filepath.substring(1);
        let resProxy = await this.client.downloadFile(filepath);
        let res = resProxy.toJs();
        if (res[2] != undefined) {
            console.log(res[1].toJs());
            //more error stuff needed!
            console.log('Error downloading file!');
            return;
        }

        let consumed = 0;
        let filedata = null;
        let fileerr = null;
        while (true) {
            let dataresProxy = await res[0].get();
            let datares = dataresProxy.toJs();
            let done = datares[0];
            let data = datares[1];
            let totalsize = datares[2];
            let dataerr = datares[3];

            if (dataerr != null) {
                fileerr = dataerr;
                console.log('File download error! ' + dataerr);
                break;
            }
            if (data != null) {
                if (filedata == null) {
                    filedata = new Uint8Array(totalsize);
                }
                filedata.set(data, consumed);
                consumed += data.length;
                progress_cb(pid, totalsize, consumed);
            }
            if (done) break;
        }
        if (fileerr == null || fileerr == undefined) {
            progress_cb(pid, filedata.length, filedata.length);
        }
        finished_cb(pid, fileName, filedata, fileerr);
    }
}