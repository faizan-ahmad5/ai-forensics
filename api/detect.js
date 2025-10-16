import Busboy from "busboy";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  // Allow a simple health check via GET
  if (req.method === "GET") {
    res.status(200).json({ ok: true, message: "alive" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const bb = Busboy({ headers: req.headers });
  let fileBuffer = null;

  bb.on("file", (_fieldname, file) => {
    const chunks = [];
    file.on("data", (data) => chunks.push(data));
    file.on("end", () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  bb.on("finish", async () => {
    if (!fileBuffer) {
      res.status(400).json({ error: "Missing file" });
      return;
    }

    // Support both the primary env var and a friendly alias
    const hfToken =
      process.env.HUGGINGFACE_API_TOKEN || process.env.AI_FORENSICS;
    if (!hfToken) {
      try {
        const form = new FormData();
        const blob = new Blob([fileBuffer]);
        form.append("file", blob, "upload.png");
        const localRes = await fetch("http://127.0.0.1:8080/detect", {
          method: "POST",
          body: form,
        });
        const json = await localRes.json();
        res.status(localRes.status).json(json);
        return;
      } catch (err) {
        res
          .status(500)
          .json({ ok: false, error: "Local forward failed: " + String(err) });
        return;
      }
    }

    try {
      const hfRes = await fetch(
        "https://api-inference.huggingface.co/models/Ateeqq/ai-vs-human-image-detector",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/octet-stream",
          },
          body: fileBuffer,
        }
      );

      if (!hfRes.ok) {
        const text = await hfRes.text();
        res
          .status(502)
          .json({ ok: false, error: "Hugging Face API error", details: text });
        return;
      }

      const json = await hfRes.json();
      // Forward HF response (structure may vary). Normalize if needed.
      res.status(200).json({ ok: true, result: json });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  req.pipe(bb);
}
