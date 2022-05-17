// this section is to store references to graph networks (vis)
var graphs_lookup = {};
var graph_events = {};
var graph_node_search_lookup = {};



const graphOptions = {
    autoResize: true,
    layout: {
        hierarchical: false
    },
    edges: {
        arrowStrikethrough: true,
        chosen: true,
        dashes: false,
        smooth: {
            enabled: false,
        },
        arrows: {
            to: { enabled: true, scaleFactor: 0.75, type: 'arrow' },
            middle: { enabled: false, scaleFactor: 1, type: 'arrow' },
            from: { enabled: true, scaleFactor: 0.3, type: 'arrow' }
        },
        color: {
            // color:'#848484',
            color: '#3F51B5',
            highlight: '#8596f2',
            hover: '#6f82e8',
            inherit: 'from',
            opacity: 1.0
        },
        font: {
            color: '#45a636',
            size: 14, // px
            face: 'arial',
            background: 'none',
            strokeWidth: 2, // px
            strokeColor: '#2b4527',
            align: 'horizontal',
            multi: false,
            vadjust: 0,
            bold: {
                color: '#45a636',
                size: 14, // px
                face: 'arial',
                vadjust: 0,
                mod: 'bold'
            },
            ital: {
                color: '#45a636',
                size: 14, // px
                face: 'arial',
                vadjust: 0,
                mod: 'italic'
            },
            boldital: {
                color: '#45a636',
                size: 14, // px
                face: 'arial',
                vadjust: 0,
                mod: 'bold italic'
            },
            mono: {
                color: '#45a636',
                size: 15, // px
                face: 'courier new',
                vadjust: 2,
                mod: ''
            }
        }
    },
    nodes: {
        font: {
            color: '#45a636',
            size: 14, // px
            face: 'arial',
            background: 'none',
            strokeWidth: 2, // px
            strokeColor: '#2b4527',
            align: 'horizontal',
            multi: false,
            vadjust: 0,
            bold: {
                color: '#45a636',
                size: 14, // px
                face: 'arial',
                vadjust: 0,
                mod: 'bold'
            },
            ital: {
                color: '#45a636',
                size: 14, // px
                face: 'arial',
                vadjust: 0,
                mod: 'italic'
            },
            boldital: {
                color: '#45a636',
                size: 14, // px
                face: 'arial',
                vadjust: 0,
                mod: 'bold italic'
            },
            mono: {
                color: '#45a636',
                size: 15, // px
                face: 'courier new',
                vadjust: 2,
                mod: ''
            }
        }
    },
    interaction: {
        hover: false,
    },
    // http://visjs.org/docs/network/physics.html#
    physics: {
        enabled: true,
        barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.3,
            // springLength: 95,
            springLength: 175,
            springConstant: 0.04,
            damping: 0.09,
            avoidOverlap: 0.2
        },
        //forceAtlas2Based: {
        //    gravitationalConstant: -50,
        //    centralGravity: 0.01,
        //    springConstant: 0.08,
        //    springLength: 100,
        //    damping: 0.4,
        //    avoidOverlap: 0
        //},
        //repulsion: {
        //    centralGravity: 0.2,
        //    springLength: 200,
        //    springConstant: 0.05,
        //    nodeDistance: 100,
        //    damping: 0.09
        //},
        hierarchicalRepulsion: {
            centralGravity: 0.0,
            springLength: 100,
            springConstant: 0.01,
            nodeDistance: 120,
            damping: 0.09
        },
        maxVelocity: 50,
        minVelocity: 0.1,
        solver: 'barnesHut',
        stabilization: {
            enabled: true,
            iterations: 1000,
            updateInterval: 100,
            onlyDynamicEdges: false,
            fit: true
        },
        timestep: 0.5,
        adaptiveTimestep: true
    }
};

const graphOptionsHierarchical = {...graphOptions };
graphOptionsHierarchical['edges'] = {
    ...graphOptions.edges,
    arrows: {
        to: { enabled: false, scaleFactor: 0.5, type: 'bar' },
        middle: { enabled: false, scaleFactor: 1, type: 'arrow' },
        from: { enabled: false, scaleFactor: 0.5, type: 'arrow' }
    }
}
graphOptionsHierarchical['layout'] = {
    hierarchical: {
        direction: "LR",
        sortMethod: "directed",
        levelSeparation: 400,
        nodeSpacing: 100,
    }
};
graphOptionsHierarchical['interaction'] = {
    hover: true
}


