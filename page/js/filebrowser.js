function printDirConects(fileTableId, basedir) {
    var fs = BrowserFS.BFSRequire('fs');

    fs.readdir(basedir, function(err, files) {
        if (typeof files == "undefined") {
            const ul = document.getElementById(fileTableId);
            const li = document.createElement('li');
            const aTag = document.createElement('a');
            aTag.appendChild(document.createTextNode(basedir));
            li.appendChild(aTag);
            ul.appendChild(li);
            return;
        }
        files.forEach(file => {
            let stat = fs.statSync(basedir + "/" + file, true);
            if ((stat.mode & 16384) > 0) {
                const ul = document.getElementById(fileTableId);
                const li = document.createElement('li');
                const aTag = document.createElement('a');
                aTag.appendChild(document.createTextNode(basedir + file + "/"));

                li.appendChild(aTag);
                ul.appendChild(li);
                printDirConects(basedir + "/" + file + "/");

            } else {
                const ul = document.getElementById(fileTableId);
                const li = document.createElement('li');
                const aTag = document.createElement('a');
                const dTag = document.createElement('a');
                aTag.appendChild(document.createTextNode(basedir + file + "    "));
                aTag.setAttribute('href', `javascript:downloadFile('${basedir+file}')`);
                aTag.setAttribute('class', "listtable");
                dTag.appendChild(document.createTextNode("- DELETE"));
                dTag.setAttribute('href', `javascript:deleteFile('${basedir+file}')`);
                dTag.setAttribute('class', "listtable");
                li.appendChild(aTag);
                li.appendChild(dTag);
                ul.appendChild(li);
            }

        });
    });
}