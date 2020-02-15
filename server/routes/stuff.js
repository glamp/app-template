const Router = require('express').Router;

module.exports = () => {
  const router = Router();

  router.get('/', (req, res) => {
    res.replyOK();
  });

  return router;
}