function getNodeTitle(node) {
    return `
        <table class="node-label-wrapper">
            <tr class="node-label-name">
                <td class="node-label-name-key">Name:</td>
                <td class="node-label-name-value">${node.label}</td>
            </tr>
            <tr class="node-label-type">
                <td class="node-label-type-key">Type:</td>
                <td class="node-label-type-value">${node.type}</td>
            </tr>
            <tr class="node-label-id">
                <td class="node-label-id-key">ID:</td>
                <td class="node-label-id-value">${node.id}</td>
            </tr>
        </table>
        `;
}

function getNodeImage(node) {
    let imgData = {
        selected: null,
        unselected: null
    }
    switch (node.type) {
        case 'group':
            imgData.selected = '/img/graph/group.png';
            imgData.unselected = '/img/graph/group.png';
            if (node.highvalue) {
                imgData.selected = '/img/graph/group_hvt.png';
                imgData.unselected = '/img/graph/group_hvt.png';
            }
            if (node.owned) {
                imgData.selected = '/img/graph/group_owned.png';
                imgData.unselected = '/img/graph/group_owned.png';
            }
            break;
        case 'user':
            imgData.selected = '/img/graph/user.png';
            imgData.unselected = '/img/graph/user.png';
            if (node.highvalue) {
                imgData.selected = '/img/graph/user_hvt.png';
                imgData.unselected = '/img/graph/user_hvt.png';
            }
            if (node.owned) {
                imgData.selected = '/img/graph/user_owned.png';
                imgData.unselected = '/img/graph/user_owned.png';
            }
            break;
        case 'machine':
            imgData.selected = '/img/graph/computer.png';
            imgData.unselected = '/img/graph/computer.png';
            if (node.highvalue) {
                imgData.selected = '/img/graph/computer_hvt.png';
                imgData.unselected = '/img/graph/computer_hvt.png';
            }
            if (node.owned) {
                imgData.selected = '/img/graph/computer_owned.png';
                imgData.unselected = '/img/graph/computer_owned.png';
            }
            break;
        case 'ou':
            imgData.selected = '/img/graph/organizational.png';
            imgData.unselected = '/img/graph/organizational.png';
            break;
        default:
            imgData.selected = '/img/graph/unknown.png';
            imgData.unselected = '/img/graph/unknown.png';
            break;
    }
    return imgData;
}

function preProcessNodes(nodes) {
    return nodes.map(node => {
        node['image'] = this.getNodeImage(node);
        node['title'] = this.getNodeTitle(node);
        node['shape'] = 'circularImage';
        return node;
    });
}

function applySmoothToEdges(array) {
    const newArray = [...array]
    newArray.forEach((el, index) => {
        newArray.forEach((compEl, compIndex) => {
            if ((el !== compEl) && el.from === compEl.from) {
                if (!el.smooth) {
                    newArray[index] = {
                        ...el,
                        smooth: {
                            enabled: true,
                            type: "curvedCW",
                            roundness: 0.1
                        }
                    }
                }
                if (!compEl.smooth) {
                    newArray[compIndex] = {
                        ...compEl,
                        smooth: {
                            enabled: true,
                            type: "curvedCCW",
                            roundness: 0.1
                        }
                    }
                }
            }
        })
    })
    return newArray
}


function addNewGraphCanvasWindow(clientid, graphid, path_calc_cb, node_set_cb, node_search_cb) {
    try {
        graph_events[`graphcanvas-${clientid}-${graphid}`] = {};
        graph_events[`graphcanvas-${clientid}-${graphid}`]['pathcalc'] = path_calc_cb;
        graph_events[`graphcanvas-${clientid}-${graphid}`]['nodeset'] = node_set_cb;
        graph_events[`graphcanvas-${clientid}-${graphid}`]['nodesearch'] = node_search_cb;


        // Creating new tab
        var newItemConfig = {
            title: 'Graph-' + graphid,
            type: 'component',
            componentName: 'graphWindowComponent',
            componentState: {
                text: 'text',
                clientid: clientid,
                graphid: graphid,
            }
        };
        myLayout.root.contentItems[0].addChild(newItemConfig);

        //creating graph inside of new tab

        var container = document.getElementById(`graphcanvas-${clientid}-${graphid}`);
        var data = {
            nodes: new vis.DataSet(),
            edges: new vis.DataSet(),
        };
        var network = new vis.Network(container, data, graphOptionsHierarchical);
        network.once('afterDrawing', () => {
            container.style.height = '100vh'
        });
        network.redraw();
        graphs_lookup[`graphcanvas-${clientid}-${graphid}`] = network;

        return true;
    } catch (error) {
        console.error(error);
        return false;
    }


}

