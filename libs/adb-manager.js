const {_adbb,_startGni,_stopGni,_runGni,generateUniqueId,launchCommandx,adbCommand,adbCommandBuffer,launchCommandBuffer,launchServiceCommand,_autoKill} = require('./adb');
const path = require('path');
let Log = null;
let lastDevices = -1;
let records = {};

class AdbManager {
	constructor(Logger) {
		Log = Logger;
		const events = {
			devices:[],
			"capture.prevent":[],
			"device.connect":[],
			"device.disconnect":[],
			"device.change":[],			
			capture:[],
			resolution:[],
			net:[],
			'ping':[],
		};
		this.events = events;
		this.devices = [];
	}
	
	async sendAdb(data) {
		const outputScreen = await launchCommandx('-s ' + data.devices + ' shell ' + data.data.command);
		}
	
	async executeAdb(command) {
		const outputScreen = await launchCommandx(command);
		}
	async killApk(data) {
		//console.log("killApk adb command",'-s '+data.devices+' shell am force-stop ' + data.data.apk );
		const outputScreen = await launchCommandx('-s ' + data.devices + ' shell am force-stop ' + data.data.apk)
	}
	async installApk(id,path) {
		return new Promise(async (resolve) => {
			console.log("installApk",path);
			let outputScreen = await launchCommandx(`-s ${id} install ${path}`);
			resolve();
		});
	}
	async unlockDevice(id) {
		return new Promise(async (resolve) => {
			let outputScreen = await launchCommandx(`-s ${id} shell input keyevent 82`);
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
	async getResolution(id) {
		const self = this;
		const events = this.events;		
		const devices = this.devices;
		const outputScreenSize = await launchCommandx(`-s ${id} shell "wm size | grep -o '[0-9].*'"`);
		let size = await outputScreenSize.message;
		const outputScreenDens = await launchCommandx(`-s ${id} shell "wm density"`);
		let density = await outputScreenDens.message;
		
		await events['resolution'].forEach(async fn => await fn(id,size,density));
	}

	async getNet(id) {
		const self = this;
		const events = this.events;		
		const devices = this.devices;
		const outputScreen = await launchCommandx(`-s ${id} shell "ip addr show wlan0 | grep 'inet ' | cut -d' ' -f6"`);
		let ip = await outputScreen.message;
		const outputScreenMac = await launchCommandx(`-s ${id} shell "ip addr show wlan0 | grep 'link/ether' | cut -d' ' -f6"`);
		let mac = await outputScreenMac.message;
		const re = /(?<=(wifiNetworkKey|networkId)=\").[a-zA-Z0-9 -._]{1,16}(?=\")/g;
		//const outputScreenSsid = await launchCommandx(`-s ${id} shell "dumpsys netstats | grep ' ratType=COMBINED, wifiNetworkKey*'"`);
		const outputScreenSsid = await launchCommandx(`-s ${id} shell "dumpsys netstats | grep 'iface='"`);
		let ssid = await outputScreenSsid.message.match(re)?.find((r,i)=>(i==0));		
		const outputScreenWifiOn = await launchCommandx(`-s ${id} shell settings get global wifi_on`);
		let wifiOn = await outputScreenWifiOn.message;		

		await events['net'].forEach(async fn => await fn(id,ip,mac,ssid,wifiOn=="1"));
	}

	async getPing(id) {
		const self = this;
		const events = this.events;		
		const devices = this.devices;
		const outputScreen = await launchCommandx(`-s ${id} shell ping -c 3 8.8.8.8`);
		let results = await outputScreen.message;
		const re = /(?<=rtt\ min\/avg\/max\/mdev\ \= ).*/g;
		console.log("getping results:", results);
		const match = results.match(re);
		console.log("getping match:", match);
		let rtt = {min:-1,avg:-1,max:-1};
		if (match != null){			
			if (match.length>0){			
				const rtt_vect = match[0].split("/");
				console.log("rtt_vect:",rtt_vect);
				if (rtt_vect.length == 4){
					rtt = {min:parseFloat(rtt_vect[0]),avg:parseFloat(rtt_vect[1]),max:parseFloat(rtt_vect[2])};
				}
			}
		}
		console.log("getping rtt", rtt);
		await events['ping'].forEach(async fn => await fn(id,rtt));
	}
	async watchDevices() {
		const self = this;
		const events = this.events;		
		const devices = this.devices;
		const outputScreen = await launchCommandx('devices');
		
		let devicesAdb = outputScreen.message.split("\n").filter(d => !d.includes("List of")).map(d => { return { model: 'ZTE', onlySerial: d.split('\t')[0], serial: d.split('\t')[0], status:d.split('\t')[1].trim() } });
		devicesAdb = devicesAdb.filter(d=>d.serial!='');
//			devicesAdb = devicesAdb.sort((a, b) => (a.number != undefined ? a.number : 0) - (b.number != undefined ? b.number : 0));
		let dataSend = {
			code: 10000,
			message: "SUCCESS",
			data: devicesAdb
		};
		/* CHECK CHANGES */
		
			const currentDevices = self.devices;
			const newDevices = devicesAdb;
			const changedDevices = [];
			currentDevices.forEach(device=>{
				const deviceCurrent = devicesAdb.find(dd=>dd.serial == device.serial);
				if (deviceCurrent!=null){
					deviceCurrent.status = deviceCurrent.status.trim();
					if (deviceCurrent.status != device.status) {
						device.status = deviceCurrent.status;
						
						changedDevices.push(deviceCurrent);						
					}
				}
			});
			
			
			for (let i = 0; i< changedDevices.length;i++){
				const device = changedDevices[i];
				await self.getInfo(device);
			};
			for (let i = 0; i< changedDevices.length;i++){
				const device = changedDevices[i];
				await self.installApks(device);
			};
			for (let i = 0; i< changedDevices.length;i++){
				const device = changedDevices[i];
				await self.setupDevice(device);
			};
			if (changedDevices.length>0)
				changedDevices.forEach(d=>events['device.change'].forEach(fn => fn(d)));
		
		if (self.devices.length != devicesAdb.length) {
			const outDevices = [];
			const inDevices = [];
			
			self.devices.forEach(d=> {
				const deviceIn = devicesAdb.find(dd=>dd.serial == d.serial);
				if ( deviceIn == null ) outDevices.push(d);
			});
			devicesAdb.forEach(d=> {
				const deviceIn = self.devices.find(dd=>dd.serial == d.serial);
				if ( deviceIn == null ) inDevices.push(d);
			});
			//if (lastDevices != devicesAdb.length)

			events['devices'].forEach(fn => fn(devicesAdb));
				//wsClients.forEach((ws) => ws.send(JSON.stringify(dataSend)));
			//lastDevices = devicesAdb.length;

			for (let i = 0; i< inDevices.length;i++){
				const device = inDevices[i];
				await self.getInfo(device);
			};
			for (let i = 0; i< inDevices.length;i++){
				const device = inDevices[i];
				await self.installApks(device);
			};
			for (let i = 0; i< inDevices.length;i++){
				const device = inDevices[i];
				await self.setupDevice(device);
			};
			
			if (inDevices.length>0)
				inDevices.forEach(d=>events['device.connect'].forEach(fn => fn(d)));
				
			if (outDevices.length>0)
				outDevices.forEach(d=>events['device.disconnect'].forEach(fn => fn(d)));
			self.devices = await devicesAdb;
			console.log("inDevices",inDevices);
			console.log("outDevices",outDevices);
		}
		setTimeout(async () => {
			await self.watchDevices()
		}, 14000);
	}
	async getInfo(device){		
		if (device.status!='device') return device;
		return new Promise(async (res,rej)=>{
			const outputSize = await launchCommandx(`-s ${device.serial} shell "wm size | grep -o '[0-9].*'"`);
			device['wmsize'] = await outputSize.message;		
			device['wmsize'] = device['wmsize'].split("\r\n");
			
			device['density'] = await(await launchCommandx(`-s ${device.serial} shell "wm density"`)).message;
			device['density'] = device['density'].split("\r\n");

			device['wifi'] = await(await launchCommandx(`-s ${device.serial} shell settings get global wifi_on`)).message;
			device['wifi'] = device['wifi']=="1";

			device['mobile'] = await(await launchCommandx(`-s ${device.serial} shell settings get global mobile_data`)).message;
			device['mobile'] = device['mobile']=="1";

			device['flashlight'] = await(await launchCommandx(`-s ${device.serial} shell settings get global flashlight_enabled`)).message;
			device['flashlight'] = device['flashlight']=="1";
			
			device['brightness'] = await(await launchCommandx(`-s ${device.serial} shell settings get system screen_brightness`)).message;
			device['brightnessMode'] = await(await launchCommandx(`-s ${device.serial} shell settings get system screen_brightness_mode`)).message;

			
			device['brand'] = await(await launchCommandx(`-s ${device.serial} shell getprop ro.product.brand`)).message;
			device['model'] = await(await launchCommandx(`-s ${device.serial} shell getprop ro.product.model`)).message;
			device['manufacturer'] = await(await launchCommandx(`-s ${device.serial} shell getprop ro.product.manufacturer`)).message;


			device['ip'] = await(await launchCommandx(`-s ${device.serial} shell "ip addr show wlan0 | grep 'inet ' | cut -d' ' -f6"`)).message;

			const re = /(?<=(wifiNetworkKey|networkId)=\").[a-zA-Z0-9 -._]{1,16}(?=\")/g;
			device['mac'] = await(await launchCommandx(`-s ${device.serial} shell "ip addr show wlan0 | grep 'link/ether' | cut -d' ' -f6"`)).message;
			device['ssid'] = await(await launchCommandx(`-s ${device.serial} shell "dumpsys netstats | grep 'iface='"`)).message;
			device['ssid'] = device['ssid'].match(re)?.find((r,i)=>(i==0));
			
			device['apkFb'] = await(await launchCommandx(`-s ${device.serial} shell pm list packages com.facebook.lite`)).message;
			device['apkFb'] = device['apkFb']!="";
			device['apkTk'] = await(await launchCommandx(`-s ${device.serial} shell pm list packages com.zhiliaoapp.musically`)).message;
			device['apkTk'] = device['apkTk']!="";
			device['apkJoin'] = await(await launchCommandx(`-s ${device.serial} shell pm list packages com.steinwurf.adbjoinwifi`)).message;
			device['apkJoin'] = device['apkJoin']!="";
			device['apkKey'] = await(await launchCommandx(`-s ${device.serial} shell pm list packages com.android.adbkeyboard`)).message;
			device['apkKey'] = device['apkKey']!="";
			device['apkTet'] = await(await launchCommandx(`-s ${device.serial} shell pm list packages com.genymobile.gnirehtet`)).message;
			device['apkTet'] = device['apkTet']!="";
			device['apkAut'] = await(await launchCommandx(`-s ${device.serial} shell pm list packages com.antrax.enableauth`)).message;
			device['apkAut'] = device['apkAut']!="";
			device['brightness'] = await(await launchCommandx(`-s ${device.serial} shell settings get system screen_brightness`)).message;
			device['brightnessMode'] = await(await launchCommandx(`-s ${device.serial} shell settings get system screen_brightness_mode`)).message;
			
			
			res(await device);
		});		
	}
	async installApks(device){		
			if (device.status!='device') return device;
		return new Promise(async (res,rej)=>{
			if ( !device['apkFb'] ){ 
				console.log("installing apkFb on " + device.serial);
				device['apkFb'] = await(await launchCommandx(`-s ${device.serial} install ${path.join(__dirname,'..','apks','fblite.apk')}`)).message!="";}
			if ( !device['apkJoin'] ) { 
				console.log("installing apkJoin on " + device.serial);
				device['apkJoin'] = await(await launchCommandx(`-s ${device.serial} install ${path.join(__dirname,'..','apks','adb-join-wifi.apk')}`)).message!="";}
			if ( !device['apkKey'] ) {
				console.log("installing apkKey on " + device.serial);
				device['apkKey'] = await(await launchCommandx(`-s ${device.serial} install ${path.join(__dirname,'..','apks','ADBKeyboard.apk')}`)).message!="";
			}
			if ( !device['apkTet'] ) { 
				console.log("installing apkTet on " + device.serial);
				device['apkTet'] = await(await launchCommandx(`-s ${device.serial} install ${path.join(__dirname,'..','apks','gnirehtet.apk')}`)).message!="";}
			if ( !device['apkAut'] ) {
				console.log("installing apkAut on " + device.serial);
				device['apkAut'] = await(await launchCommandx(`-s ${device.serial} install ${path.join(__dirname,'..','apks','kerno.enableauth.apk')}`)).message!="";
				await(await launchCommandx(`-s ${device.serial} shell am start -n com.antrax.enableauth/.MainActivity`)).message;
			}
			res(await device);
		});
	}
	async setupDevice(device){				
		if (device.status!='device') return device;
		return new Promise(async (res,rej)=>{
			await(await launchCommandx(`-s ${device.serial} uninstall com.facebook.katana`)).message;
			await(await launchCommandx(`-s ${device.serial} shell locksettings set-disabled true`)).message;
			await(await launchCommandx(`-s ${device.serial} shell settings put system screen_off_timeout 2147483647`)).message;
		//	await(await launchCommandx(`-s ${device.serial} shell "input keyevent 25 && input keyevent 25 && input keyevent 25 && input keyevent 25 && input keyevent 25 & input keyevent 25"`)).message;
			await(await launchCommandx(`-s ${device.serial} shell "media volume --stream 4 --set 1 && media volume --stream 3 --set 0 && media volume --stream 2 --set 0 && media volume --stream 1 --set 0 && media volume --set 0"`)).message;
			

			if (parseInt(device.brightnessMode)!=0)  await(await launchCommandx(`-s ${device.serial} shell settings put system screen_brightness_mode 0`)).message;
			await(await launchCommandx(`-s ${device.serial} shell settings put system screen_brightness 1`)).message;
			//if (parseInt(device.brightness)>1)  await(await launchCommandx(`-s ${device.serial} shell "input keyevent 220 && input keyevent 220 && input keyevent 220 && input keyevent 220 && input keyevent 220 && input keyevent 220 && input keyevent 220 && input keyevent 220 && input keyevent 220 && input keyevent 220"`)).message;
			await(await launchCommandx(`-s ${device.serial} shell svc power stayon usb`)).message;

			await(await launchCommandx(`-s ${device.serial} shell ime enable com.android.adbkeyboard/.AdbIME`)).message;
			await(await launchCommandx(`-s ${device.serial} shell ime set com.android.adbkeyboard/.AdbIME`)).message;
			await(await launchCommandx(`-s ${device.serial} shell wm size 720x1612`)).message;
			await(await launchCommandx(`-s ${device.serial} shell wm density 320`)).message;
			
			res(device)
		});
	}
	async start(){		
		await this.watchDevices();
	}
	async recImage(id,cbSucess,cbFail) {
		const self = this;
		const outputScreen = await launchCommandBuffer('-s ' + id + ' exec-out screencap -p')
		if (cbSucess!=null) cbSucess();
		self.events["capture"].forEach(async fn => {
			fn(id, outputScreen.message);
		});
	}
	async startTethering(id) { 
		_startGni(['start',id]);
	}
	async runTethering(id) { 
		_runGni(['relay']);
	}
	async stopTethering(id) { 
		_stopGni(['stop',id]);
	}

	async updateScreens(id) { 
		const self = this;
		if (records[id] == undefined){
			records[id] = {id:id};
			this.recImage(id,()=>{
				records[id] = null;
			});
		}else {			
			self.events["capture.prevent"].forEach(async fn => {
				fn(id);
			});
			return;
		}
	}
	async restartServiceScreen(){
		const self = this;
		const outputScreen = await launchServiceCommand('restart node-adb-screenserver.service')
		//if (cbSucess!=null) cbSucess();
		/*self.events["capture"].forEach(async fn => {
			fn(id, outputScreen.message);
		});*/
	}

	on(event,fn){
		this.events[event].push(fn);
	}
}
module.exports = { AdbManager };