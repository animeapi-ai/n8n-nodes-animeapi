import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

const BASE_URL = 'https://animeapi.ai';

const IMAGE_PRICES: Record<string, number> = { anime: 0.003, ultra: 0.01, 'ultra-max': 0.02 };

const orientationOptions = [
	{ name: 'Portrait', value: 'portrait' },
	{ name: 'Square', value: 'square' },
	{ name: 'Landscape', value: 'landscape' },
];

const imageFields: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		placeholder: 'a knight cat drinking tea in a sunflower field',
		description: 'What to draw, in plain English. Up to 1,000 characters.',
		displayOptions: { show: { resource: ['image'], operation: ['generate'] } },
	},
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		default: 'anime',
		description: 'Quality tier. The price is per image, for any orientation.',
		options: [
			{
				name: 'Anime ($0.003 per Image)',
				value: 'anime',
				description: 'Best for characters, portraits and scenes. About 4 seconds.',
			},
			{
				name: 'Ultra ($0.01 per Image)',
				value: 'ultra',
				description: 'Follows long sentences and renders legible text. About 11 seconds.',
			},
			{
				name: 'Ultra Max ($0.02 per Image)',
				value: 'ultra-max',
				description: 'Highest detail',
			},
		],
		displayOptions: { show: { resource: ['image'], operation: ['generate'] } },
	},
	{
		displayName: 'Orientation',
		name: 'orientation',
		type: 'options',
		default: 'portrait',
		options: orientationOptions,
		displayOptions: { show: { resource: ['image'], operation: ['generate'] } },
	},
	{
		displayName: 'Download Image',
		name: 'download',
		type: 'boolean',
		default: true,
		description:
			'Whether to download the image into a binary field so later nodes can send or store it. Image URLs are not permanent storage.',
		displayOptions: { show: { resource: ['image'], operation: ['generate'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { resource: ['image'], operation: ['generate'] } },
		options: [
			{
				displayName: 'Allow Mature Output',
				name: 'allowNSFW',
				type: 'boolean',
				default: false,
				description: 'Whether the anime model may return mature images. Off by default in this node.',
			},
			{
				displayName: 'Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				description: 'Name of the binary field the downloaded image is put in',
			},
			{
				displayName: 'Enhance Prompt',
				name: 'enhance',
				type: 'boolean',
				default: true,
				description:
					'Whether to rewrite a plain-English prompt into tags for the anime model. Turn off to send your own tag list as written.',
			},
		],
	},
];

const videoFields: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		placeholder: 'a girl with a red umbrella waits at a rainy bus stop, then looks up as the bus pulls in',
		description: 'What happens in the clip: subject, action, camera, mood. Up to 1,000 characters.',
		displayOptions: { show: { resource: ['video'], operation: ['generate'] } },
	},
	{
		displayName: 'Resolution',
		name: 'resolution',
		type: 'options',
		default: '480p',
		description: 'The price is per second of video, charged when the job starts and refunded if it fails',
		options: [
			{ name: '480p ($0.016 per Second)', value: '480p' },
			{ name: '768p ($0.04 per Second)', value: '768p' },
		],
		displayOptions: { show: { resource: ['video'], operation: ['generate'] } },
	},
	{
		displayName: 'Duration (Seconds)',
		name: 'duration',
		type: 'number',
		typeOptions: { minValue: 5, maxValue: 15, numberPrecision: 0 },
		default: 5,
		description: 'Length of the clip, 5 to 15 seconds',
		displayOptions: { show: { resource: ['video'], operation: ['generate'] } },
	},
	{
		displayName: 'Orientation',
		name: 'orientation',
		type: 'options',
		default: 'landscape',
		options: orientationOptions,
		description: 'Ignored when a first frame is set: the image sets the shape',
		displayOptions: { show: { resource: ['video'], operation: ['generate'] } },
	},
	{
		displayName: 'Wait for Completion',
		name: 'wait',
		type: 'boolean',
		default: true,
		description:
			'Whether to wait until the video has rendered (usually one to three minutes). Turn off to get the video ID at once and fetch it later with the Get operation.',
		displayOptions: { show: { resource: ['video'], operation: ['generate'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { resource: ['video'], operation: ['generate'] } },
		options: [
			{
				displayName: 'First Frame URL',
				name: 'first_frame',
				type: 'string',
				default: '',
				description: 'Public image URL the clip starts on (image to video)',
			},
			{
				displayName: 'Last Frame URL',
				name: 'last_frame',
				type: 'string',
				default: '',
				description: 'Public image URL the clip ends on',
			},
			{
				displayName: 'Maximum Wait (Seconds)',
				name: 'maxWait',
				type: 'number',
				typeOptions: { minValue: 30, maxValue: 900 },
				default: 300,
				description:
					'How long to wait for the render before returning the job as still processing. Only used when Wait for Completion is on.',
			},
		],
	},
	{
		displayName: 'Video ID',
		name: 'videoId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID returned when the video was started',
		displayOptions: { show: { resource: ['video'], operation: ['get'] } },
	},
];

export class AnimeApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AnimeAPI',
		name: 'animeApi',
		icon: { light: 'file:../../icons/animeapi.svg', dark: 'file:../../icons/animeapi.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Generate anime images at $0.003 per image, and anime video clips, with AnimeAPI',
		defaults: {
			name: 'AnimeAPI',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'animeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Image', value: 'image' },
					{ name: 'Video', value: 'video' },
				],
				default: 'image',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['image'] } },
				options: [
					{
						name: 'Generate',
						value: 'generate',
						description: 'Generate an anime image from a text prompt, from $0.003 per image',
						action: 'Generate an image',
					},
				],
				default: 'generate',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['video'] } },
				options: [
					{
						name: 'Generate',
						value: 'generate',
						description: 'Generate an anime video clip from a text prompt, from $0.016 per second',
						action: 'Generate a video',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the status and URL of a video that was started earlier (free)',
						action: 'Get a video',
					},
				],
				default: 'generate',
			},
			...imageFields,
			...videoFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const call = async (options: IHttpRequestOptions, itemIndex: number): Promise<IDataObject> => {
			let lastError: unknown;
			// One retry on temporary failures; failed generations are refunded by the API.
			for (let attempt = 0; attempt < 2; attempt++) {
				try {
					return (await this.helpers.httpRequestWithAuthentication.call(this, 'animeApi', {
						json: true,
						...options,
					})) as IDataObject;
				} catch (error) {
					lastError = error;
					const status = Number((error as { httpCode?: string }).httpCode);
					if (attempt === 0 && (status === 500 || status === 503)) {
						await sleep(3000);
						continue;
					}
					break;
				}
			}
			throw new NodeApiError(this.getNode(), lastError as JsonObject, { itemIndex });
		};

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				if (resource === 'image' && operation === 'generate') {
					const prompt = this.getNodeParameter('prompt', itemIndex) as string;
					const model = this.getNodeParameter('model', itemIndex) as string;
					const orientation = this.getNodeParameter('orientation', itemIndex) as string;
					const download = this.getNodeParameter('download', itemIndex, true) as boolean;
					const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

					const data = await call(
						{
							method: 'POST',
							url: `${BASE_URL}/api/generate`,
							body: {
								prompt,
								model,
								orientation,
								enhance: options.enhance ?? true,
								allowNSFW: options.allowNSFW ?? false,
							},
						},
						itemIndex,
					);

					const json: IDataObject = { ...data, model, orientation, cost_usd: IMAGE_PRICES[model] };
					const item: INodeExecutionData = { json, pairedItem: { item: itemIndex } };

					if (download) {
						const imageUrl = data.image_url as string;
						const buffer = (await this.helpers.httpRequest({
							method: 'GET',
							url: imageUrl,
							encoding: 'arraybuffer',
						})) as ArrayBuffer;
						const extension = imageUrl.split('?')[0].endsWith('.png') ? 'png' : 'webp';
						const field = (options.binaryPropertyName as string) || 'data';
						item.binary = {
							[field]: await this.helpers.prepareBinaryData(
								Buffer.from(buffer),
								`animeapi-${Date.now()}.${extension}`,
								`image/${extension}`,
							),
						};
					}
					returnData.push(item);
				} else if (resource === 'video' && operation === 'generate') {
					const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
					const wait = this.getNodeParameter('wait', itemIndex, true) as boolean;
					const body: IDataObject = {
						prompt: this.getNodeParameter('prompt', itemIndex) as string,
						resolution: this.getNodeParameter('resolution', itemIndex) as string,
						duration: this.getNodeParameter('duration', itemIndex) as number,
						orientation: this.getNodeParameter('orientation', itemIndex) as string,
					};
					if (options.first_frame) body.first_frame = options.first_frame;
					if (options.last_frame) body.last_frame = options.last_frame;

					let video = await call({ method: 'POST', url: `${BASE_URL}/api/videos`, body }, itemIndex);
					if (video.status === undefined) video.status = 'processing';

					if (wait) {
						const deadline = Date.now() + Number(options.maxWait ?? 300) * 1000;
						while (video.status === 'processing' && Date.now() < deadline) {
							await sleep(5000);
							video = {
								...video,
								...(await call(
									{ method: 'GET', url: `${BASE_URL}/api/videos/${encodeURIComponent(String(video.id))}` },
									itemIndex,
								)),
							};
						}
						if (video.status === 'failed') {
							throw new NodeOperationError(
								this.getNode(),
								`The video failed: ${String(video.error ?? 'unknown error')}`,
								{ itemIndex, description: 'The charge was refunded.' },
							);
						}
					}
					returnData.push({ json: video, pairedItem: { item: itemIndex } });
				} else if (resource === 'video' && operation === 'get') {
					const videoId = this.getNodeParameter('videoId', itemIndex) as string;
					const video = await call(
						{ method: 'GET', url: `${BASE_URL}/api/videos/${encodeURIComponent(videoId)}` },
						itemIndex,
					);
					returnData.push({ json: video, pairedItem: { item: itemIndex } });
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${resource} ${operation}`, {
						itemIndex,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				// Errors from this node are already NodeApiError / NodeOperationError; wrap anything else.
				const nodeError =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex });
				throw nodeError;
			}
		}

		return [returnData];
	}
}
