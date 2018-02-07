var mongodb = require('./db');
var markdown = require('markdown').markdown;

// var Db = require('./db');
// var poolModule = require('generic-pool');
// var pool = poolModule.Pool({
//     name: 'mongoPool',      //连接池的名字
//     create: function (callback) {
//         // 创建一条数据库连接的方法
//         var mongodb = Db();
//         mongodb.open(function (err, db) {
//             callback(err, db);
//         });
//     },
//     destroy: function (mongodb) {
//         // 指明如何销毁连接
//         mongodb.close();
//     },
//     max : 100,      // 连接池中最大连接数
//     min: 5,         // 连接池中最小的连接数
//     idleTimeoutMillis : 30000,      // 指明不活跃连接销毁的毫秒数
//     log: true       // 指明是否打印连接池日志
// });

// 连接池使用
// pool.acquire(function (err, mongodb) {
//    ...
//    pool.release(mongodb);
// });

function Post(name, head, title, tags, post) {
    this.name = name;
    this.title = title;
    this.post = post;
    this.tags = tags;
    this.head = head;
}

module.exports = Post;

Post.prototype.save = function(callback) {
    var date = new Date();
    var time = {
        date: date,
        year : date.getFullYear(),
        month: date.getFullYear() + "-" + (date.getMonth() + 1),
        day: date.getFullYear() + "-" + (date.getMonth() + 1) +"-" + date.getDate(),
        minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" +
        ((date.getMinutes() < 10) ? ('0' + date.getMinutes()) : date.getMinutes()) + ":" + date.getSeconds()
    };
    // 要存入数据库的文档
    var post = {
        name: this.name,
        time: time,
        head: this.head,
        title: this.title,
        tags: this.tags,
        post: this.post,
        comments: [],
        reprint_info: {},
        pv :0
    };

    // 打开数据库
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        // 读取 posts 集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // 将文档插入到 posts 集合
            collection.insert(post, {
                safe: true
            }, function(err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

// 读取文章
Post.get = function(name, page, callback) {
   mongodb.open(function (err, db) {
       if (err) {
           return callback(err);
       }
       db.collection('posts', function(err, collection) {
           if (err) {
               mongodb.close();
               return callback(err);
           }
           var query = {};
           if (name) {
               query.name = name;
           }

           // 使用 count 返回特定查询的文档数 total
           collection.count(query, function (err, total) {
               // 根据 query 对象查询， 并跳过前 (page-1) *5 个结果
               collection.find(query, {
                   skip: (page-1) * 5 ,
                   limit: 5
               }).sort({
                   time: -1
               }).toArray(function (err, docs) {
                   mongodb.close();
                   if (err) {
                       return callback(err);
                   }
                   // 解析 markdown 为 html
                   docs.forEach(function (doc) {
                       doc.post = markdown.toHTML(doc.post);
                   });
                   callback(null, docs, total);
               });
           });
           // collection.find(query).sort({
           //     time : -1
           // }).toArray(function (err, docs) {
           //     mongodb.close();
           //     if (err) {
           //         return callback(err);
           //     }
           //     // console.log('posts.js , docs:' , docs);
           //     docs.forEach(function (doc) {
           //         doc.post = markdown.toHTML(doc.post);
           //     });
           //     callback(null, docs);
           // });
       });
   });
};

Post.getOne = function(name, day, title, callback) {
    mongodb.open(function(err, db) {
        if(err) {
            return callback(err);
        }
        // 读取  posts 集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback('1:' + err);
            }
            // 根据用户名、发表日期及文章名进行查询
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function(err, doc) {
                if (err) {
                    mongodb.close();
                    return callback('2:' + err);
                }
                if (doc) {
                    // 每访问 1 次， pv 值增加 1
                    collection.update({
                        "name": name,
                        "time.day" : day,
                        "title" : title
                    }, {
                        $inc: {"pv" : 1}
                    }, function (err) {
                        mongodb.close();
                        if (err) {
                            return callback('3:' + err);
                        }
                    });
                    doc.post = markdown.toHTML(doc.post);
                    doc.comments.forEach(function (comment) {
                        comment.content = markdown.toHTML(comment.content);
                    });
                }
                callback(null, doc);        // 返回查询的一篇文章
            });
        });
    });
};

// 返回原始发表的内容（markdown 格式）
Post.edit = function (name, day, title, callback) {
    // 打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        // 读取posts集合
        db.collection('posts', function(err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // 根据用户名、发表日期及文章进行查询
            collection.findOne({
                "name" : name,
                "time.day" : day,
                "title" : title
            }, function (err, doc) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                doc.post = markdown.toHTML(doc.post);
                callback(null, doc);
            });
        });
    });
};

