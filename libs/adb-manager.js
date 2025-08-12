const {_adbb,launchCommandx,adbCommand,adbCommandBuffer,launchCommandBuffer,_autoKill} = require('./adb');
let Log = null;
let lastDevices = -1;

class AdbManager {
	constructor(Logger) {
		Log = Logger;
		const events = {
			devices:[],
			capture:[],
		};
		this.events = events;
		this.devices = [];
	}
	
	async sendAdb(data) {
		const outputScreen = await launchCommandx('-s ' + data.devices + ' shell ' + data.data.command);
	}
	async watchDevices() {
		const self = this;
		const events = this.events;		
		const devices = this.devices;
		const outputScreen = await launchCommandx('devices');
		let devicesAdb = outputScreen.message.split("\r\n").filter(d => !d.includes("List of")).map(d => { return { model: 'ZTE', onlySerial: d.split('\t')[0], serial: d.split('\t')[0]} });
//			devicesAdb = devicesAdb.sort((a, b) => (a.number != undefined ? a.number : 0) - (b.number != undefined ? b.number : 0));
		let dataSend = {
			code: 10000,
			message: "SUCCESS",
			data: devicesAdb
		};
		if (self.devices.length != devicesAdb.length) {
			//if (lastDevices != devicesAdb.length)
				events['devices'].forEach(fn => fn(JSON.stringify(devicesAdb)));
				//wsClients.forEach((ws) => ws.send(JSON.stringify(dataSend)));
			self.devices = devicesAdb;
			//lastDevices = devicesAdb.length;
		}
		setTimeout(async () => {
			await self.watchDevices()
		}, 14000);
	}
	start(){		
		this.watchDevices();
	}
	async recImage(id) {
		return new Promise(async (resolve) => {
			const outputScreen = await launchCommandBuffer('-s ' + id + ' exec-out screencap -p')
			self.events["capture"].forEach(async fn => {
				fn(id, outputScreen.message);
			});
			resolve();
		});
	}

	async updateScreens(id) { 
		await this.recImage(id);
	}

	on(event,fn){
		this.events[event].push(fn);
	}
}
module.exports = { AdbManager };