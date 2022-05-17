////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////  LOCAL FILE MANAGER  //////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
function handleFiles(customFileList) {
    var fs = BrowserFS.BFSRequire('fs');
    let bfsBuffer = BrowserFS.BFSRequire('buffer');

    let fileList = this.files;
    if (fileList === undefined) {
        fileList = customFileList;
    }
    for (let i = 0; i < fileList.length; i++) {
        let file = fileList[i];
        const reader = new FileReader();
        reader.onload = function() {
            // write file.
            let data = new Uint8Array(reader.result);
            data = bfsBuffer.Buffer.from(data);
            fs.writeFileSync("/volatile/" + file.name, data);
            console.log("File uploaded!");
            refreshFileList();
        }
        reader.readAsArrayBuffer(file);
    };
}

function overrideSessionFile(customFileList) {
    var fs = BrowserFS.BFSRequire('fs');
    let bfsBuffer = BrowserFS.BFSRequire('buffer');
    const reader = new FileReader();

    reader.onload = function() {
        // write file.
        loadSessionData = new Uint8Array(reader.result);
        startPyodide();
    }

    reader.readAsArrayBuffer(customFileList[0]);
}

var printDirConects = function(basedir) {
    var fs = BrowserFS.BFSRequire('fs');

    fs.readdir(basedir, function(err, files) {
        if (typeof files == "undefined") {
            const ul = document.getElementById('uploadedFiles');
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
                const ul = document.getElementById('uploadedFiles');
                const li = document.createElement('li');
                const aTag = document.createElement('a');
                aTag.appendChild(document.createTextNode(basedir + file + "/"));

                li.appendChild(aTag);
                ul.appendChild(li);
                printDirConects(basedir + "/" + file + "/");

            } else {
                const ul = document.getElementById('uploadedFiles');
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

var refreshFileList = function() {
    var ul = document.getElementById('uploadedFiles');
    ul.textContent = '';
    printDirConects("/");
}

function initShowFiles() {
    refreshFileList();
}

/**
 * Downloads the file from BrowserFS
 * */
function downloadFile(fileName) {
    var fs = BrowserFS.BFSRequire('fs');
    bytes = fs.readFileSync(fileName);
    const blob = new Blob([bytes]);
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Deletes the file from BrowserFS
 * */
function deleteFile(fileName) {
    var fs = BrowserFS.BFSRequire('fs');
    fs.unlinkSync(fileName);
    refreshFileList();
}

function autoRefreshFileList() {
    //refreshes available files every 5 seconds
    refreshFileList();
    setTimeout(autoRefreshFileList, 5000);
}