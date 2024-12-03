const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
var busboy = require("busboy");
const bodyParser = require("body-parser");
const helmet = require("helmet");
var uuid = require("node-uuid");
var https = require("https");
const port = 8100;
var privateKey = fs.readFileSync("./alikey/franxxdaryl.site.key", "utf8");
var certificate = fs.readFileSync(
  "./alikey/franxxdaryl.site_public.crt",
  "utf8"
);

var credentials = { key: privateKey, cert: certificate };
// request body解析
app.use(express.json());
app.use(bodyParser.json());
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Request-Method", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  // 设置相同站点资源可被引用即可显示图片
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

app.get("/penfile/*", (req, res) => {
  res.sendFile(__dirname + `${req.url.split("?")[0]}`);
});
app.get("/blog/*", (req, res) => {
  res.sendFile(__dirname + `${req.url.split("?")[0]}`);
});
// 删除codepen
app.get("/dodeletepen", (req, res) => {
  let id = req.query.id || "";
  if (!id.trim()) {
    res.json({ msg: "please choose an code id", code: 500 });
    return;
  }
  //   res.sendStatus(200);
  const filePath = path.resolve(__dirname, `penfile/samplefolder/${id}`);
  const fileDir = path.resolve(__dirname, `penfile/codepeninfo.json`);
  fs.readFile(fileDir, "utf-8", function (err, data) {
    let infoList = JSON.parse(data);
    if (id) {
      infoList = infoList.filter((file) => file.id !== id);
    }
    if (err) {
      console.log(err);
    } else {
      fs.writeFile(fileDir, JSON.stringify(infoList), function (err) {});
    }
  });
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("文件删除失败", err);
      res.json({ msg: "fail", code: 500 });
    } else {
      console.log("文件删除成功");
      res.json({ msg: "sucess", code: 200 });
    }
  });
});
// 删除blog
app.get("/dodeleteblog", (req, res) => {
  let id = req.query.id || "";
  if (!id.trim()) {
    res.json({ msg: "please choose an code id", code: 500 });
    return;
  }
  //   res.sendStatus(200);
  const fileDir = path.resolve(__dirname, `blog.json`);
  fs.readFile(fileDir, "utf-8", function (err, data) {
    let infoList = JSON.parse(data);
    if (id) {
      infoList = infoList.filter((file) => file.id !== id);
    }
    if (err) {
      console.log(err);
    } else {
      fs.writeFile(fileDir, JSON.stringify(infoList), function (err) {
        if (err) {
          console.error("文件删除失败", err);
          res.json({ msg: "fail", code: 500 });
        } else {
          console.log("文件删除成功");
          res.json({ msg: "sucess", code: 200 });
        }
      });
    }
  });
});
// 添加codepen资源文件
app.post(
  "/uploadfiles",
  //   upload.any,
  function (request, response) {
    response.removeHeader("Cross-Origin-Resource-Policy");
    response.removeHeader("Cross-Origin-Opener-Policy");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Request-Method", "*");
    response.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    response.setHeader("Access-Control-Allow-Headers", "*");
    // 设置相同站点资源可被引用即可显示图片
    const bb = busboy({ headers: request.headers });
    let dataId = "";
    var files = 0,
      finished = false;
    bb.on("file", function (name, file, info) {
      const rootDirPath = path.resolve(
        __dirname,
        `penfile/samplefolder/${dataId}`
      );
      if (!fs.existsSync(rootDirPath)) {
        fs.mkdirSync(rootDirPath);
      }
      ++files;
      const saveTo = path.join(rootDirPath, `/${info.filename}`);
      var filestream = fs.createWriteStream(saveTo);
      filestream.on("finish", function () {
        if (--files === 0 && finished) {
          response.writeHead(200, { Connection: "close" });
          response.end("");
        }
      });
      file.pipe(filestream);
    });
    bb.on("field", (name, val, info) => {
      dataId = val;
    });
    bb.on("finish", function () {
      finished = true;
    });
    request.pipe(bb);
  }
);
// 上传博客
app.post(
  "/uploadblog",
  //   upload.any,
  function (request, response) {
    response.removeHeader("Cross-Origin-Resource-Policy");
    response.removeHeader("Cross-Origin-Opener-Policy");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Request-Method", "*");
    response.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    response.setHeader("Access-Control-Allow-Headers", "*");
    // 设置相同站点资源可被引用即可显示图片
    const bb = busboy({ headers: request.headers });
    let doc = "";
    let time = "";
    let content = "";
    let id = uuid.v1();
    let type = "";
    var files = 0,
      finished = false;
    bb.on("file", function (name, file, info) {
      const rootDirPath = path.resolve(__dirname, `blog`);
      if (!fs.existsSync(rootDirPath)) {
        fs.mkdirSync(rootDirPath);
      }
      ++files;
      const saveTo = path.join(rootDirPath, `${doc}.md`);
      var filestream = fs.createWriteStream(saveTo);
      filestream.on("finish", function () {
        if (--files === 0 && finished) {
          const fileDir = path.resolve(__dirname, `./blog/blog.json`);
          fs.readFile(fileDir, "utf-8", function (err, data) {
            let infoList = JSON.parse(data);
            let curInfo = {
              doc: `${doc}.md`,
              time,
              content,
              id,
              type,
            };
            if (curInfo.id) {
              infoList.push(curInfo);
              infoList = Array.from(
                new Set(infoList.map((info) => JSON.stringify(info)))
              ).map((str) => JSON.parse(str));
            }
            if (err) {
              console.log(err);
            } else {
              fs.writeFile(fileDir, JSON.stringify(infoList), function (err) {
                if (!err) {
                  response.json({
                    code: 200,
                    ok: true,
                    msg: "blog信息添加成功",
                    data,
                  });
                } else reject("error");
              });
            }
          });
          // response.writeHead(200, { Connection: "close" });
          // response.end("");
        }
      });
      file.pipe(filestream);
    });
    bb.on("field", (name, val, info) => {
      name === "doc" && (doc = val);
      name === "time" && (time = val);
      name === "content" && (content = val);
      name === "type" && (type = val);
    });

    bb.on("finish", function () {
      finished = true;
    });
    request.pipe(bb);
  }
);