function updateGraphCanvas(clientid, graphid, graphdata_json) {
    try {
        var garphdata = JSON.parse(graphdata_json);
        var network = graphs_lookup[`graphcanvas-${clientid}-${graphid}`];
        network.destroy();

        var data = {
            nodes: preProcessNodes(garphdata.nodes),
            edges: applySmoothToEdges(garphdata.edges),
        };

        var container = document.getElementById(`graphcanvas-${clientid}-${graphid}`);
        network = new vis.Network(container, data, graphOptionsHierarchical);
        // should implement a menu here to set hvt and owned
        network.on('oncontext', function(props) {
            removeRightClickMenu();
            var node = network.getNodeAt(props.pointer.DOM);
            if (node == undefined) return;
            props.event.preventDefault();
            console.log(node);
            $(`<div class='graph-nodes-rightclick-menu'>
                    <ul>
                        <li onclick="toggleNodeProperty(${clientid}, ${graphid}, '${node}', 'HVT')">HVT</li>
                        <li onclick="toggleNodeProperty(${clientid}, ${graphid}, '${node}', 'OWNED')">OWNED</li>
                    </ul>
                </div>`)
                .appendTo("body").finish().toggle(100)
                .css({ top: props.event.y + "px", left: props.event.x + "px" });
        });
        network.on('click', function(properties) {
            removeRightClickMenu();
        });

        graphs_lookup[`graphcanvas-${clientid}-${graphid}`] = network;
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function calcPath(clientid, graphid, pathtype, src = null, dst = null) {
    path_calc_cb = graph_events[`graphcanvas-${clientid}-${graphid}`]['pathcalc'];
    var excludeTag = document.getElementsByName("excludeEdgeList");

    // checking edges to exclude
    var edgeExcludeList = [];
    var edgeExclude = '';
    for (let i = 0; i < excludeTag.length; i++) {
        if (excludeTag[i].checked) {
            continue;
        }
        edgeExcludeList.push(excludeTag[i].value);
    }
    if (edgeExcludeList.length > 0) {
        edgeExclude = edgeExcludeList.join();
    }

    if (pathtype == 'PATH') {
        var searchterm_src = document.getElementById(`pathcalcbutton-src-${clientid}-${graphid}`).value;
        var searchterm_dst = document.getElementById(`pathcalcbutton-dst-${clientid}-${graphid}`).value;
        if (searchterm_src != '' && searchterm_src != undefined && searchterm_src != 'HVT' && searchterm_src != 'OWNED' && searchterm_src != 'hvt' && searchterm_src != 'owned') {
            if (!(searchterm_src in graph_node_search_lookup)) {
                console.log('object with name ' + searchterm_src + ' not found in DB!');
                return;
            } else {
                src = graph_node_search_lookup[searchterm_src];
            }
        }
        if (searchterm_dst != '' && searchterm_dst != undefined && searchterm_dst != 'HVT' && searchterm_dst != 'OWNED' && searchterm_dst != 'hvt' && searchterm_dst != 'owned') {
            if (!(searchterm_dst in graph_node_search_lookup)) {
                console.log('object with name ' + searchterm_dst + ' not found in DB!');
                return;
            } else {
                dst = graph_node_search_lookup[searchterm_dst];
            }
        }
    }
    console.log(edgeExclude);
    await path_calc_cb(pathtype, src, dst, edgeExclude);
}

async function searchNodes(clientid, graphid, direction) {
    var searchterm = document.getElementById(`pathcalcbutton-${direction}-${clientid}-${graphid}`).value;
    var searchdl = document.getElementById(`pathcalcbutton-${direction}-${clientid}-${graphid}-datalist`);
    nodesearch_cb = graph_events[`graphcanvas-${clientid}-${graphid}`]['nodesearch'];
    var x = await nodesearch_cb(searchterm);
    var xval = x.toJs();
    x.destroy();
    if (xval[1] == undefined) {
        searchdl.innerHTML = '';
        xval[0].forEach(function(item) {
            graph_node_search_lookup[item.get('text')] = item.get('sid');
            var option = document.createElement('option');
            option.value = item.get('text');
            searchdl.appendChild(option);
        });

    } else {
        //error happened!
        console.log(xval);
    }

}

async function toggleNodeProperty(clientid, graphid, sid, propertyname) {
    console.log(clientid);
    console.log(graphid);
    console.log(sid);
    console.log(propertyname);

    removeRightClickMenu();
}

function removeRightClickMenu() {
    const elements = document.getElementsByClassName('graph-nodes-rightclick-menu');
    while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
    }
}