import Offer from './offer';
import Answer from './answer';
import Candidate from './candidate';
import { Control, Address, ControlType, IpPorts } from './control';
import { exec, execSync } from 'child_process';


let isPrivate: boolean;

// [{sessonId:[connectionId,...]}]
const clients: Map<WebSocket, Set<string>> = new Map<WebSocket, Set<string>>();

// [{connectionId:[sessionId1, sessionId2]}]
const connectionPair: Map<string, [WebSocket, WebSocket]> = new Map<string, [WebSocket, WebSocket]>();

function getOrCreateConnectionIds(session: WebSocket): Set<string> {
  let connectionIds = null;
  if (!clients.has(session)) {
    connectionIds = new Set<string>();
    clients.set(session, connectionIds);
  }
  connectionIds = clients.get(session);
  return connectionIds;
}

function reset(mode: string): void {
  isPrivate = mode == "private";
}

function add(ws: WebSocket): void {
  clients.set(ws, new Set<string>());
}

function remove(ws: WebSocket): void {
  const connectionIds = clients.get(ws);
  connectionIds.forEach(connectionId => {
    const pair = connectionPair.get(connectionId);
    if (pair) {
      const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
      if (otherSessionWs) {
        otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
      }
    }
    connectionPair.delete(connectionId);
  });

  clients.delete(ws);
}

function onWebConnect(ws: WebSocket, connectionId: string): void {
  let polite = true;
  if (isPrivate) {
    if (connectionPair.has(connectionId)) {
      const pair = connectionPair.get(connectionId);

      if (pair[0] != null && pair[1] != null) {
        ws.send(JSON.stringify({ type: "error", message: `${connectionId}: This connection id is already used.` }));
        return;
      } else if (pair[0] != null) {
        connectionPair.set(connectionId, [pair[0], ws]);
      }
    } else {
      connectionPair.set(connectionId, [ws, null]);
      polite = false;
    }
  }

  const connectionIds = getOrCreateConnectionIds(ws);
  connectionIds.add(connectionId);
  ws.send(JSON.stringify({ type: "connect", connectionId: connectionId, polite: polite }));
}

function onMasterConnect(ws: WebSocket, connectionId: string): void {
  // Nothing to do.
  webs.push(new Address(ws, null));
}

function onSlaveConnect(ws: WebSocket, connectionId: string): void {
  sendMyPortsToMaster(ws, connectionId);
}

function onWebDisconnect(ws: WebSocket, connectionId: string): void {
  const connectionIds = clients.get(ws);
  connectionIds.delete(connectionId);

  if (connectionPair.has(connectionId)) {
    const pair = connectionPair.get(connectionId);
    const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
    if (otherSessionWs) {
      otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
    }
  }
  connectionPair.delete(connectionId);
  ws.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
}

function onMasterDisconnect(ws: WebSocket): void {
  for (let k = 0; k < slaves.length; k++) {
    if (slaves[k].ws == ws) {
      slaves.splice(k, 1);
      break;
    }
  }
  for (let k = 0; k < webs.length; k++) {
    if (webs[k].ws == ws) {
      webs.splice(k, 1);
      break;
    }
  }
}

function onSlaveDisconnect(ws: WebSocket, connectionId: string): void {
  // Nothing to do.
}

function onOffer(ws: WebSocket, message: any): void {
  const connectionId = message.connectionId as string;
  const newOffer = new Offer(message.sdp, Date.now(), false);

  if (isPrivate) {
    if (connectionPair.has(connectionId)) {
      const pair = connectionPair.get(connectionId);
      const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
      if (otherSessionWs) {
        newOffer.polite = true;
        otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "offer", data: newOffer }));
      }
    }
    return;
  }

  connectionPair.set(connectionId, [ws, null]);
  clients.forEach((_v, k) => {
    if (k == ws) {
      return;
    }
    k.send(JSON.stringify({ from: connectionId, to: "", type: "offer", data: newOffer }));
  });
}

function onAnswer(ws: WebSocket, message: any): void {
  const connectionId = message.connectionId as string;
  const connectionIds = getOrCreateConnectionIds(ws);
  connectionIds.add(connectionId);
  const newAnswer = new Answer(message.sdp, Date.now());

  if (!connectionPair.has(connectionId)) {
    return;
  }

  const pair = connectionPair.get(connectionId);
  const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];

  if (!isPrivate) {
    connectionPair.set(connectionId, [otherSessionWs, ws]);
  }

  otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "answer", data: newAnswer }));
}

function onCandidate(ws: WebSocket, message: any): void {
  const connectionId = message.connectionId;
  const candidate = new Candidate(message.candidate, message.sdpMLineIndex, message.sdpMid, Date.now());

  if (isPrivate) {
    if (connectionPair.has(connectionId)) {
      const pair = connectionPair.get(connectionId);
      const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
      if (otherSessionWs) {
        otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "candidate", data: candidate }));
      }
    }
    return;
  }

  clients.forEach((_v, k) => {
    if (k === ws) {
      return;
    }
    k.send(JSON.stringify({ from: connectionId, to: "", type: "candidate", data: candidate }));
  });
}
// only for master
let slaves = new Array<Address>;
let webs = new Array<Address>;

// only for slave
let child_process = new Array<{ node, unity, port }>();
let theip: string = '';
function setIp(ip: string): void {
  theip = ip;
}

