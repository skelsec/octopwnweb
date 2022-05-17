function addNewNmapWindow(code) {
    var newItemConfig = {
        title: 'NMAP',
        type: 'component',
        componentName: 'nmapWindowComponent',
        componentState: {
            code: code
        }
    };
    myLayout.root.contentItems[0].addChild(newItemConfig);
}