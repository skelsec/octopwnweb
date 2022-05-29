function createLDAPFileSystem(cid, client) {
    let fb = FILEBROWSER_LOOKUP['fileBrowserTable'];
    let ldapfs = new LDAPFileSystem(`ldap-${cid}`, client);
    fb.mount(ldapfs);
}

function LDAPFileSystem(name, client) {
    this.name = name;
    this.client = client;
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
            //shares as directories
            let rootdn = client.adinfo.distinguishedName;
            results.push(new FSEntry(this.fstablename, '..', '', '', '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
            results.push(new FSEntry(this.fstablename, rootdn, rootdn, '', '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
            return results;
        }

        if (path.charAt(0) == '/') {
            path = path.substring(1);
        }
        //if (path.substring(path.length - 2) != '\\') {
        //    path = path + '\\';
        //}

        let pathelements = path.split('\\');
        let prevpath = pathelements.slice(0, pathelements.length - 2).join('\\');
        results.push(new FSEntry(this.fstablename, '..', prevpath, prevpath, '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
        console.log(path);
        let resProxy = await this.client.listDirectory(path);
        let res = resProxy.toJs();
        if (res[1] != undefined) {
            console.log(res[1].toJs());
            //more error stuff needed!
            console.log('Error listing path!');
            return results;
        }
        console.log(res[0]);
        for (let i = 0; i < res[0].length; i++) {
            let entry = res[0][i];
            let fullpath = entry;
            let name = entry.substring(0, entry.length - path.length);
            results.push(new FSEntry(this.fstablename, name, fullpath, path, '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
        }
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