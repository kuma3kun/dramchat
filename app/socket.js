/**
 * WebSocketサーバ
 * 基本的にここを介してデータをやりとりする
 */

// インポート
const http = require('http');
const socketio = require('socket.io');
const BCDice = require('bcdice-js').BCDice; // CommonJS
const bcdice = new BCDice();

//サーバインスタンス作成
const server = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html'});
    res.end('server connected');
});

const io = socketio.listen(server);

//8888番ポートで起動
server.listen(8888);

// 全部屋情報をルームIDをキーとしてJSON形式で保管
roomStatus = new Map();

//接続確立時の処理
io.sockets.on('connection', function (socket) {
    // 接続ユーザのルームID
    var roomId = '';
    // 接続ユーザ名
    var loginUser = '';

    // 接続の度に発行されるSocketID
    console.log('connected:' + socket.id);

    /**
     * ログ追加
     * サーバ側のroomStatusにログを追加する
     */
    function logWrite(text){
        roomStatus.get(roomId).log.push(text);
    }

    /**
     * 部屋ログイン処理定義
     * @data クライアントからの送信JSONデータ
     */
    socket.on('roomJoin', function(data) {
        console.log("入室処理");
        // console.log(data);
        // console.log(roomStatus);
        // ログインユーザの部屋ID取得
        roomId = data.roomId;
        // ログインユーザ名取得
        loginUser = data.userName;

        // ルーム接続
        socket.join(roomId);

        // 部屋が作成されているか確認。なければ初期値登録。
        if(!roomStatus.has(roomId)){
            roomStatus.set(roomId, {
                log: [] // 表示ログ
                , factors: [ // キャラクター単位　画像データなど保持想定
                    {id: 0, name: "背景", position: 0, images: [], active: ""}
                ]
            });
        }

        // クライアント側初期表示処理
        // ログインクライアントに対して過去履歴送信
        roomStatus.get(roomId).log.forEach(function(d) {
            // console.log(d);
            io.to(socket.id).emit('receirveMessage', {msg: d});
        });
        // 入室アナウンス
        var endMessage = loginUser + "が入室しました。";
        logWrite(endMessage);
        io.to(socket.id).emit('roomJoinResponse', {roomStatus: roomStatus.get(roomId)});
        io.to(roomId).emit('receirveMessage', {msg : endMessage});
    });

    // 「message」という名前で受信したデータはこの中を通る
    socket.on('message', function(data){
        console.log("チャット送信処理:");
        console.log(data);
        var msg = data["name"] + ":" + data["text"];
        logWrite(msg);
        console.log(roomStatus);
        io.to(roomId).emit('receirveMessage', {msg: msg});
    });

    /**
     * 画像追加リクエスト受信処理定義
     * @data リクエストJSON
     * {
     *   roomId : 部屋ID
     *   , userName: 実行ユーザ名
     *   , target: 追加対象ID
     *   , tag: 追加画像名
     *   , image: 追加画像バイナリデータ
     *   , targetName: 追加対象名
     * }
     */
    socket.on('pictureAdd_send', function(data){
        console.log("画像追加リクエスト受信");
        console.log(data);
        let msg = "「" + data.targetName + "」に画像：" + data.tag + "を追加しました。";
        let addData = {tag: data.tag, image: data.image}
        logWrite(msg);
        roomStatus.get(roomId).factors[data.target].images.push(addData);
        console.log(roomStatus);
        io.to(roomId).emit('receirveMessage', {msg: msg});
        io.to(roomId).emit("pictureAdd_receirve", {target: data.target, addData: addData});
    });

    /**
     * ダイスリクエスト受信
     */
    socket.on('dice_send', (data) => {
        console.log(data);

        // ダイスボット種類
        bcdice.setGameByTitle('DiceBot');
        bcdice.setMessage(data.diceNum + "d" + data.diceType);
        console.log(bcdice.dice_command());
        let result = bcdice.dice_command();
        let msg = data.playName + ":" + result[0];

        io.to(roomId).emit('receirveMessage', {msg: msg});
    })

    /**
     * 発言リクエスト受信
     */
    socket.on('say_send', (data) => {
        console.log("発言リクエスト");
        console.log(data);
        logWrite(data.msg);
        console.log(roomStatus);
        io.to(roomId).emit('say_receirve', {name: data.name, msg: data.msg});
    });

    /**
     * キャラ作成リクエスト受信
     */
    socket.on('characterCreate_send', (data) => {
        console.log("発言リクエスト");
        console.log(data);
        let msg = "「" + data.name + "」を作成しました。";
        let no = roomStatus.get(roomId).factors.length;
        let fact = {id: no, name: data.name, position: data.position, images: [], active: ""};

        logWrite(data.msg);
        roomStatus.get(roomId).factors.push(fact);
        console.log(roomStatus);
        io.to(roomId).emit('receirveMessage', {msg: msg});
        io.to(roomId).emit('characterCreate_receirve', fact);
    });
});