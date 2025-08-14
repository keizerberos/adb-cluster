
const spawn = require('child_process').spawn;
const spawnSync = require('child_process').spawn;
const { exec, execFile } = require(`child_process`);
const crypto = require('crypto');
const _timeout = 5000;

let _adbProcess = [];
function generateUniqueId(str) {
    const hash = crypto.createHash('sha256'); // Ysou can choose a different hash algorithm if needed
    hash.update(str);
    return hash.digest('hex');
}
const _autoKill = id => {
    if (_adbProcess[id].loop) clearTimeout(_adbProcess[id].loop);
    _adbProcess[id].loop = setTimeout(() => {
        _adbProcess[id].kill();
    }, _timeout);
}
const _startGni = (command, baypass) => {
     console.log("command",command);
    return new Promise(async (resolve) => {
        const id = generateUniqueId(command.toString());
        //let process = null; 
        return new Promise(async (resolve) => {
            let outputChunks = [];
            let outputLength = 0;
            _adbProcess[id] = spawn(__dirname+'\\bin\\gnirehtet.exe', command, { shell: false, });
            _adbProcess[id].stdout.on("data", function (chunk) {
                console.log(outputChunks.toString());
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

const prod = _startGni(['run','NBA34BOAC5044953']);