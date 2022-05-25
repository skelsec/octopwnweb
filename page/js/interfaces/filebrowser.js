FILEBROWSER_LOOKUP = {};

var extensionsMap = {
    "zip": "fa-file-archive",
    "gz": "fa-file-archive",
    "bz2": "fa-file-archive",
    "xz": "fa-file-archive",
    "rar": "fa-file-archive",
    "tar": "fa-file-archive",
    "tgz": "fa-file-archive",
    "tbz2": "fa-file-archive",
    "z": "fa-file-archive",
    "7z": "fa-file-archive",
    "mp3": "fa-file-audio",
    "cs": "fa-file-code",
    "c++": "fa-file-code",
    "cpp": "fa-file-code",
    "js": "fa-file-code",
    "xls": "fa-file-excel",
    "csv": "fa-file-excel",
    "tsv": "fa-file-excel",
    "xlsx": "fa-file-excel",
    "png": "fa-file-image",
    "jpg": "fa-file-image",
    "jpeg": "fa-file-image",
    "gif": "fa-file-image",
    "mpeg": "fa-file-movie",
    "pdf": "fa-file-pdf",
    "ppt": "fa-file-powerpoint",
    "pptx": "fa-file-powerpoint",
    "txt": "fa-file-text",
    "log": "fa-file-text",
    "doc": "fa-file-word",
    "docx": "fa-file-word",
};

function getFileIcon(ext) {
    return (ext && extensionsMap[ext.toLowerCase()]) || 'fa-file';
}

function getext(fname) {
    let pos = fname.indexOf('.');
    if (pos == -1) {
        return '';
    }
    return fname.substring(pos + 1);

}

function removeRightClickMenu() {
    const elements = document.getElementsByClassName('filebrowser-rightclick-menu');
    while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}

function humanFileSize(bytes, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }

    const units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


    return bytes.toFixed(dp) + ' ' + units[u];
}

function FSEntry(fstablename, name, fullpath, root, ext, isdir, size, creationdate, modificationdate, accessdate, readonly, mountpoint) {
    this.fstablename = fstablename;
    this._name = name;
    this._root = root;
    this._ext = ext;
    this._fullpath = fullpath;
    this._isdir = isdir;
    this._size = size;
    this._creationdate = creationdate;
    this._modificationdate = modificationdate;
    this._accessdate = accessdate;
    this._mountpoint = mountpoint;
    this._readonly = readonly;

    this.htmlEncode = function(str) {
        return String(str).replace(/[^\w. ]/gi, function(c) {
            return '&#' + c.charCodeAt(0) + ';';
        });
    }

    this.name = function() {

        if (this._isdir) {
            return `<a><i class='fas fa-folder'></i>&nbsp;${this.htmlEncode(this._name)}</a>`;
        } else {
            return `<a><i class='fas ${getFileIcon(this._ext)}'></i>&nbsp; ${this.htmlEncode(this._name)}</a>`;
        }
    };

    this.fullpath = function() {
        if (this._name == '..') {
            //console.log('this._fullpath: "' + this._fullpath + '"');
            //console.log('this._mountpoint: "' + this._mountpoint + '"');
            if (this._fullpath == '') return '/';
            if (this._fullpath == '/') return '/' + this._mountpoint;
            return '/' + this._mountpoint + '/' + this._fullpath;
        }
        return '/' + this._mountpoint + '/' + this._fullpath;
    };

    this.ext = function() {
        return this._ext;
    };

    this.root = function() {
        return this._root;
    };

    this.isdir = function() {
        return this._isdir;
    };

    this.size = function() {
        if (this._isdir) return '';
        return humanFileSize(this._size, si = true);
    };

    this.dateColumnFormatter = function(d) {
        let ds = d.toISOString();
        return ds.substring(0, ds.lastIndexOf('.'))
    }

    this.creationdate = function() {
        if (this._creationdate == null || this._creationdate == undefined) return '';
        return this.dateColumnFormatter(this._creationdate);
    };

    this.modificationdate = function() {
        if (this._modificationdate == null || this._modificationdate == undefined) return '';
        return this.dateColumnFormatter(this._modificationdate);
    };

    this.accessdate = function() {
        if (this._accessdate == null || this._accessdate == undefined) return '';
        return this.dateColumnFormatter(this._accessdate);
    };

    this.readonly = function() {
        return this._readonly;
    }
}

