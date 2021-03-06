// counter for creating new sebsockets
var webscoket_counter = 1; // must start at one!!!
var websocket_lookup = {};
var scanner_websocket = null;
var scanner_websocket_open = false;
var scanner_websocket_lookup = {};


async function scannerWebSocketMessageHandler(event) {
    var uint8View = new Uint8Array(event.data);
    var client_id = uint8View.slice(6, 22);

    if (scanner_websocket_lookup.hasOwnProperty(client_id)) {
        await scanner_websocket_lookup[client_id]['onmessage'].put(event.data);
    } else {
        console.log("Scanner data arrived for unknown client_id " + client_id);
    }
}

function scannerWebSocketOnopen(event) {
    scanner_websocket_open = true;
    for (const [connection_id, handlers] of Object.entries(scanner_websocket_lookup)) {
        handlers['onopen'].set();
    }
}

function scannerWebSocketOnclosed(event) {
    scanner_websocket_open = false;
    for (const [connection_id, handlers] of Object.entries(scanner_websocket_lookup)) {
        handlers['onclosed'].set();
    }
}

function registerScannerWebSocket(url, onopen_cb, onmessage_cb, onclosed_cb, connection_id) {
    try {
        if (scanner_websocket == null) {
            scanner_websocket = new WebSocket(url);
            scanner_websocket.onopen = function(event) {
                scannerWebSocketOnopen(event);
            };
            scanner_websocket.onclose = function(event) {
                scannerWebSocketOnclosed(event);
            };
            scanner_websocket.onmessage = async function(event) {
                await scannerWebSocketMessageHandler(event);
            };
            scanner_websocket.binaryType = "arraybuffer";
        }
        scanner_websocket_lookup[connection_id] = {};
        scanner_websocket_lookup[connection_id]['onopen'] = onopen_cb;
        scanner_websocket_lookup[connection_id]['onmessage'] = onmessage_cb;
        scanner_websocket_lookup[connection_id]['onclosed'] = onclosed_cb;
        if (scanner_websocket_open) onopen_cb.set();
        return 0;
    } catch (error) {
        console.error(error);
        return false;
    }

}

function createNewWebSocket(url, onopen_cb, onmessage_cb, onclosed_cb, reuse_ws = false, connection_id = null) {
    try {
        if (reuse_ws) {
            return registerScannerWebSocket(url, onopen_cb, onmessage_cb, onclosed_cb, connection_id);
        }
        var ws = new WebSocket(url);
        ws.onopen = function(event) {
            onopen_cb.set();
        };
        ws.onclose = function(event) {
            onclosed_cb.set();
        };
        ws.onmessage = async function(event) {
            await onmessage_cb.put(event.data);
        };
        ws.binaryType = "arraybuffer";

        var wsid = webscoket_counter;
        webscoket_counter++;

        websocket_lookup[wsid] = ws;

        return wsid;
    } catch (error) {
        console.error(error);
        return false;
    }

}

function deleteWebSocket(wsid) {
    if (websocket_lookup.hasOwnProperty(wsid)) {
        try {
            websocket_lookup[wsid].close();
        } catch (error) {}
        try {
            delete websocket_lookup[wsid];
        } catch (error) {}

    }
}

function sendWebSocketData(wsid, dataProxy) {
    let buffer = dataProxy.getBuffer('u8clamped');
    if (wsid == 0) scanner_websocket.send(buffer.data);
    else websocket_lookup[wsid].send(buffer.data);
    dataProxy.destroy();
    buffer.release();
}