const { ConversationalRetrievalQAChain } = require('langchain/chains');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { OpenAI } = require('langchain/llms/openai');
const { SupabaseVectorStore } = require('langchain/vectorstores/supabase');
const { SupabaseHybridSearch } = require('langchain/retrievers/supabase');
const { createClient } = require('@supabase/supabase-js');
const { sanitizeInput } = require('../../utils/sanitize-input');

// Create a single supabase client for interacting with your database
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_KEY
);

const answerItem = async ({ shortcut, ack, client }) => {
	try {
		await ack();
		const replies = await client.conversations.replies({
			channel: shortcut.channel.id,
			ts: shortcut.message.thread_ts ?? shortcut.message.ts,
		});
		
		const question = replies.messages.slice(0, 1)[0].text ?? '';

		const { sanitizedQuestion, sanitizedHistory } = sanitizeInput({
			question,
			chat_history: replies,
		});

		const embeddings = new OpenAIEmbeddings({
			openAIApiKey: process.env.OPENAI_API_KEY,
		});

		const vector = false;

		const vectorStore = await SupabaseVectorStore.fromExistingIndex(
			embeddings,
			{
				client: supabase,
				tableName: 'embeddings',
				queryName: 'match_documents',
			}
		);

		const retriever = vector
			? vectorStore.asRetriever()
			: new SupabaseHybridSearch(embeddings, {
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
				returnSourceDocuments: true,
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
			channel: shortcut.channel.id,
			text: res.text,
			thread_ts: shortcut.message.thread_ts ?? shortcut.message.ts,
		});

		const { data: conversation, error: conversationError } = await supabase
			.from('conversations')
			.insert({
				channel_id: shortcut.channel.id,
				user_id: shortcut.user.id,
				thread_ts: shortcut.message.thread_ts ?? null,
				entry: shortcut.message.text,
				response: res.text,
				source_documents: res.sourceDocuments,
			});

		if (conversationError) {
			throw new Error(conversationError);
		}
	} catch (error) {
		console.error(error);
	}
};

module.exports = { answerItem };
