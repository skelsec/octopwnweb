function createSMBFileSystem(cid, client) {
    let fb = FILEBROWSER_LOOKUP['fileBrowserTable'];
    console.log(fb);
    let smbfs = new SMBFileSystem(`smb-${cid}`, client);
    console.log(`smb-${cid}`);
    fb.mount(smbfs);
}


function SMBFileSystem(name, client) {
    this.name = name;
    this.client = client;
    this.driver = name;
    this.currentPath = '/';
    this.fstablename = undefined; // will be defined upon mount

    /**
     * Downloads the file from BrowserFS
     * */

    this.downloadFile = async function(path) {
            var fs = BrowserFS.BFSRequire('fs');
            let data = fs.readFileSync(path);
            const blob = new Blob([data]);
            return blob;

        }
        // await FILEBROWSER_LOOKUP['fileBrowserTable'].fileSystems['smb-2'].listDirectory('\\\\\\\\Users\\\\')

    this.changeDirectory = async function(path) {
        if (path != '/') {
            path = path.substring(0, path.length - 1);
        }
        if (path.charAt(path.length - 1) != '\\\\' && path != '/') {
            path = path + '\\\\';
        }
        console.log('CD: ' + path);
        this.currentPath = path;
        let entries = await this.listDirectory(path);
        return entries
    }

    this.deleteDirectory = async function(path) {
        console.log('deldir not implemented SMB!');
    }

    this.listDirectory = async function(path) {
        let results = [];

        if (path == '/') {
            //shares as directories
            results.push(new FSEntry(this.fstablename, '..', '', '', '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
            let res = await this.client.do_shares(false);
            console.log(res);
            let shares = this.client.shares.toJs();
            for (const share of shares.keys()) {
                results.push(new FSEntry(this.fstablename, share, share, path, '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
            }
            return results;
        }

        //if (path.charAt(path.length - 1) != '\\' && path != '/') {
        //    path = path + '\\';
        //}
        //
        //let prevpath = path.substring(0, path.substring(0, path.length - 1));
        //if (prevpath == '') {
        //    if (path != '/') prevpath = '/';
        //    else prevpath = '';
        //}
        let basepath = path;
        path = path.substring(1); //removing starting '/'
        console.log(path);
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
            if (entry.get('type') == 'dir') {
                results.push(new FSEntry(this.fstablename, entry.get('name'), basepath + '\\' + entry.get('name'), basepath, '', true, 0, null, null, null, true, this.driver));
            } else {
                results.push(new FSEntry(this.fstablename, entry.get('name'), basepath + '\\' + entry.get('name'), basepath, '', false, entry.get('size'), null, null, null, true, this.driver));
            }
        }
        return results;
    }

    this.createDirectory = async function(path) {
        let fs = BrowserFS.BFSRequire('fs');
        await fs.mkdir(path);

    }

    this.createFile = async function(filepath, filedata) {
        let fs = BrowserFS.BFSRequire('fs');
        let bfsBuffer = BrowserFS.BFSRequire('buffer');
        data = bfsBuffer.Buffer.from(filedata);
        await fs.writeFile(filepath, data);
    }

    this.deleteFile = async function(path) {
        let fs = BrowserFS.BFSRequire('fs');
        await fs.unlink(path);

    }
}