let http = require('http');
let fs = require('fs');
let path = require('path');
let qs = require('querystring');
var socketio = require('socket.io');

let mimeTypes={
  '.html' : 'text/html',
  '.css' : 'text/css',
  '.js' : 'text/javascript',
  '.jpg' : 'image/jpg',
  '.png' : 'image/png',
  '.mp3' : 'audio/mpeg'
};

http.createServer( (req,res) => {
    let lookup = decodeURI(req.url);
    let param = '';
    // URIから呼び出しファイルパス作成
    console.log(lookup);
    let targetFile = __dirname + lookup;
    if("/" == lookup){
        targetFile = __dirname + "/entrance.html";
    }else if("/room" == lookup && req.method === 'POST'){
        let data = '';
        // readableイベントが発火したらデータにリクエストボディのデータを追加
        req.on('readable', function(chunk){
            data += req.read() || '';
        });
        req.on('end', () => {
            // パースする
            param = qs.parse(data)
            console.log('roomIdは：' + param['roomId'] + '、ユーザ名は：' + param['name']);
        });        
        targetFile = __dirname + "/index.html";
    }else if(lookup.search(/\/room.*/) >= 0 && req.method === 'GET'){     
        console.log("GETきた");
        targetFile = __dirname + "/index.html";
    }else if(lookup.search(/\/static.*/) > 0){
        targetFile = __dirname + "/static" + lookup.match(/\/static(.*)/)[1];
    }
    console.log(targetFile);
    // 基本的なリクエスト処理（エラー処理含む）
    // 渡したパスのファイルを返す
    fs.exists(targetFile, (exists) => {
        if(exists){
            fs.readFile(targetFile, (e, data) => {
                if(e){
                    res.writeHead(500);
                    res.end('Server Error');
                    return;
                }
                let headers = {'Content-Type': mimeTypes[path.extname(targetFile)]};
                res.writeHead(200, headers);
                res.end(data);
            });
            return;
        }
        res.writeHead(404);
        res.end('ページが見つかりません');
    });
}).listen(3000);

