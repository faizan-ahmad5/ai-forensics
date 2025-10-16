Deploying to Vercel (proxy to Hugging Face Inference API)

This repo includes a small Vercel serverless function that forwards uploaded images to the Hugging Face Inference API for the `Ateeqq/ai-vs-human-image-detector` model.

Why this approach

- The original Flask app runs a PyTorch model locally; that is heavy and not suitable for standard Vercel serverless runtime.
- Instead, the Vercel function proxies the image to Hugging Face's inference API which runs the model for you.

Files added

- `api/detect.js` — Vercel serverless endpoint that accepts multipart form uploads (`file`) and forwards the binary to Hugging Face Inference API.
- `vercel.json` — Vercel config to route `/api/detect` to the function.
- `package.json` — Node dependencies for local development.

Environment variables

- `HUGGINGFACE_API_TOKEN` — required. Create a token on https://huggingface.co/settings/tokens and set it in Vercel Dashboard or via CLI.

Environment variable details

- Local: this repo includes a `.env` (ignored by git) for local testing. It must contain `HUGGINGFACE_API_TOKEN` set to your Hugging Face token.
- Vercel: set the environment variable in the Project Settings. You can name the variable anything, but this project expects `HUGGINGFACE_API_TOKEN` in the runtime. If you prefer a friendly alias, the token name `ai-forensics` can be used in your project settings as the variable name — but make sure it is mapped to `HUGGINGFACE_API_TOKEN` at runtime (or set `HUGGINGFACE_API_TOKEN` directly).

Deploy steps (local)

1. Install Vercel CLI (optional): `npm i -g vercel`
2. Login and deploy:
   vercel login
   vercel --prod

OR use Vercel web UI: create a new project from this repo, set `HUGGINGFACE_API_TOKEN` in Project Settings > Environment Variables, and deploy.

Test

- After deployment, POST an image to `/api/detect` with multipart form field `file`. Example:

  curl -F "file=@/path/to/check.png" https://<your-vercel-app>.vercel.app/api/detect

Limitations

- This proxies requests to Hugging Face and counts against their rate/usage limits (and requires a token for larger models).
- Latency will include network round-trip to Hugging Face; cold starts may add extra delay.

If you'd rather deploy the original Flask app with the model baked into the image, we can explore deploying to Cloud Run (needs permissions to push image) or other VM/container hosts.
