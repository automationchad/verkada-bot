const { ConversationalRetrievalQAChain } = require('langchain/chains');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { OpenAI } = require('langchain/llms/openai');
const {
	PromptTemplate,
	SystemMessagePromptTemplate,
	AIMessagePromptTemplate,
	HumanMessagePromptTemplate,
} = require('langchain/prompts');
const { SupabaseVectorStore } = require('langchain/vectorstores/supabase');
const { SupabaseHybridSearch } = require('langchain/retrievers/supabase');
const { createClient } = require('@supabase/supabase-js');
const { sanitizeInput } = require('../../utils/sanitize-input');

const { config } = require('dotenv');
config();

// Create a single supabase client for interacting with your database
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_KEY
);

// personality model

const PROMPT_TEMPLATE = `You are a helpful AI assistant. Your name is Tracy and you work for Verkada (a security company). Given the following conversation and a follow up question, return the conversation history excerpt that includes any relevant context to the question if it exists and rephrase the follow up question to be a standalone question.
Chat History:
{chat_history}
Follow Up Input: {question}
Your answer should follow the following format:
\`\`\`
Use the following pieces of context to answer the users question. Don't worry about any URLs included, you're not expected to retrieve information from them.
Your answers should be concise and to the point (no longer than 25 words). No need to provide more information than is necessary. Be blunt and spartan.
No need to say "based on the information you provided" or "in my opinion" or anything like that. Just give the answer.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
<Relevant chat history excerpt as context here>
Standalone question: <Rephrased question here>
\`\`\`
Your answer (including related code snippets if available):`;

let embeddings, vectorStore, fasterModel, slowerModel, chain;

const initResources = async () => {
	if (!embeddings) {
		embeddings = new OpenAIEmbeddings({
			openAIApiKey: process.env.OPENAI_API_KEY,
		});

		vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
			client: supabase,
			tableName: 'documents',
			queryName: 'match_documents',
		});

		fasterModel = new OpenAI({
			modelName: 'gpt-4-turbo',
			temperature: 0.7,
		});

		slowerModel = new OpenAI({
			modelName: 'gpt-4-turbo',
			temperature: 0.1,
		});

		const vector = true;

		const retriever = vector
			? vectorStore.asRetriever()
			: new SupabaseHybridSearch(embeddings, {
					client: supabase,
					similarityK: 2,
					keywordK: 2,
					tableName: 'documents',
					similarityQueryName: 'match_documents',
					keywordQueryName: 'kw_match_documents',
			  });

		chain = ConversationalRetrievalQAChain.fromLLM(slowerModel, retriever, {
			returnSourceDocuments: true,
			questionGeneratorChainOptions: {
				template: PROMPT_TEMPLATE,
				llm: fasterModel,
			},
		});
	}
};

const tracyMessageCallback = async ({ message, client, logger }) => {
	try {
		await initResources();
		let replies = [];
		let file_text = '';

		// Get context of the conversation
		if (message.thread_ts) {
			replies = client.conversations.replies({
				channel: message.channel,
				ts: message.thread_ts,
			});
		}

		const { sanitizedQuestion, sanitizedHistory } = sanitizeInput({
			question: message.text,
			chat_history: replies,
		});

		// Call the chain
		// Add logic to process text, voice, images, and even video inputs

		for (const file of (message.files ?? [])) {
			switch (file.mimetype) {
				case 'audio/mp3':
					const { text } = await parseAudio({
						file: file.url_private_download,
					});
					file_text += text;
					break;
				case 'application/pdf':
					file.text += await parseDocument({ file: file.url_private_download });
					break;
				case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
					file.text += await parseDocument({ file: file.url_private_download });
					break;
				case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
					file.text += await parseDocument({ file: file.url_private_download });
					break;
				case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
					file.text += await parseDocument({ file: file.url_private_download });
					break;
				case 'text/html':
					file.text += await parseDocument({ file: file.url_private_download });
					break;
				case 'text/plain':
					file.text += await parseDocument({ file: file.url_private_download });
					break;
				default:
					break;
			}}

			const res = await chain.call({
				question: sanitizedQuestion,
				chat_history: sanitizedHistory,
			});

			await client.chat.postMessage({
				channel: message.channel,
				text: res.text,
				thread_ts: message.ts,
			});

			// Save conversation to database

			const { error: conversationError } = await supabase
				.from('conversations')
				.insert({
					channel_id: message.channel,
					user_id: message.user,
					thread_ts: message.thread_ts ?? null,
					prompt: message.text,
					response: res.text,
					source_documents: res.sourceDocuments,
					chat_history: sanitizedHistory,
				});

			if (conversationError) {
				throw new Error(conversationError);
			}

			// Update usage count

			// const { error: usageError } = await supabase
			// 	.from('usage')
			// 	.update({ usage: supabase.sql('usage + 1') });
			// if (usageError) {
			// 	throw new Error(usageError);
			// }
		} catch (error) {
		logger.error(error);
	}
};

module.exports = { tracyMessageCallback };
