const { ConversationalRetrievalQAChain } = require('langchain/chains');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { OpenAI } = require('langchain/llms/openai');
const { SupabaseHybridSearch } = require('langchain/retrievers/supabase');
const { createClient } = require('@supabase/supabase-js');
const { sanitizeInput } = require('../../utils/sanitize-input');
const { config } = require('dotenv');
config();

// Validate environment variables
if (
	!process.env.SUPABASE_URL ||
	!process.env.SUPABASE_KEY ||
	!process.env.OPENAI_API_KEY
) {
	throw new Error('Missing required environment variable');
}

// Create a single supabase client for interacting with your database
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_KEY
);

const embeddings = new OpenAIEmbeddings({
	openAIApiKey: process.env.OPENAI_API_KEY,
});

const appMentionCallback = async ({ event, client, respond }) => {
	try {
		const { sanitizedQuestion, sanitizedHistory } = sanitizeInput({
			question: event.text,
			chat_history: [],
		});

		console.log(event.text, sanitizedQuestion, sanitizedHistory);

		if (sanitizedQuestion === '') {
			const result = await client.chat.postEphemeral({
				channel: event.channel,
				text: `Sure <@${event.user}>, I can give you an answer... just as soon as you sneak a question in there. I'm smart but I'm not psychic, you know!`,
				user: event.user,
			});
		} else {
			const retriever = new SupabaseHybridSearch(embeddings, {
				client: supabase,
				similarityK: 2,
				keywordK: 2,
				tableName: 'embeddings',
				similarityQueryName: 'match_documents',
				keywordQueryName: 'kw_match_documents',
			});

			const fasterModel = new OpenAI({
				modelName: 'gpt-3.5-turbo-16k',
				temperature: 0.7,
			});

			const slowerModel = new OpenAI({
				modelName: 'gpt-4',
				temperature: 0.3,
			});

			const chain = ConversationalRetrievalQAChain.fromLLM(
				slowerModel,
				retriever,
				{
					questionGeneratorChainOptions: {
						llm: fasterModel,
					},
				}
			);

			const res = await chain.call({
				question: sanitizedQuestion,
				chat_history: sanitizedHistory,
			});

			const result = await client.chat.postMessage({
				channel: event.channel,
				text: `<@${event.user}>, ${res.text}`,
				thread_ts: event.ts,
			});
		}
	} catch (error) {
		console.error(error);
		// Improved error handling
		client.chat.postMessage({
			channel: event.channel,
			text: `Sorry <@${event.user}>, something went wrong. Please try again later.`,
			thread_ts: event.ts,
		});
	}
};

module.exports = { appMentionCallback };
