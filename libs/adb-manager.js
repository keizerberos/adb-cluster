const {_adbb,launchCommandx,adbCommand,adbCommandBuffer,launchCommandBuffer,_autoKill} = require('./adb');
let Log = null;
let lastDevices = -1;

class AdbManager {
	constructor(Logger) {
		Log = Logger;
		const events = {
			devices:[],
			"device.connect":[],
			"device.disconnect":[],
			capture:[],
		};
		this.events = events;
		this.devices = [];
	}
	
	async sendAdb(data) {
		const outputScreen = await launchCommandx('-s ' + data.devices + ' shell ' + data.data.command);
		}
		
	unlockDevice(id) {
		return new Promise(async (resolve) => {
			//console.log('-s '+id+' exec-out screencap -p');
			const outputScreen = await launchCommandx(`-s ${id} shell input keyevent 82`);
			setTimeout(async () => {
				outputScreen = await launchCommandx(`-s ${id} shell input swipe 300 1600 300 50 100`);
				outputScreen = await launchCommandx(`-s ${id} shell input swipe 300 806 300 806 20`);
				outputScreen = await launchCommandx(`-s ${id} shell input swipe 300 806 300 806 20`)
				setTimeout(async () => {
					outputScreen = await launchCommandx(`-s ${id} shell input tap 392 83`)
				}, 2000);
			}, 2000);

			resolve();
		});
	}
	lockDevice(id) {
		return new Promise(async (resolve) => {
			const outputScreen = await launchCommandx(`-s ${id} shell input keyevent 26`);
			resolve();
		});
	}
	async watchDevices() {
		const self = this;
		const events = this.events;		
		const devices = this.devices;
		const outputScreen = await launchCommandx('devices');
		let devicesAdb = outputScreen.message.split("\r\n").filter(d => !d.includes("List of")).map(d => { return { model: 'ZTE', onlySerial: d.split('\t')[0], serial: d.split('\t')[0]} });
		devicesAdb = devicesAdb.filter(d=>d.serial!='');
//			devicesAdb = devicesAdb.sort((a, b) => (a.number != undefined ? a.number : 0) - (b.number != undefined ? b.number : 0));
		let dataSend = {
			code: 10000,
			message: "SUCCESS",
			data: devicesAdb
		};
		if (self.devices.length != devicesAdb.length) {
			let outDevices = [];
			let inDevices = [];
			
			self.devices.forEach(d=> {
				const deviceIn = devicesAdb.find(dd=>dd.serial == d.serial);
				if ( deviceIn == null ) outDevices.push(d);
			});
			devicesAdb.forEach(d=> {
				const deviceIn = self.devices.find(dd=>dd.serial == d.serial);
				if ( deviceIn == null ) inDevices.push(d);
			});
			console.log("inDevices",inDevices);
			console.log("outDevices",outDevices);
			//if (lastDevices != devicesAdb.length)
			if (inDevices.length>0)
				inDevices.forEach(d=>events['device.connect'].forEach(fn => fn(d)));
				
			if (outDevices.length>0)
				outDevices.forEach(d=>events['device.disconnect'].forEach(fn => fn(d)));

			events['devices'].forEach(fn => fn(devicesAdb));
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
		const self = this;
		return new Promise(async (resolve) => {
			console.log("recimage ",id);
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