Post.update = function(name, day, title, post, callback) {
    // console.log(post);
    // 打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // 更新文章内容
            collection.update({
                "name" : name,
                "time.day" : day,
                "title" : title
            }, {
                $set: {'post': post}
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            })
        })
    })
};

// 删除一篇文章
Post.remove = function (name, day, title, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }

        // 读取posts集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // 查询要删除的文档
            collection.findOne({
                "name" : name,
                "time.day": day,
                "title": title
            }, function (err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                // 如果有 reprint_from，即改文章是转载来的，先保存下来 reprint_from
                var reprint_from = "";
                if (doc.reprint_info.reprint_from) {
                    reprint_from = doc.reprint_info.reprint_from;
                }
                if (reprint_from != "") {
                    // 更新原文章所在文档的 reprint_to
                    collection.update({
                        "name": reprint_from.name,
                        "time.day" : reprint_from.day,
                        "title": reprint_from.title
                    }, {
                        $pull: {
                            "reprint_info.reprint_to" : {
                                "name" : name,
                                "day" : day,
                                "title" : title
                            }
                        }
                    }, function (err)  {
                        if (err) {
                            mongodb.close();
                            return callback(err);
                        }
                    });
                }
            });

            // 根据用户名、日期和标题查找并删除一篇文章
            collection.remove({
                "name" : name,
                "time.day" : day,
                "title" : title
            }, {
                w : 1
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};


// 返回所有文章的存档信息
Post.getArchive = function(callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        // 读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // 返回只包含 name、time、title 属性的文档组成的存档数据
            collection.find({}, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        })
    });
};

// 返回所有标签
Post.getTags = function(callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // distinct 用来找出给定键的所有不同值
            collection.distinct("tags", function (err, docs) {
                // console.log('post.js,getTags,docs:', docs);
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

// 返回含有特定标签的所有文章
Post.getTag = function (tag, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // 查询所有 tags 数组内包含 tag 的文章
            // 并返回只含有 name、time、title组成的数组
            collection.find({
                "tags" : tag
            }, {
                "name" : 1,
                "time" : 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close();
                // console.log('post.js,docs:', docs);
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

// 返回通过标题关键字查询的所有文章信息
Post.search = function (keyword, callback) {
    mongodb.open(function(err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var pattern = new RegExp(keyword, "i");
            collection.find({
                "title" : pattern
            }, {
                "name": 1,
                "time" : 1,
                "title" : 1
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

// 转载一篇文章
Post.reprint = function (reprint_from, reprint_to, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            // 找到被转载的文章的原文档
            collection.findOne({
                "name": reprint_from.name,
                "time.day": reprint_from.day,
                "title": reprint_from.title
            }, function (err, doc) {
                if (err) {
                    mongodb.close();
                    return callback(err);
                }

                var date = new Date();
                var time = {
                    date: date,
                    year: date.getFullYear(),
                    month: date.getFullYear() + "-" + (date.getMonth() + 1),
                    day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
                    minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
                        date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ":" +
                    (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds())
                };

                delete doc._id;     // 注意要删掉原来的 _id

                doc.name = reprint_to.name;
                doc.head = reprint_to.head;
                doc.time = time;
                doc.title = (doc.title.search(/[转载]/) > -1) ? doc.title : "[转载]" + doc.title;
                doc.comments = [];
                doc.reprint_info = {"reprint_from" : reprint_from};
                doc.pv = 0;

                // 更新被转载的原文档的 reprint_info 内的 reprint_to
                collection.update({
                    "name" : reprint_from.name,
                    "time.day" : reprint_from.day,
                    "title": reprint_from.title
                }, {
                    $push: {
                        "reprint_info.reprint_to": {
                            "name" : date.name,
                            "day": time.day,
                            "title": doc.title
                        }
                    }
                }, function (err) {
                    if (err) {
                        mongodb.close();
                        return callback(err);
                    }
                });

                // 将转载生成的副本修改后存入数据库，并返回存储后的文档
                collection.insert(doc, {
                    safe : true
                }, function (err, post) {
                    mongodb.close();
                    if (err) {
                        return callback(err);
                    }

                    // console.log('post.js, reprint, post:', post.ops[0]);
                    callback(err, post.ops[0]);
                });

            });
        });
    });
};
