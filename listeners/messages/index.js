const { tracyMessageCallback } = require('./tracy-message');

module.exports.register = (app) => {
  app.message(tracyMessageCallback);
};