// 修改博客
app.post(
  "/updateblog",
  //   upload.any,
  function (request, response) {
    response.removeHeader("Cross-Origin-Resource-Policy");
    response.removeHeader("Cross-Origin-Opener-Policy");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Request-Method", "*");
    response.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    response.setHeader("Access-Control-Allow-Headers", "*");
    // 设置相同站点资源可被引用即可显示图片
    const bb = busboy({ headers: request.headers });
    let doc = "";
    let time = "";
    let content = "";
    let id = "";
    let type = "";
    var files = 0,
      finished = false;
    bb.on("file", function (name, file, info) {
      const rootDirPath = path.resolve(__dirname, `blog`);
      if (!fs.existsSync(rootDirPath)) {
        fs.mkdirSync(rootDirPath);
      }
      ++files;
      const saveTo = path.join(rootDirPath, `${doc}.md`);
      var filestream = fs.createWriteStream(saveTo);
      filestream.on("finish", function () {
        if (--files === 0 && finished) {
          const fileDir = path.resolve(__dirname, `./blog/blog.json`);
          fs.readFile(fileDir, "utf-8", function (err, data) {
            let infoList = JSON.parse(data);
            let curInfo = {
              doc: `${doc}.md`,
              time,
              content,
              id,
              type,
            };
            if (curInfo.id) {
              let index = infoList.findIndex((e) => e.id === curInfo.id);
              if (index !== -1) {
                infoList[index] = curInfo;
              } else infoList.push(curInfo);
            }
            if (err) {
              console.log(err);
            } else {
              fs.writeFile(fileDir, JSON.stringify(infoList), function (err) {
                if (!err) {
                  response.json({
                    code: 200,
                    ok: true,
                    msg: "blog信息添加成功",
                    data,
                  });
                } else reject("error");
              });
            }
          });
        }
      });
      file.pipe(filestream);
    });
    bb.on("field", (name, val, info) => {
      name === "doc" && (doc = val);
      name === "time" && (time = val);
      name === "content" && (content = val);
      name === "type" && (type = val);
      name === "id" && (id = val);
    });

    bb.on("finish", function () {
      finished = true;
    });
    request.pipe(bb);
  }
);
// 更新codepen信息列表
app.post("/updateinfo", function (request, response) {
  let curInfo = request.body || {};
  //   response.send(request.body); // echo the result back
  const fileDir = path.resolve(__dirname, `penfile/codepeninfo.json`);
  fs.readFile(fileDir, "utf-8", function (err, data) {
    let infoList = JSON.parse(data);
    if (curInfo.id) {
      infoList.push(curInfo);
      infoList = Array.from(
        new Set(infoList.map((info) => JSON.stringify(info)))
      ).map((str) => JSON.parse(str));
    }
    if (err) {
      console.log(err);
    } else {
      fs.writeFile(fileDir, JSON.stringify(infoList), function (err) {
        if (!err) {
          response.json({
            code: 200,
            ok: true,
            msg: "codepen信息添加成功",
            data,
          });
        } else reject("error");
      });
    }
  });
});

var httpsServer = https.createServer(credentials, app);
console.log(`server listening on port ${port}`);
httpsServer.listen(port);
