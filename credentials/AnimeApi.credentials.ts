import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AnimeApi implements ICredentialType {
	name = 'animeApi';

	displayName = 'AnimeAPI API';

	icon: Icon = { light: 'file:../icons/animeapi.svg', dark: 'file:../icons/animeapi.dark.svg' };

	documentationUrl = 'https://animeapi.ai/docs/api-reference';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'ank_...',
			description:
				'Create a key at https://animeapi.ai/dashboard/api-keys. Images cost $0.003 each on the anime model, charged to a prepaid balance.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
	};

	// AnimeAPI has no free "who am I" call, so the test looks up a video that cannot exist:
	// a valid key answers "not found", an invalid key answers INVALID_KEY.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://animeapi.ai',
			url: '/api/videos/n8n-credential-test',
			method: 'GET',
			ignoreHttpStatusErrors: true,
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'code',
					value: 'INVALID_KEY',
					message: 'AnimeAPI rejected this key. Create one at https://animeapi.ai/dashboard/api-keys.',
				},
			},
		],
	};
}
