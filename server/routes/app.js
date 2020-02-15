const path = require('path');
const fs = require('fs');
const Router = require('express').Router;

const STATIC_DIR = path.join(__dirname, '../../app/dist/');
const indexFile = fs.readFileSync(STATIC_DIR + '/index.html').toString();
const fileLocationCache = {};
module.exports = () => {
  const router = new Router();

  router.get('*', (req, res) => {
    if (req.csrfToken) {
      res.cookie('XSRF-TOKEN', req.csrfToken());
    }
    const filepath = path.join(STATIC_DIR, req.path);

    // don't hit the file system every time
    if (fileLocationCache[filepath]) {
      res.sendFile(filepath);
      return;
    }

    if (fs.existsSync(filepath) && fs.lstatSync(filepath).isFile()) {
      fileLocationCache[filepath] = true;
      res.sendFile(filepath);
      return
    }

    // const indexFileContent = utils.head.template(indexFile, req.path, res.locals);
    res.send(indexFile);
  });

  return router;

}
