const items = [
	'CS',
	'Marketing',
	'Engineering',
	'Sales',
	'General',
	'Security',
];

const editBlocks = async (question, answer) => {
	let blocks;
	const obj = {
		title: question,
		views: '',
		category: '',
		tags: '',
		internalAnswer: answer,
		relatedLinks: '',
		context: '',
	};
	blocks = [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `Hey! Thanks for wanting to submit content to my brain. Enter details below.\n\n`,
			},
		},
		{
			type: 'divider',
		},
		// {
		// 	type: 'input',
		// 	block_id: 'category_input',
		// 	element: {
		// 		type: 'static_select',
		// 		placeholder: {
		// 			type: 'plain_text',
		// 			text: 'Select an item',
		// 			emoji: true,
		// 		},
		// 		initial_option: {
		// 			text: {
		// 				type: 'plain_text',
		// 				text: obj.category != '' ? obj.category : 'General',
		// 				emoji: true,
		// 			},
		// 			value: obj.category != '' ? obj.category : 'General',
		// 		},
		// 		options: items.map((o) => {
		// 			return {
		// 				text: {
		// 					type: 'plain_text',
		// 					text: `${o}`,
		// 					emoji: true,
		// 				},
		// 				value: `${o}`,
		// 			};
		// 		}),
		// 		action_id: 'save_item',
		// 	},
		// 	label: {
		// 		type: 'plain_text',
		// 		text: 'Collection',
		// 		emoji: true,
		// 	},
		// },
		{
			type: 'input',
			block_id: 'question_input',
			element: {
				type: 'plain_text_input',
				multiline: true,
				min_length: 15,
				initial_value: obj.title,
				action_id: 'save_item',
				placeholder: {
					type: 'plain_text',
					text: 'Be specific and imagine you’re asking a question to another person',
				},
			},
			label: {
				type: 'plain_text',
				text: 'Title',
				emoji: true,
			},
		},
		// {
		// 	type: 'input',
		// 	block_id: 'context_input',
		// 	optional: true,
		// 	element: {
		// 		type: 'plain_text_input',
		// 		multiline: true,
		// 		min_length: 0,
		// 		max_length: 500,
		// 		initial_value: obj.context,
		// 		action_id: 'save_item',
		// 	},
		// 	label: {
		// 		type: 'plain_text',
		// 		text: 'Context',
		// 		emoji: true,
		// 	},
		// },
		{
			type: 'input',
			block_id: 'answer_input',
			element: {
				type: 'plain_text_input',
				multiline: true,
				min_length: 15,
				initial_value: obj.internalAnswer,
				action_id: 'save_item',
			},
			label: {
				type: 'plain_text',
				text: 'Answer body',
				emoji: true,
			},
		},
		// {
		// 	type: 'input',
		// 	block_id: 'links_input',
		// 	optional: true,
		// 	hint: {
		// 		type: 'plain_text',
		// 		text: 'Formatted as \<https://example.com\|example text\>',
		// 		emoji: true,
		// 	},
		// 	element: {
		// 		type: 'plain_text_input',
		// 		multiline: false,
		// 		initial_value: obj.relatedLinks,
		// 		action_id: 'save_item',
		// 		placeholder: {
		// 			type: 'plain_text',
		// 			text: '\<URL\|URLtext\>',
		// 		},
		// 	},
		// 	label: {
		// 		type: 'plain_text',
		// 		text: 'Related links',
		// 		emoji: true,
		// 	},
		// },
		// {
		// 	type: 'input',
		// 	block_id: 'tag_input',
		// 	element: {
		// 		type: 'plain_text_input',
		// 		initial_value: obj.tags != '' ? obj.tags.join(',') : '',
		// 		action_id: 'save_item',
		// 		min_length: 3,
		// 		max_length: 180,
		// 		placeholder: {
		// 			type: 'plain_text',
		// 			text: 'e.g sales, trials, http connector',
		// 		},
		// 	},
		// 	label: {
		// 		type: 'plain_text',
		// 		text: "Add up to 5 tags to describe what your question is about. Separated by a comma (',')",
		// 		emoji: true,
		// 	},
		// },
	];
	return blocks;
};

const createItem = async ({ shortcut, ack, client }) => {
	try {
		await ack();
		const result = await client.conversations.replies({
			channel: shortcut.channel.id,
			ts: shortcut.message.thread_ts ?? shortcut.message.ts,
		});
		const question = result.messages.slice(0, 1)[0].text ?? '';
		const answer = shortcut.message.text ?? '';
		const editView = await editBlocks(question, answer);
		await client.views.open({
			trigger_id: shortcut.trigger_id,
			// View payload with updated blocks
			view: {
				type: 'modal',
				submit: {
					type: 'plain_text',
					text: 'Create',
					emoji: true,
				},
				close: {
					type: 'plain_text',
					text: 'Cancel',
					emoji: true,
				},
				title: {
					type: 'plain_text',
					text: 'Tracy ✨',
					emoji: true,
				},
				blocks: editView,
				callback_id: 'submit_question',
				private_metadata: 'create_question',
			},
		});
	} catch (error) {
		console.error(error);
	}
};

module.exports = { createItem };
