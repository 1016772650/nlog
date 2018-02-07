/**
 * Created by vijay on 2018/2/2.
 */

var settings = require('../settings'),
    Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server;

// 连接池
// module.exports = function () {
//     return new Db(settings.db, new Server(settings.host, settings.port), {safe: true, poolSize:1});
// };
module.exports = new Db(settings.db, new Server(settings.host, settings.port), {safe: true});

// var settings = require('../settings');
// var MongoClient = require('mongodb').MongoClient;
// var url = "mongodb://" + settings.host +":" + settings.port +"/" + settings.db;
//
// var Db = null;
//
// MongoClient.connect(url, function (err, db) {
//   if (err) throw err;
//   console.log('数据库已创建');
//   Db = db.db(settings.db);
// });
//
// module.exports = Db;