export async function dispatchGithubRenderWorkflow(opts: { drawId: string; slug: string }) {
  const token = process.env.GITHUB_RENDER_PAT || "";
  const repo = process.env.GITHUB_RENDER_REPO || "";
  const ref = process.env.GITHUB_RENDER_REF || "main";
  const workflow = process.env.GITHUB_RENDER_WORKFLOW || "giveaway-render.yml";

  if (!token || !repo) {
    throw new Error("GitHub render dispatch env is missing");
  }

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref,
      inputs: {
        drawId: opts.drawId,
        slug: opts.slug,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub workflow dispatch failed (${res.status}): ${text}`);
  }
}