function onMasterControl(ws: WebSocket, message: any): void {

  let control = message.control;
  switch (control.type) {
    case ControlType.Start:
      // relay message to slave.
      {
        let ipss = control.ipss;
        for (let i = 0; i < ipss.length; i++) {
          for (let j = 0; j < slaves.length; j++) {
            if (ipss[i].ip == slaves[j].ips.ip && ipss[i].slaveId == slaves[j].ips.slaveId) {
              const controlInfo = new Control(ControlType.Start);
              controlInfo.ipss.push(ipss[i]);
              const retdata = {
                'control': controlInfo,
              };
              const sendJson = JSON.stringify({
                type: "control",
                data: retdata
              });
              slaves[j].ws.send(sendJson);
              break;
            }
          }
        }
      }

      break;
    case ControlType.Stop:
      // relay message to slave.
      {
        let ipss = control.ipss;
        for (let i = 0; i < ipss.length; i++) {
          for (let j = 0; j < slaves.length; j++) {
            if (ipss[i].ip == slaves[j].ips.ip && ipss[i].slaveId == slaves[j].ips.slaveId) {
              const controlInfo = new Control(ControlType.Stop);
              controlInfo.ipss.push(ipss[i]);
              const retdata = {
                'control': controlInfo,
              };
              const sendJson = JSON.stringify({
                type: "control",
                data: retdata
              });
              slaves[j].ws.send(sendJson);
              break;
            }
          }
        }
      }
      break;
    case ControlType.GetIps:
      {
        // return salves state.
        const controlInfo = new Control(ControlType.RptTps);
        for (let j = 0; j < slaves.length; j++) {
          controlInfo.ipss.push(slaves[j].ips);
        }
        const retdata = {
          'control': controlInfo,
        };
        const sendJson = JSON.stringify({
          type: "control",
          data: retdata
        });
        ws.send(sendJson);

        // find from webs.
        let isFound = false;
        for (let j = 0; j < webs.length; j++) {
          if (ws == webs[j].ws) {
            isFound = true;
            break;
          }
        }
        if (!isFound) {
          webs.push(new Address(ws, null));
        }
      }
      break;
    case ControlType.RptTps:
      {
        // update salves state.
        let ipss = control.ipss;
        let isFound = false;
        for (let i = 0; i < ipss.length; i++) {
          for (let j = 0; j < slaves.length; j++) {
            if (ipss[i].ip == slaves[j].ips.ip && ipss[i].slaveId == slaves[j].ips.slaveId) {
              slaves[j].ips.ports = ipss[i].ports;
              isFound = true;
              break;
            }
          }
        }
        if (!isFound) {
          slaves.push(new Address(ws, ipss[0]));
        }

        // boradcast slaves state to webs.
        const controlInfo = new Control(ControlType.RptTps);
        for (let j = 0; j < slaves.length; j++) {
          controlInfo.ipss.push(slaves[j].ips);
        }
        for (let i = 0; i < webs.length; i++) {
          const retdata = {
            'control': controlInfo,
          };
          const sendJson = JSON.stringify({
            type: "control",
            data: retdata
          });
          webs[i].ws.send(sendJson);
        }
      }
      break;
  }
}

function onSlaveControl(ws: WebSocket, message: any, slaveId: string): void {
  // const connectionId = message.connectionId;
  let control = message.control;
  switch (control.type) {
    case ControlType.Start:
      // start a new child process.
      {
        let ipss = control.ipss;
        for (let k = 0; k < ipss.length; k++) {
          if (ipss[k].ip == theip) {
            let ports = control.ipss[k].ports;
            for (let j = 0; j < ports.length; j++) {
              let port = ports[j];
              let isFound = false;
              for (let i = 0; i < child_process.length; i++) {
                let child = child_process[i];
                if (child.port == port) {
                  isFound = true;
                  break;
                }
              }
              if (!isFound) {
                let node = exec('node ./build/index.js -st unity -p ' + port);
                let unity = exec('F:\\RenderStreaming\\Test60_Multiple_Process_01\\Build\\Test60_Multiple_Process_01 websocket-port=' + port);
                child_process.push({ node, unity, port });
              }
            }
          }
        }
      }
      break;
    case ControlType.Stop:
      // stop a new child process.
      {
        let ipss = control.ipss;
        for (let k = 0; k < ipss.length; k++) {
          if (ipss[k].ip == theip) {
            let ports = control.ipss[k].ports;
            for (let j = 0; j < ports.length; j++) {
              let port = ports[j];
              for (let i = 0; i < child_process.length; i++) {
                let child = child_process[i];
                if (child.port == port) {
                  // Windows 系统使用 taskkill
                  if (process.platform === 'win32') {
                    execSync(`taskkill /pid ${child.node.pid} /T /F`);
                    execSync(`taskkill /pid ${child.unity.pid} /T /F`);
                  } else {
                    // Linux/Mac 系统
                    process.kill(child.node.pid, 'SIGKILL');
                    process.kill(child.node.pid, 'SIGKILL');
                  }
                  child_process.splice(i, 1);

                  break;
                }
              }
            }
          }
        }
      }
      break;
  }
  sendMyPortsToMaster(ws, slaveId);
}

function sendMyPortsToMaster(ws: WebSocket, slaveId: string): void {
  let ports = new Array<string>();
  if (child_process.length) {
    for (let i = 0; i < child_process.length - 1; i++) {
      let child = child_process[i];
      ports.push(child.port);
    }
    ports.push(child_process[child_process.length - 1].port);
  }
  let me = new IpPorts(theip, slaveId, ports);
  const controlInfo = new Control(ControlType.RptTps);
  controlInfo.ipss.push(me);
  const retdata = {
    'control': controlInfo,
  };
  const sendJson = JSON.stringify({
    type: "control",
    data: retdata
  });
  ws.send(sendJson);
}


export {
  reset, add, remove,
  onWebConnect,
  onMasterConnect,
  onSlaveConnect,
  onWebDisconnect,
  onMasterDisconnect,
  onSlaveDisconnect,
  onOffer,
  onAnswer,
  onCandidate,
  onMasterControl,
  onSlaveControl,
  setIp
};
