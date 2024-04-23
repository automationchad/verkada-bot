const { answerSend } = require('./item_publish');

module.exports.register = (app) => {
	app.view('submit_question', answerSend);
};
