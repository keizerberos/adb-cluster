
const  { Client } 	= require("socket.io");
const SocketIo 		= require("socket.io-client");
const { AdbManager } 	= require("./adb-manager");
const fs = require('fs');

let Log = null;

let config = {
	version : "2.0.0"
}
function setupConfig(){
	const readmeContent = fs.readFileSync(`./README.md`, 'utf8');
	config.readme = readmeContent;
	const lines = readmeContent.split("\n");
	config.version = lines[lines.length-1].split("\t")[0];
	console.log("config.version",config.version);
}
class AdbCluster{
    constructor(Logger){                
        Log = Logger;
				setupConfig();
		const adbManager = new AdbManager(Log);
		Log.i("Trying connect to " + process.env['ADB_SERVER']);
		const devices = [];
      	const io = new SocketIo(process.env['ADB_SERVER'], {
				pingInterval: 155000, 
				pingTimeout: 90500,
				/*maxHttpBufferSize: 2e6,*/
				/*maxHttpBufferSize: 1e8 ,*/
				/*forceNew: true,*/
			});

        io.on("disconnect", (e) => {    
			 Log.i("Disconnected from" + process.env['ADB_SERVER']);
			 Log.o(e);
		});
        io.on("connect", () => {    
            Log.i("Connected to " + process.env['ADB_SERVER']);
			//console.log("connect devices ",devices);
			io.emit("devices",devices);
        });
		io.on('network',async (json)=> {
            Log.i("network");			
			Log.o(json);
			await adbManager.getNet(json.devices);
		});
		io.on('ping',async (json)=> {
            Log.i("ping");			
			Log.o(json);
			await adbManager.getPing(json.devices);
		});
		io.on('resolution',async (json)=> {
            Log.i("resolution");			
			Log.o(json);
			await adbManager.getResolution(json.devices);
		});
		io.on('screen', async (json)=> {
            Log.i("screen");			
			//Log.o(json);			
			await adbManager.updateScreens(json.devices);
		});
		io.on('Screen', async (json)=> {
            Log.i("Screen");			
			//Log.o(json);
			await adbManager.updateScreens(json.devices);
		});
		io.on('screenx',async (json)=> {
            Log.i("screenx");			
			//Log.o(json);
			await adbManager.updateScreens(json.devices);
		});
		io.on('unlock', (json)=> {
            Log.i("unlock");			
			Log.o(json);
			adbManager.updateScreens(json.devices);
		});
		io.on('adb', (json)=> {
            Log.i("adb");
			//console.log("json",json);	
			adbManager.sendAdb(json);
			adbManager.updateScreens(json.devices);
		});
		io.on('Unlock', (json)=> {
            Log.i("Unlock");	
			adbManager.unlockDevice(json.devices);
			adbManager.updateScreens(json.devices);
		});
		io.on('install.keyboard', (json)=> {
            Log.i("install.keyboard");	
			adbManager.installApk(json.devices,__dirname+'/../apks/ADBKeyboard.apk');
		});
		io.on('install.gni', (json)=> {
            Log.i("install.gni");	
			adbManager.installApk(json.devices,__dirname+'/../apks/gnirehtet.apk');
		});
		io.on('tethering.run', (json)=> {
			Log.i("start tethering for " + json.devices);
			adbManager.runTethering(json.devices);
		});
		io.on('tethering.start', (json)=> {
            Log.i("start tethering for " + json.devices);
			adbManager.startTethering(json.devices);
		});
		io.on('tethering.stop', (json)=> {
            Log.i("stop tethering for " + json.devices);	
			adbManager.stopTethering(json.devices);
		});
		io.on('install.wifi', (json)=> {
            Log.i("install.wifi");	
			adbManager.installApk(json.devices,__dirname+'/../apks/adb-join-wifi.apk');
		});
		io.on('install.auth', (json)=> {
			Log.i("install.auth");	
			adbManager.installApk(json.devices,__dirname+'/../apks/kerno.enable.auth.apk');
		});
		io.on('Lock', (json)=> {
            Log.i("Unlock");	
			adbManager.lockDevice(json.devices);
			adbManager.updateScreens(json.devices);
		});
		io.on('stopApk', (json)=> {
            Log.i("stopApk");	
			adbManager.killApk(json);
		});
		io.on('message', (json)=> {
		});
		// CLUSTER COMMANDS
		
		io.on('cluster.commands', (json)=> {
            Log.i("cluster commands");
			//console.log("json",json);	
			if (json.command == "restart.screenserver"){
				adbManager.restartServiceScreen();
			}			
			if (json.command == "restart.adb"){
				adbManager.executeAdb(' kill-server');
				setTimeout(()=>{
					adbManager.executeAdb(' start-server');
				},2000);				
			}			
			if (json.command == "restart.cluster"){
				process.exit();
			}			
		});
		
		io.emit("cluster.version",config.version);
		adbManager.on("device.connect",(deviceAdb)=>{
			io.emit("device.connect",deviceAdb);
			if (devices[deviceAdb.serial]==null)
				devices.push(deviceAdb);
		});
		adbManager.on("device.change",(deviceAdb)=>{
			io.emit("device.change",deviceAdb);
			console.log("device.change",deviceAdb);
			if (devices[deviceAdb.serial]==null)
				devices.push(deviceAdb);
		});
		adbManager.on("capture.prevent",(deviceSerial)=>{
			Log.i("prevent capture from "+deviceSerial);
		});
		adbManager.on("device.disconnect",(deviceAdb)=>{
			io.emit("device.disconnect",deviceAdb);
			const deviceFinded = devices.find(d => d.serial == deviceAdb.serial);
			if (deviceFinded != null)
				devices.splice(devices.indexOf(deviceFinded),1);
		});
		adbManager.on("capture",(id,data)=>{
			Log.i("capture:"+id);			
			//console.log(id, data);			
			io.emit("device.capture",{serial:id,data:data});
		});
		adbManager.on("net",(id,ip,mac,ssid,wifiOn)=>{
			//Log.i("capture:"+id);			
			//console.log(id, data);
			//console.log("net",id,ip,mac,ssid);
			io.emit("device.network",{serial:id,data:{ip:ip,mac:mac,ssid:ssid,wifiOn:wifiOn}});
		});
		adbManager.on("ping",(id,rtt)=>{
			io.emit("device.ping",{serial:id,data:rtt});
		});
		
		adbManager.on("resolution",(id,size,density)=>{
			io.emit("device.resolution",{serial:id,data:{size:size,density:density}});
		});
		adbManager.start();
		
		Log.i("start tethering");
		adbManager.runTethering([]);
    }
}

module.exports = {AdbCluster};