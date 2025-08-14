
const spawn = require('child_process').spawn;
const spawnSync = require('child_process').spawn;
const { exec, execFile } = require(`child_process`);
const crypto = require('crypto');

let _adbProcess = [];
let _adbpath = "adb";
const _timeout = 5000;
function replaceParams(params, str) {
    Object.keys(params).forEach(k => {
        str = str.replace("{" + k + "}", params[k])
    });
    return str;
}
function generateUniqueId(str) {
    const hash = crypto.createHash('sha256'); // Ysou can choose a different hash algorithm if needed
    hash.update(str);
    return hash.digest('hex');
}
const _adb = (command, baypass) => {
    const id = generateUniqueId(command.toString());
    // console.log("command",command);
    return new Promise(async (resolve) => {
        _adbProcess[id] = execFile(_adbpath, command, (error, stdout, stderr) => {
            let message = error ? stderr.trim() : stdout.trim();
            let result = error ? false : true;
            let useErrorMessage = false;
            //  console.log("adb error:",error);
            // console.log(message);
            resolve({ result, message: result ? message : "" });
        }, {
            windowsHide: true,
            shell: true
        });

        // Kill process when timeout
        _autoKill(id);
    });
}
const _adbb = (command,) => {
    const id = generateUniqueId(command.toString());
    //let process = null; 
    return new Promise(async (resolve) => {
        let outputChunks = [];
        let outputLength = 0;
        _adbProcess[id] = spawn(_adbpath, command, { shell: true, });
        _adbProcess[id].stdout.on("data", function (chunk) {
            outputChunks.push(chunk);
            outputLength += chunk.length;
        });
        _adbProcess[id].stdout.on('end', () => {
            const output = Buffer.concat(outputChunks, outputLength);
            let result = true;
            resolve({ result, message: output });
        });
        _autoKill(id);
    });
}
let launchCommandx = async param => {
    let output = { result: false, message: `` };
    output = await adbCommand(`${param}`);
    return output;
}
let adbCommand = async function () {
    let params = "";
    const baypass = arguments[arguments.length - 1] === true ? true : false;
    const length = baypass ? arguments.length - 1 : arguments.length;
    for (let i = 0; i < length; i++) params += (arguments[i] + (i == length - 1 ? `` : ` && `));

    let strComma = params.match(/(?<=\")[a-zA-Z ].*(?=\")/gi);
    let strComma2 = params.match(/(?<=\')[a-zA-Z ].*(?=\')/gi);
    //let strComma2 = params.match(/(?<=\")[a-zA-Z ].*(?=\")/gi);
    //console.log("strComma",strComma);
    params = params.replaceAll('"', "");
    //params = params.replaceAll("'","");
    if (strComma != null)
        strComma.forEach(s => {
            let a = s.replaceAll(" ", "__");
            params = params.replaceAll(s, a);
        });
    if (strComma2 != null)
        strComma2.forEach(s => {
            let a = s.replaceAll(" ", "__");
            params = params.replaceAll(s, a);
        });
    let xparams = params.split(" ");
    xparams.forEach((s, i) => {
        xparams[i] = s.replaceAll("__", " ");
    });
    //console.log("xparams",xparams);
    const output = await _adb(xparams, true);
    return arguments ? output : { result: false, message: '' };
}
let adbCommandBuffer = async function () {
    let params = "";
    const baypass = arguments[arguments.length - 1] === true ? true : false;
    const length = baypass ? arguments.length - 1 : arguments.length;
    for (let i = 0; i < length; i++) params += (arguments[i] + (i == length - 1 ? `` : ` && `));
    //const output = await _adb([`-s`, `${_ip}`].concat(params.split(" ")), baypass);
    const output = await _adbb(params.split(" "), true);
    return arguments ? output : { result: false, message: '' };
}
let launchCommandBuffer = async (param) => {
    let output = { result: false, message: `` };
    output = await adbCommandBuffer(`${param}`);
    return output;
}
const _autoKill = id => {
    if (_adbProcess[id].loop) clearTimeout(_adbProcess[id].loop);
    _adbProcess[id].loop = setTimeout(() => {
        _adbProcess[id].kill();
    }, _timeout);
}
const _startGni = (command, baypass) => {
     
    return new Promise(async (resolve) => {
        const id = generateUniqueId(command.toString());
        //let process = null; 
        return new Promise(async (resolve) => {
            let outputChunks = [];
            let outputLength = 0;
            _adbProcess[id] = spawn(__dirname+'\\..\\bin\\gnirehtet.exe', command, { shell: false, });
            _adbProcess[id].stdout.on("data", function (chunk) {
               // console.log(outputChunks.toString());
                outputChunks.push(chunk);
                outputLength += chunk.length;
            });
            _adbProcess[id].stdout.on('end', () => {
                const output = Buffer.concat(outputChunks, outputLength);
                let result = true;
                resolve({ result, message: output });
            });
            //_autoKill(id);
        });
    });
};
module.exports = {_adbb,_startGni,generateUniqueId,launchCommandx,adbCommand,adbCommandBuffer,launchCommandBuffer,_autoKill}