function BrowserFSFileSystem(name) {
    this.name = name;
    this.driver = 'browserfs';
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

    this.changeDirectory = async function(path) {
        if (path.charAt(path.length - 1) != '/' && path != '/') {
            path = path + '/';
        }
        this.currentPath = path;
        let entries = await this.listDirectory(path);
        return entries
    }

    this.deleteDirectory = async function(path) {
        let fs = BrowserFS.BFSRequire('fs');
        await fs.rmdir(path);
    }

    this.listDirectory = async function(path) {
        let driver = this.driver; //needed bc callback...
        let fstablename = this.fstablename; //needed bc callback...
        let fs = BrowserFS.BFSRequire('fs');
        let results = [];

        if (path.charAt(path.length - 1) != '/' && path != '/') {
            path = path + '/';
        }

        let prevpath = path.substring(0, path.substring(0, path.length - 1));
        if (prevpath == '') {
            if (path != '/') prevpath = '/';
            else prevpath = '';
        }
        results.push(new FSEntry(this.fstablename, '..', prevpath, prevpath, '', true, 0, new Date(), new Date(), new Date(), true, this.driver));

        fs.readdir(path, function(err, files) {
            //todo: check for err
            if (typeof files == "undefined") {
                // empty or error
            }
            console.log(files);
            for (const file of files) {
                try {
                    let fullpath = '';
                    if (path == '/') fullpath = file;
                    else fullpath = path + "/" + file;
                    //let stat = fs.statSync(path + "/" + file, true);
                    let stat = fs.statSync(fullpath, true);
                    if ((stat.mode & 16384) > 0) {
                        //this is a directory
                        results.push(new FSEntry(fstablename, file, fullpath, path, '', true, 0, stat.ctime, stat.mtime, stat.atime, false, driver));

                    } else {
                        results.push(new FSEntry(fstablename, file, fullpath, path, getext(file), false, stat.size, stat.ctime, stat.mtime, stat.atime, false, driver));

                    }
                } catch (e) {
                    console.log(e);
                }

            };
        });
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

function FileBrowser(tablename) {
    this.tablename = tablename;
    this.currentPath = '/';
    this.defaultUploadPath = '/browserfs/volatile/';
    this.fileSystems = {};

    this.htmlEncode = function(str) {
        return String(str).replace(/[^\w. ]/gi, function(c) {
            return '&#' + c.charCodeAt(0) + ';';
        });
    }

    this.createFile = async function(fileList) {
        let mountpoint = null;
        if (this.defaultUploadPath != null || this.defaultUploadPath != undefined) {
            mountpoint = this.defaultUploadPath.substring(0, this.defaultUploadPath.indexOf('/', 1)).substring(1);
            path = this.defaultUploadPath.substring(1 + mountpoint.length);
        }

        fs = this.fileSystems[mountpoint];
        for (let i = 0; i < fileList.length; i++) {
            let file = fileList[i];
            let data = await file.arrayBuffer();
            await fs.createFile(path + file.name, data);

        };
        await this.refresh();
    }

    this.downloadFile = async function(path) {
        let mountpoint = path.substring(0, path.indexOf('/', 1)).substring(1);
        let filepath = path.substring(1 + mountpoint.length);
        let fileName = path.substring(path.lastIndexOf('/'));
        let fs = this.fileSystems[mountpoint];
        const blob = await fs.downloadFile(filepath);
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    this.createDirectoryHTML = async function() {
        let dirname = document.getElementById(`createFolder-${this.tablename}`).value;
        let path = this.currentPath + dirname;
        await this.createDirectory(path);
    }

    this.createDirectory = async function(path) {
        try {
            let mountpoint = path.substring(0, path.indexOf('/', 1)).substring(1);
            let dirpath = path.substring(1 + mountpoint.length);
            let fs = this.fileSystems[mountpoint];
            await fs.createDirectory(dirpath);
            await this.refresh();
            //refresh here?
        } catch (e) {
            console.log(e);
        }

    }

    this.deleteDirectory = async function(path) {
        let mountpoint = path.substring(0, path.indexOf('/', 1)).substring(1);
        let dirpath = path.substring(1 + mountpoint.length);
        let fs = this.fileSystems[mountpoint];
        await fs.deleteDirectory(dirpath);
    }

    this.deleteFile = async function(path) {
        let mountpoint = path.substring(0, path.indexOf('/', 1)).substring(1);
        let filepath = path.substring(1 + mountpoint.length);
        let fs = this.fileSystems[mountpoint];
        await fs.deleteFile(filepath);
    }



    this.mount = async function(filesystem) {
        filesystem.fstablename = this.tablename;
        this.fileSystems[filesystem.name] = filesystem;
        if (this.currentPath == undefined || this.currentPath == '/') {
            await this.refresh('/');
        }
    }

    this.refresh = async function(path) {
        let table = $('#' + this.tablename).dataTable();
        if (this.currentPath == undefined || this.currentPath == '/' || path == '/') {
            table.fnClearTable();
            for (const [key, value] of Object.entries(this.fileSystems)) {
                let fe = new FSEntry(this.tablename, value.name, value.name, '', '', true, 0, new Date(), new Date(), new Date(), true, '');
                table.fnAddData(fe);
            }
            this.currentPath = '/';
            let curpathel = document.getElementById(`fbcurrentPath-${this.tablename}-1`);
            curpathel.innerText = this.currentPath;
        } else {
            if (path == null || path == undefined || path == '') path = this.currentPath;
            await this.changeDirectory(path)
        }
    }

    this.changeDirectory = async function(path) {
        if (path == undefined || path == '/') {
            await this.refresh('/');
            return;
        }

        let mountpoint = '';
        let fs = undefined;
        let data = [];
        if (path == '/') {
            await this.refresh('/');
            return;
        }
        if (path.indexOf('/') == -1) {
            fs = this.fileSystems[path];
            data = await fs.changeDirectory('/');
        } else {
            if (path.substring(0, 2) == '//') {
                path = path.substring(1, path.length);
            }
            if (path.charAt(path.length - 1) != '/' && path != '/') {
                path = path + '/';
            }
            mountpoint = path.slice(1, path.slice(1, path.length).indexOf('/') + 1);
            path = path.slice(mountpoint.length);
            path = path.slice(path.indexOf('/'), path.length);
            fs = this.fileSystems[mountpoint];
            data = await fs.changeDirectory(path);
        }

        let table = $('#' + this.tablename).dataTable();

        table.fnClearTable();

        let curpath = '/';
        if (mountpoint.charAt(mountpoint.length - 1) == '/') {
            curpath = '/' + mountpoint + path.substring(1);
        } else curpath = '/' + mountpoint + '/' + path.substring(1);
        this.currentPath = curpath;

        let curpathel = document.getElementById(`fbcurrentPath-${this.tablename}-1`);
        curpathel.innerText = this.currentPath;

        data.forEach(function(value) {
            table.fnAddData(value);
        });
    };


    this.setupFileDrop = function(divname) {
        let dropArea = document.getElementById(divname);

        // Prevent default drag behaviors
        ;
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false)
            document.body.addEventListener(eventName, preventDefaults, false)
        })

        // Highlight drop area when item is dragged over it
        ;
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false)
        })

        ;
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false)
        })

        // Handle dropped files
        dropArea.addEventListener('drop', handleDrop, false)

        function preventDefaults(e) {
            e.preventDefault()
            e.stopPropagation()
        }

        function highlight(e) {
            dropArea.classList.add('highlight')
        }

        function unhighlight(e) {
            dropArea.classList.remove('active')
        }

        async function handleDrop(e) {
            var dt = e.dataTransfer
            var files = dt.files
            let fb = FILEBROWSER_LOOKUP[tablename];
            await fb.createFile(files);
        }
    }


    var options = {
        "fileSystem": this,
        "bProcessing": false,
        "bServerSide": false,
        "bPaginate": false,
        "bAutoWidth": true,
        "dom": '<"toolbar">frtip',
        "fnCreatedRow": function(nRow, aData, iDataIndex) {
            $('td:eq(0)', nRow).css('min-width', '15em');
            //$(nRow).bind("click", async function(e) {
            //    e.preventDefault();
            //    let path = aData.fullpath();
            //    let fb = FILEBROWSER_LOOKUP[tablename];
            //    if (aData.isdir() == true) {
            //        await fb.changeDirectory(path);
            //    }
            //});
            $(nRow).bind("dblclick", async function(e) {
                e.preventDefault();
                let path = aData.fullpath();
                let fb = FILEBROWSER_LOOKUP[tablename];
                if (aData.isdir() == true) {
                    await fb.changeDirectory(path);
                } else {
                    //download the file
                    await fb.downloadFile(path);
                }
            });

            //$(nRow).bind("contextmenu", async function(e) {
            //    e.preventDefault();
            //    removeRightClickMenu();
            //    if (aData._name == '..') return;
            //    let path = aData.fullpath();
            //    let fb = FILEBROWSER_LOOKUP[tablename];
            //    $(`<div class='filebrowser-rightclick-menu'>
            //        <ul>
            //            <li id='fileBrowserContextMenuDelete'>Delete</li>
            //        </ul>
            //    </div>`)
            //        .appendTo("body").finish().toggle(100)
            //        .css({ top: e.originalEvent.layerY + "px", left: e.originalEvent.layerX + "px" });
            //
            //    if (aData.isdir() == true) {
            //        $('#fileBrowserContextMenuDelete').bind('click', async function(e) {
            //            removeRightClickMenu();
            //            await fb.deleteDirectory(path);
            //        });
            //    } else {
            //        $('#fileBrowserContextMenuDelete').bind('click', async function(e) {
            //            removeRightClickMenu();
            //            await fb.deleteFile(path);
            //        });
            //    }
            //});

            $('td:eq(4)', nRow, aData).bind('click', async function(event) {
                let fb = FILEBROWSER_LOOKUP[tablename];
                let path = aData.fullpath();
                if (event.originalEvent.path[1].attributes[0].value == 'fsDeleteSpan') {
                    if (aData.isdir()) {
                        await fb.deleteDirectory(path);
                    } else {
                        await fb.deleteFile(path);
                    }
                    await fb.refresh();
                }
            });
        },
        "columns": [
            //{ "title": "", "data": null, "orderable": false, 'checkboxes': { 'selectRow': true }, width: "5%", 'class': 'details-control' },
            { "title": "Name", "data": null, "orderable": true, "render": 'name', width: "40%" },
            { "title": "Size", "data": null, "orderable": true, "render": 'size', width: "10%" },
            { "title": "Created", "data": null, "orderable": true, "render": 'creationdate' },
            { "title": "Modified", "data": null, "orderable": true, "render": 'modificationdate' },
            {
                "title": "Actions",
                "data": null,
                "sortable": true,
                "render": function(data, type, row, meta) {
                    if (data._name == '..') return '';
                    let result = '';
                    if (!data.readonly()) {
                        result += `<span name="fsDeleteSpan" title="Delete"><i class='fas fa-trash'></i>&nbsp;</span>`;
                    }
                    return result;
                }
            },
        ],
        "select": {
            "style": 'multi',
        },
        "fnInitComplete": function() {
            try {
                $('div.toolbar').html(`
                <div style="margin-bottom:-35px">
                    <label id="fbcurrentPath-${tablename}" class="control-label">Current Path</label>
                    <label id="fbcurrentPath-${tablename}-1" class="control-label"></label>
                    <div class="col-sm-8">
                        <span id="fileUploadButton-${tablename}" title="Upload">
                            <i class="fas fa-upload"></i>
                        </span>
                        <input type="file" id="fileUploadButtonElem-${tablename}" multiple accept="*" onchange="" hidden>
                        <span id="createDirectoryButton" title="Create Dir">
                            <i class="fas fa-folder-plus"></i>
                        </span>
                        <input class="quickfilter" type="text" id="createFolder-${tablename}" placeholder="dirname">
                        
                        
                    </div>
                </div>            
                `);
                $("#createDirectoryButton").click(function() {
                    let fb = FILEBROWSER_LOOKUP[tablename];
                    fb.createDirectoryHTML()
                });

                $(`#fileUploadButton-${tablename}`).click(function() {
                    //$("input[type='file']").trigger('click');
                    $(`#fileUploadButtonElem-${tablename}`).trigger('click');
                });

                $('input[type="file"]').on('change', function() {
                    let fb = FILEBROWSER_LOOKUP[tablename];
                    let val = $(this).val();
                    fb.createFile(this.files);
                    //$(this).siblings('span').text(val);
                });
            } catch (err) {
                console.log(err);
            }
        }
    };

    $('#' + this.tablename).DataTable(options);
    FILEBROWSER_LOOKUP[tablename] = this;
};

function setupFileBrowser(tablename, tablediv) {
    var BFSS = new BrowserFSFileSystem('browserfs');
    let fb = new FileBrowser('fileBrowserTable');
    fb.setupFileDrop('fileBrowserDiv');
    fb.mount(BFSS);
}
//var BFSS = new BrowserFSFileSystem('browserfs');
//var fb = new FileBrowser('fileBrowserTable');
//fb.setupFileDrop('fileBrowserDiv');
//fb.mount(BFSS);