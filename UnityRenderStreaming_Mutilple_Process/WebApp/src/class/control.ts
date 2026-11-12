export class Control {
  type: ControlType;
  ipss = new Array<IpPorts>;
  constructor(type: ControlType) {
    this.type = type;
  }
}
export enum ControlType {
  Start,
  Stop,
  GetIps,
  RptTps,
}
export class Address {
  ws: WebSocket;
  ips: IpPorts;
  constructor(ws: WebSocket, ips: IpPorts) {
    this.ws = ws;
    this.ips = ips;
  }
}
export class IpPorts {
  ip: string;
  slaveId: string;
  ports: Array<string>;
  constructor(ip: string, slaveId: string, ports = new Array<string>()) {
    this.ip = ip;
    this.slaveId = slaveId;
    this.ports = ports;

  }
}