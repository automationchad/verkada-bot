const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
config();

// Create a single supabase client for interacting with your database
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_KEY
);

// Function to check if two arrays are equal
function arraysEqual(a, b) {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length !== b.length) return false;

	const setA = new Set(a);
	const setB = new Set(b);

	return [...setA].every((value) => setB.has(value));
}

const sampleCommandCallback = async ({ ack, respond, command }) => {
	try {
		await ack();

		const scopes = ['chat'];
		if (command.text === '!admin') {
			scopes.push('embed');
		}

		const { data: tokenInsert, error: tokenInsertError } = await supabase
			.from('tokens')
			.upsert(
				{
					user_id: command.user_id,
					scopes,
				},
				{ onConflict: 'user_id', ignoreDuplicates: false }
			)
			.select();

		if (tokenInsertError) {
			console.log(tokenInsertError);
			throw new Error(tokenInsertError);
		}

		if (
			tokenInsert &&
			arraysEqual(tokenInsert[0].scopes, ['chat', 'embed']) &&
			command.text !== '!admin'
		) {
			await respond(`You already have a token: \`${tokenInsert[0].token}\``);
		} else if (
			tokenInsert &&
			arraysEqual(tokenInsert[0].scopes, ['chat']) &&
			!command.text
		) {
			await respond(`You already have a token: \`${tokenInsert[0].token}\``);
		} else {
			await respond(
				`Here's your token: \`${
					tokenInsert[0].token
				}\` with scopes: \`${tokenInsert[0].scopes.join(', ')}\``
			);
		}
	} catch (error) {
		console.log(error);
	}
};

module.exports = { sampleCommandCallback };
