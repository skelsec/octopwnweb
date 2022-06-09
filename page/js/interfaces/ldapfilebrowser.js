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
        if (path == '/' && this.client.logon_ok == false) {
            await this.client.do_login();
            await this.client.do_adinfo();
        }
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

        let pathelements = path.split(',');
        let prevpath = pathelements.slice(1).join(',');
        results.push(new FSEntry(this.fstablename, '..', prevpath, prevpath, '', true, 0, new Date(), new Date(), new Date(), true, this.driver));
        let resProxy = await this.client.listDirectory(path);
        let res = resProxy.toJs();
        if (res[1] != undefined) {
            //console.log(res[1].toJs());
            //more error stuff needed!
            console.log('Error listing path!');
            return results;
        }

        for (let i = 0; i < res[0].get('keys').length; i++) {
            let entry = res[0].get('keys')[i];
            let fullpath = entry;
            let name = entry.substring(0, entry.length - path.length - 1);
            let attrs = res[0].get(entry).get('attributes');
            infohtml = '';
            for (const key of attrs.keys()) {
                infohtml += `<div><span>${key}</span><span>${attrs.get(key)}</span></div>`;
            }
            fsentry = new FSEntry(this.fstablename, name, fullpath, path, '', true, 0, new Date(), new Date(), new Date(), true, this.driver);
            fsentry.setinfo('HELLO', infohtml);
            results.push(fsentry);

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