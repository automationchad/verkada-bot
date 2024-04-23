
// Import whisper module from OpenAI
const { Whisper } = require('openai');

const parseAudio = ({
	question = '',
	chat_history = { messages: [] },
} = {}) => {};

module.exports = { parseAudio };
