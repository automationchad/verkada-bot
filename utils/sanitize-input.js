const sanitizeInput = ({
	question = '',
	chat_history = { messages: [] },
} = {}) => {
	if (!question) {
		throw new Error(`Oops! Looks like you didn't include the question.`);
	}

	const regex = /<@U[A-Za-z0-9]+>/g;

	const sanitizedQuestion = question
		.trim()
		.replaceAll('\n', ' ')
		.replace(regex, '');

	const { messages = [] } = chat_history;
	const sanitizedHistory =
		messages.length > 1
			? messages
					.map(
						({ text = '', bot_id = null }) =>
							`${bot_id ? 'AI: ' : 'USER: '}${text}`
					)
					.join(' \n')
			: '';

	return { sanitizedQuestion, sanitizedHistory };
};

module.exports = { sanitizeInput };
