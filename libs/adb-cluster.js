
const  { Client } 	= require("socket.io");
const SocketIo 		= require("socket.io-client");
const { AdbManager } 	= require("./adb-manager");

let Log = null;

class AdbCluster{
    constructor(Logger){                
        Log = Logger;
		const adbManager = new AdbManager(Log);
		Log.i("Trying connect to " + process.env['ADB_SERVER']);
		const devices = [];
      	const io = new SocketIo(process.env['ADB_SERVER'], {
				reconnection: true,
				reconnectionDelay: 10000,
			});

        io.on("connect", () => {    
            Log.i("Connected to " + process.env['ADB_SERVER']);
			console.log("connect devices ",devices);
			io.emit("devices",devices);
        });
		io.on('screen', (json)=> {
            Log.i("screen");			
			Log.o(json);
			adbManager.updateScreens(json.devices);
		});
		io.on('unlock', (json)=> {
            Log.i("unlock");			
			Log.o(json);
			adbManager.updateScreens(json.devices);
		});
		io.on('adb', (json)=> {
            Log.i("adb");	
			adbManager.sendAdb(json);
		});
		io.on('stopApk', (json)=> {
            Log.i("killApk");	
			adbManager.killApk(json);
		});
		io.on('Unlock', (json)=> {
            Log.i("Unlock");	
			adbManager.unlockDevice(json);
		});
		io.on('Lock', (json)=> {
            Log.i("Unlock");	
			adbManager.lockDevice(json);
		});
		io.on('message', (json)=> {
			/*try {
				let json = JSON.parse(data);
				let params = { "screen_path": __dirname + "\\public2\\screens"	};
				if (json.data != null)
					Object.keys(json.data).forEach(k => {
						json.data[k] = replaceParams(params, json.data[k]);
					})
				if (json.action == "Screenx") 
					updateScreens(json.devices);
				else if (json.action == "Unlock") 
					unlockDevice(json.devices);
				else if (json.action == "CaptureOn") 
					unlockDevice(json.devices);
				else if (json.action == "Lock") 
					lockDevice(json.devices);
				else if (json.action == "list")
					listAdb(json, ws);
				else if (json.action == "adb")
					sendAdb(json);
				else if (json.action == "stopApk")
					killApk(json);

				updateScreens(json.devices);
				return;
			} catch (e) {
			}*/
		});
		/*adbManager.on("devices",(devicesAdb)=>{
			devicesAdb.forEach(device => {
				let findDevice = devices.find(d=>d.serial == devicesAdb.serial)
				if(findDevice == null) devices.push(device);
			});
			Log.i("devices:");
			Log.o(devices);
			io.emit("devices",devices);
		});*/
		adbManager.on("device.connect",(deviceAdb)=>{
			io.emit("device.connect",deviceAdb);
			if (devices[deviceAdb.serial]==null)
				devices.push(deviceAdb);
		});
		adbManager.on("device.disconnect",(deviceAdb)=>{
			io.emit("device.disconnect",deviceAdb);
			const deviceFinded = devices.find(d => d.serial == deviceAdb.serial);
			if (deviceFinded != null)
				devices.splice(devices.indexOf(deviceFinded),1);
		});
		adbManager.on("capture",(id,data)=>{
			Log.i("capture:"+id);			
			//console.log(id,data);
			io.emit("device.capture",{serial:id,data:data});
		});
		adbManager.start();
    }
}

module.exports = {AdbCluster};