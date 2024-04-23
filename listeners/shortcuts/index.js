const { createItem } = require('./create_item');
const { answerItem } = require('./answer_item');

module.exports.register = (app) => {
	app.shortcut('create_item_message', createItem);
	app.shortcut('answer_item_message', answerItem);
};
