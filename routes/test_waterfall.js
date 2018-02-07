/**
 * Created by vijay on 2018/2/6.
 */

var async = require('async');

async.waterfall([
    function (callback) {
        callback(null, 'one', 'two');
    },
    function (arg1, arg2, callback) {
        console.log('arg1 => ' + arg1);
        console.log('arg2 => ' + arg2);
        callback('error occurred!', 'three');
    },
    function (arg3, callback) {
        console.log('arg3 => ' + arg3);
        callback(null, 'done');
    }
], function (err, result) {
    console.log('err => ' + err);
    console.log('result => ' + result);
});

User.get = function (name, callback) {
    async.waterfall([
        function (cb) {
            mongodb.open(function (err, db) {
                cb(err, db);
            });
        },
        function(db, cb) {
            db.collection("users", function(err, collection) {
                cb(err, collection);
            });
        },
        function(collection, cb) {
            collection.findOne({
                name: name
            }, function (err, user) {
                cb(err, user);
            });
        }
    ], function (err, user) {
        mongodb.close();
        callback(err, user);
    })
};