
const express       = require("express");
const cors          = require("cors");
const compression = require('compression');

let Log;
class FastServer extends express{
    constructor(Log, port, publicFolder = "public"){		          
        Log = Log;
        super();
        this.port = port;
        //this.app = express();
        this.publicFolder = publicFolder;
        Log.i("publicFolder : " + this.publicFolder);                

        var corsOptions = {
            origin: '*',
            optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
          }

        this.use(compression());
        this.use(cors(corsOptions));
        //this.use(bodyParser.json());
        //this.use(bodyParser.text({ limit: '25mb' }));
        this.use(express.json({limit: '25mb'}));
        this.use(express.text({limit: '25mb'}));
        //this.use(express.urlencoded({limit: '25mb'}));
        this.use(express.urlencoded({ extended: true,parameterLimit: 100000, limit: '50mb' }));
        this.use("/", express.static(this.publicFolder));
    }
    iniciar = function(){
        this.listen(this.port, () => {  
            console.log(`Servidor iniciado en puerto ${this.port}`);
        });  
    }
    agregarRuta = function(objRuta){
        if (objRuta.method == 'GET'){
            this.app.get(objRuta.route, (req,res)=>{ objRuta.action(req,res)})
        }
        if (objRuta.method == 'POST'){
            this.app.post(objRuta.route, (req,res)=>{ objRuta.action(req,res)})
        }
        if (objRuta.method == 'DEL'){
            this.app.delete(objRuta.route, (req,res)=>{ objRuta.action(req,res)})
        }
        if (objRuta.method == 'PUT'){
            this.app.put(objRuta.route, (req,res)=>{ objRuta.action(req,res)})
        }
    }
}
module.exports = {FastServer};