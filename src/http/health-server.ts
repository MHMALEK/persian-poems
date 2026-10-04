import express from "express";

/** `/health` only — keeps the Docker HEALTHCHECK green when the bot runs in long-polling mode. */
async function startHealthServer(): Promise<void> {
  const port = Number(process.env.PORT || 3000);
  const app = express();
  app.disable("x-powered-by");
  app.get("/health", (_req, res) => res.status(200).send("ok"));
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Health endpoint on port ${port}`);
      resolve();
    });
    server.on("error", reject);
  });
}

export { startHealthServer };
