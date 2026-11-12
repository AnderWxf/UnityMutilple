import {
  WebSocketControl
} from "../../module/signaling.js";

/** @type {WebSocketControl} */
let control;

const ServersDiv = document.getElementById('SlaveSevers');

const sendLinkMasterButton = document.getElementById('sendLinkMasterButton');
const MasterIP = document.getElementById('MasterIP');
const MasterPort = document.getElementById('MasterPort');
sendLinkMasterButton.addEventListener("click", sendLinkMasterClick);

function sendLinkMasterClick() {
  let ip = MasterIP.value;
  let port = MasterPort.value;
  if (control == null) {
    control = new WebSocketControl(1000, ip, port);
    control.addEventListener('control', _onControl);
  }
}

function sendStartServerClick(i) {
  const ip = ipss[i].ip;
  const slaveId = ipss[i].slaveId;
  const port = document.getElementById('port_' + i).value;
  let controldata = {
    type: 0,
    ipss: [{
      ip: ip,
      slaveId: slaveId,
      ports: [port]
    }],
  };
  control.sendControl(control.connectionId, controldata);
}

function sendStopServerClick(i, port) {
  const ip = ipss[i].ip;
  const slaveId = ipss[i].slaveId;
  let controldata = {
    type: 1,
    ipss: [{
      ip: ip,
      slaveId: slaveId,
      ports: [port]
    }],
  };
  control.sendControl(control.connectionId, controldata);
}

let ipss = null;

function _onControl(e) {
  const dat = e.detail.data.control;
  switch (dat.type) {
    case 0:
      break;
    case 1:
      break;
    case 2:
      break;
    case 3:
      ipss = dat.ipss
      showStatsControlIpss();
      break;
  }
}

function showStatsControlIpss() {
  ServersDiv.style.display = 'block';
  ServersDiv.innerHTML = '';
  for (let i = 0; i < ipss.length; i++) {
    let ips = ipss[i];



    // let iptext = document.createElement("input");
    // iptext.setAttribute('type', "text");
    // iptext.setAttribute('value', ips.ip);
    // iptext.setAttribute('id', 'ip_' + i);
    // iptext.setAttribute('width', 50);
    // iptext.setAttribute('disabled', true);


    // let slaveidtext = document.createElement("input");
    // slaveidtext.setAttribute('type', "text");
    // slaveidtext.setAttribute('value', ips.slaveId);
    // slaveidtext.setAttribute('id', 'slaveId_' + i);
    // slaveidtext.setAttribute('width', 250);
    // slaveidtext.setAttribute('disabled', true);

    let defaultport = 8090;
    if (ips.ports.length > 0) {
      defaultport = Number(ips.ports[ips.ports.length - 1]) + 1;
    }
    let porttext = document.createElement("input");
    porttext.setAttribute('type', "text");
    porttext.setAttribute('value', defaultport);
    porttext.setAttribute('id', 'port_' + i);
    porttext.setAttribute('width', 50);

    let ip_ = document.createTextNode("Ip: " + ips.ip + " .");
    let slaveId_ = document.createTextNode(" SlaveId: " + ips.slaveId + " .");
    let unityPort_ = document.createTextNode(" New unity port: ");


    let startButton = document.createElement("input");
    startButton.setAttribute('type', "button")
    startButton.setAttribute('value', "Start Server")
    startButton.addEventListener("click", sendStartServerClick.bind(this, i));

    let br = document.createElement("br");

    ServersDiv.appendChild(ip_);
    // ServersDiv.appendChild(iptext);
    ServersDiv.appendChild(slaveId_);
    // ServersDiv.appendChild(slaveidtext);
    ServersDiv.appendChild(unityPort_);
    ServersDiv.appendChild(porttext);
    ServersDiv.appendChild(startButton);
    ServersDiv.appendChild(br);

    let ports = ips.ports;
    for (let j = 0; j < ports.length; j++) {

      let OpenedUnityPort_ = document.createTextNode("Opened unity port: ");

      let porttext = document.createElement("input");
      porttext.setAttribute('type', "text");
      porttext.setAttribute('value', ports[j]);
      porttext.setAttribute('id', 'port_' + ports[j]);
      porttext.setAttribute('width', 50);
      porttext.setAttribute('disabled', true);

      let stopButton = document.createElement("input");
      stopButton.setAttribute('type', "button");
      stopButton.setAttribute('value', "Stop Server");
      stopButton.addEventListener("click", sendStopServerClick.bind(this, i, ports[j]));


      let link = document.createElement("a");

      link.href = 'http://' + ips.ip + ':' + ports[j] + '/receiver/index.html';
      link.text = ' Open this video page';
      // link.setAttribute('rel', "stylesheet");
      // link.setAttribute('href', 'http://' + ips.ip + ':' + ports[j] + '/receiver/index.html');

      let br = document.createElement("br");
      ServersDiv.appendChild(OpenedUnityPort_);
      ServersDiv.appendChild(porttext);
      ServersDiv.appendChild(stopButton);
      ServersDiv.appendChild(link);
      ServersDiv.appendChild(br);
    }
  }
}
