import {
  MemoryHelper
} from "./memoryhelper.js";

export class LocalProcessManager {
  constructor() {
    this._onevent = new EventTarget();
  }

  /**
   * event type 'event', 'changedeviceusage'
   * @return {Event}
   */
  get onEvent() {
    return this._onevent;
  }

  /**
   * @return {Event}
   */
  get devices() {
    throw new Error(`Please implement this method.`);
  }

  /**
   * @return {Number} time (sec)
   */
  get startTime() {
    return this._startTime;
  }

  /**
   * @return {Number} time (sec)
   */
  get timeSinceStartup() {
    return Date.now() / 1000 - this.startTime;
  }

  /**
   * @param {Number} time (sec)
   */
  setStartTime(time) {
    this._startTime = time;
  }
}

export class ProcessRemoting {
  /**
   * @param {LocalProcessManager} manager 
   */
  constructor(manager) {
    this._localManager = manager;
    this._subscribers = new Array();
    this._sending = false;
  }

  startSending() {
    if (this._sending) {
      return;
    }
    this._sending = true;

    const onStart = e => {
      // this._sendEvent(e.detail.event);
    };

    const onStop = e => {
      // this._sendDeviceChange(e.detail.device, e.detail.change);
    };

    this._localManager.setStartTime(Date.now() / 1000);
    this._localManager.onEvent.addEventListener("start", onStart);
    this._localManager.onEvent.addEventListener("stop", onStop);
    this._sendInitialMessages();
  }

  stopSending() {
    if (!this._sending) {
      return;
    }
    this._sending = false;
  }

  /**
   * 
   * @param {Observer} observer 
   */
  subscribe(observer) {
    this._subscribers.push(observer);
  }

  _sendInitialMessages() {
    // this._sendAllGeneratedLayouts();
    // this._sendAllDevices();
  }

  _sendEvent(event) {
    const message = NewEventsMsg.create(event);
    this._send(message);
  }

  _send(message) {
    for (let subscriber of this._subscribers) {
      subscriber.onNext(message);
    }
  }
}

export const ProcessMessageType = {
  StartProcess: 0,
  StopProcess: 1,
};

export class Message {
  /**
   * field offset 0
   * {Number} participant_id;
   * 
   * field offset 4
   * {Number} type;
   * 
   * field offset 8
   * {Number} length;
   * 
   * field offset 12
   * {ArrayBuffer} data;
   */

  /**
   * 
   * @param {number} participantId 
   * @param {MessageType} type 
   * @param {ArrayBuffer} data 
   */
  constructor(participantId, type, data) {
    this.participant_id = participantId;
    this.type = type;
    this.length = data.byteLength;
    this.data = data;
  }

  /**
   * 
   * @returns {ArrayBuffer}
   */
  get buffer() {
    const totalSize =
      MemoryHelper.sizeOfInt + // size of this.participant_id
      MemoryHelper.sizeOfInt + // size of this.type
      MemoryHelper.sizeOfInt + // size of this.length
      this.data.byteLength; // size of this.data

    let buffer = new ArrayBuffer(totalSize);
    let dataView = new DataView(buffer);
    let uint8view = new Uint8Array(buffer);
    dataView.setUint32(0, this.participant_id, true);
    dataView.setUint32(4, this.type, true);
    dataView.setUint32(8, this.length, true);
    uint8view.set(new Uint8Array(this.data), 12);
    return buffer;
  }
}

export class StartProcessMsg {
  /**
   * @param {Process} device 
   * @returns {Message}
   */
  static create(process) {
    const data = {
      id: process.id,
      port: process.port,
    };
    const json = JSON.stringify(data);
    let buffer = new ArrayBuffer(json.length * 2); // 2 bytes for each char
    let view = new Uint8Array(buffer);
    const length = json.length;
    for (let i = 0; i < length; i++) {
      view[i] = json.charCodeAt(i);
    }
    return new Message(0, ProcessMessageType.StartProcess, buffer);
  }
}

export class StopServerMsg {
  /**
   * @param {Process} device 
   * @returns {Message}
   */
  static create(process) {
    const data = {
      id: process.id,
      port: process.port,
    };
    const json = JSON.stringify(data);
    let buffer = new ArrayBuffer(json.length * 2); // 2 bytes for each char
    let view = new Uint8Array(buffer);
    const length = json.length;
    for (let i = 0; i < length; i++) {
      view[i] = json.charCodeAt(i);
    }
    return new Message(0, ProcessMessageType.StopProcess, buffer);
  }
}
