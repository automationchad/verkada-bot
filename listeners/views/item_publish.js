const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_KEY
);

function combineQuestionAnswer(input) {
	const question = input.question_input.save_item.value;
	const answer = input.answer_input.save_item.value;
	return question + ' ' + answer;
}

async function createRecord(values, user_id) {
	const text = combineQuestionAnswer(values);

	try {
		const { error } = await supabase.from('sources').insert({ text, user_id });
		if (error) throw error;
		return 'success';
	} catch (error) {
		console.log(error);
		return error;
	}
}

const answerSend = async ({ body, ack, client }) => {
	const result = await createRecord(body.view.state.values, body['user']['id']);
	let text;
	let verification_context;

	if (result instanceof Error) {
		text = 'An error occurred while submitting your question';
		verification_context = 'Please try again later.';
	} else {
		text = 'Question was successfully submitted';
		verification_context = 'Please allow *1-2 business days* for verification.';
	}
	await ack({
		response_action: 'update',
		view: {
			type: 'modal',
			title: {
				type: 'plain_text',
				text: 'Tracy ✨',
				emoji: true,
			},
			close: {
				type: 'plain_text',
				text: 'Close',
				emoji: true,
			},
			blocks: [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: `:partying_face: *Woo hoo!* ${text}`,
					},
				},
				{
					type: 'divider',
				},
				{
					type: 'image',
					image_url:
						'https://i.pinimg.com/originals/ee/cc/42/eecc42c92afa81900f655d4328d790c1.gif',
					alt_text: 'cheers',
				},
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: "\n\nYou're a real one, keep it up.\n\n\n\u00A0",
					},
				},
				{
					type: 'context',
					elements: [
						{
							type: 'mrkdwn',
							text: verification_context,
						},
					],
				},
			],
			callback_id: 'submit_screen',
			private_metadata: '',
		},
	});
};

module.exports = { answerSend };
