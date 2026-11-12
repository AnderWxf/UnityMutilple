import * as websocket from "ws";
import { Server } from 'http';
import * as handler from "./class/websockethandler";
import * as os from 'os';

function uuid4() {
  var temp_url = URL.createObjectURL(new Blob());
  var uuid = temp_url.toString();
  URL.revokeObjectURL(temp_url);
  return uuid.split(/[:/]/g).pop().toLowerCase(); // remove prefixes
}

export class WSSignaling {
  server: Server;
  wss: websocket.Server;

  constructor(server: Server, mode: string, ip: string) {
    this.server = server;
    this.wss = new websocket.Server({ server });
    handler.setIp(ip);
    handler.reset(mode);

    this.wss.on('connection', (ws: WebSocket) => {

      handler.add(ws);

      ws.onclose = (): void => {
        handler.remove(ws);
      };

      ws.onmessage = (event: MessageEvent): void => {
        // type: connect, disconnect JSON Schema
        // connectionId: connect or disconnect connectionId

        // type: offer, answer, candidate JSON Schema
        // from: from connection id
        // to: to connection id
        // data: any message data structure
        const msg = JSON.parse(event.data);
        if (!msg || !this) {
          return;
        }

        console.log(msg);

        switch (msg.type) {
          case "connect":
            handler.onWebConnect(ws, msg.connectionId);
            break;
          case "disconnect":
            handler.onWebDisconnect(ws, msg.connectionId);
            break;
          case "offer":
            handler.onOffer(ws, msg.data);
            break;
          case "answer":
            handler.onAnswer(ws, msg.data);
            break;
          case "candidate":
            handler.onCandidate(ws, msg.data);
            break;
          default:
            break;
        }
      };
    });
  }
}
export class WSMaster {
  server: Server;
  wss: websocket.Server;

  constructor(server: Server, mode: string, ip: string, port: number) {
    this.server = server
    this.wss = new websocket.Server({ server });
    handler.setIp(ip);
    handler.reset(mode);
    this.wss.on('connection', (ws: WebSocket) => {
      handler.add(ws);
      ws.onclose = (): void => {
        handler.onMasterDisconnect(ws);
        handler.remove(ws);
      };

      ws.onmessage = (event: MessageEvent): void => {
        const msg = JSON.parse(event.data);
        if (!msg || !this) {
          return;
        }

        console.log(msg);
        switch (msg.type) {
          case "connect":
            handler.onMasterConnect(ws, msg.connectionId);
            break;
          case "disconnect":
            handler.onMasterDisconnect(ws);
            break;
          case "control":
            handler.onMasterControl(ws, msg.data);
            break;
          default:
            break;
        }
      };
    });
  }

  getIPAddress(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const k in interfaces) {
      for (const k2 in interfaces[k]) {
        const address = interfaces[k][k2];
        if (address.family === 'IPv4') {
          addresses.push(address.address);
        }
      }
    }
    return addresses;
  }
}


export class WSSlave {
  master: string;
  wss: WebSocket;
  slaveId: string;

  constructor(master: string, mport: number) {
    this.master = master;
    handler.setIp(master);
    let url = "ws://" + master + ':' + mport;
    this.slaveId = uuid4();
    this.createsocket(url);
  }

  createsocket(url: string) {
    let thiz = this;
    console.log('connect to : ' + url);
    this.wss = new WebSocket(url);
    this.wss.onopen = (event: Event) => {
      console.log('open to : ' + url);
      let ws = event.target as WebSocket;
      handler.add(ws);
      handler.onSlaveConnect(ws, this.slaveId);
    };
    this.wss.onclose = (event: CloseEvent): void => {
      console.log('socket closed : ' + url);
      let ws = event.target as WebSocket;
      handler.remove(ws);
      setTimeout(function () { thiz.createsocket(url); }, 2000); // 重新连接。
    };
    this.wss.onerror = (event: CloseEvent): void => {
      console.log('connect error : ' + url);
      setTimeout(function () { thiz.createsocket(url); }, 2000); // 重新连接。
    };
    this.wss.onmessage = (event: MessageEvent): void => {
      let ws = event.target as WebSocket;

      const msg = JSON.parse(event.data);
      if (!msg || !this) {
        return;
      }

      console.log(msg);

      switch (msg.type) {
        case "connect":
          handler.onSlaveConnect(ws, msg.connectionId);
          break;
        case "disconnect":
          handler.onSlaveDisconnect(ws, msg.connectionId);
          break;
        case "control":
          handler.onSlaveControl(ws, msg.data, this.slaveId);
          break;
        default:
          break;
      }
    };
  }
}