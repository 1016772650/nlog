var express = require('express');
var multer = require('multer');
var crypto = require('crypto'),
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Comment = require('../models/comment.js'),
    markdown = require('markdown').markdown;

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });
//
// module.exports = router;

function checkLogin(req, res, next) {
  // console.log(req.params);
  if (!req.session.user) {
    req.flash('error', '未登录');
    res.redirect('/login');
  }
  next();
}

function checkNotLogin(req, res, next) {
  if (req.session.user) {
    req.flash('error', '已登录');
    res.redirect('back');   // 返回之前的页面
  }
  next();
}





module.exports = function (app) {
  app.get('/', function (req,res) {
      // 判断是否是第一页，并把请求的页数转换为 number 类型
      var page = req.query.p ? parseInt(req.query.p) : 1;
      // 查询并返回第 page 页的 5 篇文章
      Post.get(null, page, function (err, posts, total) {
        if (err) {
          // console.log('index / err:', err);
          posts = [];
        }
        res.render('index', {
            title: '主页',
            user: req.session.user,
            page: page,
            isFirstPage: (page - 1) == 0,
            isLastPage: ((page-1) * 5 + posts.length) == total,
            success: req.flash('success').toString(),
            error: req.flash('error').toString(),
            posts: posts
        });
    });
  });



  app.get('/reg', checkNotLogin);
  app.get('/reg', function (req, res) {
    res.render('reg', {
      title: '注册',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/reg', checkNotLogin);
  app.post('/reg', function (req, res) {
    var name = req.body.name,
        password = req.body.password,
        password_re = req.body['password-repeat'];
    // 检查用户两次输入的密码是否一致
      if (password_re != password) {
        req.flash('error', '两次输入的密码不一致！');
        return res.redirect('/reg');  // 返回注册页
      }
      // 生成密码的md5值
      var md5 = crypto.createHash('md5'),
          password = md5.update(req.body.password).digest('hex');
      var newUser = new User({
        name: name,
        password: password,
        email: req.body.email
      });
      // 检查用户是否已经存在
      User.get(newUser.name, function (err, user) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/');
        }
        if (user) {
          req.flash('error', '用户已存在');
          return res.redirect('/reg');
        }
        // 如果用户不存在则新增用户
          newUser.save(function(err, user) {
            if (err) {
              req.flash('error', err);
              return res.redirect('/reg');
            }
            req.session.user = user;
            // console.log( 'reg,req.session:', req.session);
            // console.log( 'reg,req.user:', user);
            req.flash('success', '注册成功');
            res.redirect('/');
          })
      })
  });

  app.get('/login', checkNotLogin);
  app.get('/login', function (req, res) {
    res.render('login', {
      title : '登录',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/login', checkNotLogin);
  app.post('/login', function (req, res) {
    // 生成密码的 MD5 值
      var md5 = crypto.createHash('md5'),
          password = md5.update(req.body.password).digest('hex');
      User.get(req.body.name, function (err, user) {
        // 检查用户是否存在
        if(err) {
            req.flash('error', '用户不存在');
            return res.redirect('/login');
        }
        // 检查密码是否一致
        //   console.log('index login:',user);
        if (user == null) {
          req.flash('error', '用户信息错误');
          return res.redirect('/login');
        }
        if (user.password != password) {
          req.flash('error', '密码错误');
          return res.redirect('/login');
        }
        req.session.user = user;
        req.flash('success', '登陆成功');
        res.redirect('/');
      });

  });

  app.get('/post', checkLogin);
  app.get('/post', function (req, res) {
    res.render('post', {
      title : '发表',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/post', checkLogin);
  app.post('/post', function (req, res) {
    var currentUser = req.session.user,
        tags = [req.body.tag1, req.body.tag2, req.body.tag3],
        post = new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post);

    post.save(function(err) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/')
      }
        req.flash('success', '发布成功');
        return res.redirect('/')
    })
  });

  app.get('/logout', checkLogin);
  app.get('/logout', function (req, res) {
    req.session.user = null;
    req.flash('success', '登出成功');
    res.redirect('/');
  });

  app.get('/upload', checkLogin);
  app.get('/upload', function(req, res) {
    res.render('upload', {
      title: '文件上传',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  var storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname);
    },
    destination: function (req, file, cb) {
        cb(null, './public/uploadimgs')
    }
  });

  app.post('/upload', checkLogin);
  app.post('/upload', multer({storage: storage}).any(), function(req, res) {
    // console.log(req.files);
    req.flash('success', '文件上传成功');
    res.redirect('/upload');
  });

  app.get("/archive", function (req, res) {
    Post.getArchive(function (err, posts) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/');
        }
        res.render('archive', {
          title: '存档',
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        })
    });
  });

  app.get('/tags', function (req, res) {
      Post.getTags(function (err, posts) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/');
        }
        res.render('tags', {
          title: '标签',
            posts: posts,
            user : req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
      });
  });


  app.get('/tags/:tag', function (req, res) {
      // console.log('index, tag:', req.params.tag);
      Post.getTag(req.params.tag, function (err, posts) {
          if (err) {
              req.flash('error', err);
              return res.redirect('/');
          }
          res.render('tag', {
              title: 'TAG-' + req.params.tag,
              posts: posts,
              user: req.session.user,
              success: req.flash('success').toString(),
              error: req.flash('error').toString()
          });
      });
  });

  app.get('/search', function(req, res) {
      Post.search(req.query.keyword, function (err, posts) {
          if (err) {
              req.flash('error', err);
              return res.redirect('/');
          }
          res.render('search', {
                title: "SEARCH-" + req.query.keyword,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
          })
      });
  });

  app.get('/links', function (req, res) {
      res.render('links', {
          title: '友情链接',
          user: req.session.user,
          success: req.flash('success').toString(),
          error: req.flash('error').toString()
      });
  });


    app.get('/u/:name/:day/:title', function (req, res) {
        Post.getOne(req.params.name, req.params.day, req.params.title, function(err, post) {
            // console.log('index.js, err:', err);
            // console.log('index.js, post:', post);

            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('article', {
                title: req.params.title,
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

  app.get('/u/:name', function (req, res) {
     var page = req.query.p ? parseInt(req.query.p) : 1;
    // 检查用户是否存在
      User.get(req.params.name, function (err, user) {
        if (!user) {
          req.flash('error', '用户不存在');
          return res.redirect('/');
        }
        // 查询并返回该用户第 page 页的 5 篇文章
        Post.get(user.name, page, function (err, posts, total) {
          if (err) {
            req.flash('error', err);
            return res.redirect('/');
          }
          res.render('user', {
            title: user.name,
              posts: posts,
              page: page,
              isFirstPage: (page-1) == 0,
              isLastPage: ((page-1)*5 + posts.length) == total,
              user: req.session.user,
              success: req.flash('success').toString(),
              error: req.flash('error').toString()
          });
        });

        // 查询并返回该用户的所有文章
        // Post.get(user.name, function (err, posts) {
        //   if (err) {
        //     req.flash('error', err);
        //     return res.redirect('/');
        //   }
        //   res.render('user', {
        //     title: user.name,
        //     posts: posts,
        //     user: req.session.user,
        //     success: req.flash('success').toString(),
        //     error: req.flash('error').toString()
        //   });
        // });
      });
  });

  app.get('/edit/:name/:day/:title', checkLogin);
  app.get('/edit/:name/:day/:title', function (req, res) {
      if (req.session.user.name != req.params.name) {
          req.flash('error', '无权限');
          return res.redirect('back');
      }
      var currentUser = req.session.user;
      Post.edit(currentUser.name, req.params.day, req.params.title, function(err, post) {
        if (err) {
          req.flash('error', err);
          return res.redirect('back');
        }
        res.render('edit', {
          title: '编辑',
          post: post,
          user: req.session.user,
          success: req.flash('success').toString(),
          error: req.flash('error').toString()
        })
      });
  });

  app.post('/edit/:name/:day/:title', checkLogin);
  app.post('/edit/:name/:day/:title', function (req,res) {
    var currentUser = req.session.user;
    Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
        var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
        if (err) {
          req.flash('error', err);
          return res.redirect(url);
        }
        req.flash('success', '修改成功');
        res.redirect(url);
    });
  });

  app.get('/remove/:name/:day/:title', checkLogin);
  app.get('/remove/:name/:day/:title', function (req, res) {
      if (req.session.user.name != req.params.name) {
          req.flash('error', '无权限');
          return res.redirect('back');
      }
      var currentUser = req.session.user;
      Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
          if (err) {
            req.flash(error, err);
            return res.redirect('back');
          }
          req.flash('success', '删除成功');
          res.redirect('/');
      });
  });

  app.post('/u/:name/:day/:title', function (req, res) {
      var date = new Date(),
          time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
                  date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ":" +
              (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());

      var md5 = crypto.createHash('md5'),
          email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
          head = "http://www.gravatar.com/avatar" + email_MD5 + "?s=48";

      var comment = {
        name: req.body.name,
        head: head,
        email: req.body.email,
        website: req.body.website,
        time: time,
        content: req.body.content
      };

      var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);

      newComment.save(function (err) {
          if (err) {
            req.flash('error', err);
            return res.redirect('back');
          }
          req.flash('success', '留言成功');
          res.redirect('back');
      })
  });

  app.get('/reprint/:name/:day/:title', checkLogin);
  app.get('/reprint/:name/:day/:title', function (req, res) {
      Post.edit(req.params.name, req.params.day, req.params.title, function (err, post) {
          if (err) {
              req.flash('error', err);
              return res.redirect(back);
          }
          var currentUser = req.session.user,
              reprint_from = {name: post.name, day: post.time.day, title: post.title},
              reprint_to = {name: currentUser.name, head: currentUser.head};

          Post.reprint(reprint_from, reprint_to, function (err, post) {
              if (err) {
                  req.flash('error', err);
                  return res.redirect('back');
              }
              req.flash('success', '转载成功');
              var url = encodeURI('/u/' + post.name + '/' + post.time.day + '/' + post.title);
              // 跳转到转载后的页面
              res.redirect(url);
          });
      });
  });



      app.use(function (req, res, next) {
        res.render("404");
    });

};

