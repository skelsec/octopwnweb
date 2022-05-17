// this file contains the functions used for initializing/saving/restoring the editor
// when the user creates a new UTILS/NOTES tab

var NOTES_SAVE_SHIELD = {};

async function createEditor(clientid) {
    // initializing tuieditor
    NOTES_SAVE_SHIELD[clientid] = false;
    var initcontent = await getInitialContent(clientid);
    var editor = new toastui.Editor({
        el: document.querySelector(`#notesdiv-${clientid}`),
        previewStyle: 'vertical',
        height: '800px',
        initialValue: initcontent,
    });
    editor.on('load', function() {
        editor.setMarkdown('HELLO!', true);
    });
    editor.on('change', async function() {
        await saveEditorContet(clientid, editor);
    });

}

async function getInitialContent(clientid) {
    // fetching the content of the notes object
    // it is used for restoring data after a reload
    console.log(clientid);
    var client = OCTOPWN_CLIENT_LOOKUP[clientid];
    var x = await client.do_getcontent(false);
    var res = x.toJs();
    x.destroy();
    return res[0];
}

async function DelayedSave(clientid, editor) {
    // saving the contents of the editor to the python object
    // this function is called N seconds after the editor has been updated
    var markdown = editor.getMarkdown();
    var client = OCTOPWN_CLIENT_LOOKUP[clientid];
    await client.do_updatetext(markdown, false);
    NOTES_SAVE_SHIELD[clientid] = false;
}

async function saveEditorContet(clientid, editor) {
    // saving the editors contents, because this function is invoked every time
    // a change occurs in the GUI editor, a shield mechanism used to protect multiple
    // calls to the actual save function
    if (NOTES_SAVE_SHIELD[clientid]) {
        return;
    }
    NOTES_SAVE_SHIELD[clientid] = true;
    setTimeout(async function() {
        await DelayedSave(clientid, editor);
    }, 2000); //wait 2 seconds
}