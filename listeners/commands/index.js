const { sampleCommandCallback } = require('./tracy-token');

module.exports.register = (app) => {
  app.command('/tracy-token', sampleCommandCallback);
};
