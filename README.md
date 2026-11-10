# n8n-nodes-animeapi

This is an n8n community node for [AnimeAPI](https://animeapi.ai): anime image generation at **$0.003 per image**, one of the cheapest anime image APIs, plus short anime video clips. Use it in a workflow or hand it to an n8n AI Agent as a tool.

AnimeAPI turns a plain-English prompt into a finished anime illustration in about 4 seconds. You pay from a prepaid balance (from $5, never expires, no subscription); new accounts get 3 free images without a card.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Prices](#prices) · [Usage](#usage) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. In n8n: **Settings → Community Nodes → Install**, then enter:

```
n8n-nodes-animeapi
```

## Operations

**Image**

- **Generate**: one anime image from a text prompt. Choose the model (`anime`, `ultra`, `ultra-max`) and the orientation (portrait, square, landscape). By default the image is downloaded into a binary field (`data`) so the next node can send it to Discord, Telegram, Slack, a storage bucket or anywhere else. The JSON output has `image_url`, `enhanced_prompt` (what the model read), `cost_usd`, `balance_usd` and `generation_time_ms`.

**Video**

- **Generate**: one anime clip (MP4, 5 to 15 seconds, with sound) from a text prompt, optionally starting or ending on an image URL. By default the node waits until the video has rendered and returns `video_url`.
- **Get**: status and URL of a video that was started earlier (free).

The node can be used as a tool by n8n AI Agents.

## Credentials

1. Sign up at [animeapi.ai](https://animeapi.ai) (3 free images, no card).
2. Create a key at [Dashboard → API keys](https://animeapi.ai/dashboard/api-keys). Keys start with `ank_`.
3. In n8n, create an **AnimeAPI API** credential and paste the key. **Test** confirms the key is accepted without spending anything.

## Prices

| What | Price |
| --- | --- |
| `anime` image (default) | **$0.003** |
| `ultra` image (long prompts, legible text) | $0.01 |
| `ultra-max` image (highest detail) | $0.02 |
| Video, 480p | $0.016 per second |
| Video, 768p | $0.04 per second |

Any orientation costs the same. Failed generations are refunded. Each item that reaches the node is one charged generation, so check how many items your workflow sends it.

## Usage

- **Prompts** are plain English, up to 1,000 characters. With **Enhance Prompt** on (the default), the prompt is rewritten into tags for the anime model; turn it off to send your own tag list as written.
- **Mature output is off by default** in this node (**Options → Allow Mature Output**), because workflow output usually lands in shared channels.
- **Keep the file, not the link.** Image and video URLs are not permanent storage. Leave **Download Image** on, or store the file in your own bucket.
- **Errors** stop the workflow with AnimeAPI's message (bad key, empty balance, refused prompt). Temporary failures are retried once. Use the node's **On Error** setting to continue instead.

Example: *Telegram Trigger → AnimeAPI (Prompt = `{{ $json.message.text }}`) → Telegram Send Photo (binary field `data`)* is a complete anime-image bot for $0.003 per picture.

## Compatibility

Built and tested with n8n 2.46. No runtime dependencies.

## Resources

- [AnimeAPI documentation](https://animeapi.ai/docs) and [API reference](https://animeapi.ai/docs/api-reference)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- Problems or requests: [open an issue](https://github.com/animeapi-ai/n8n-nodes-animeapi/issues) or write to contact@animeapi.ai

## Licence

[MIT](LICENSE.md)
