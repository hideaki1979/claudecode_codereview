# GitHub Integration Patterns

## Authentication

Use personal access token with these scopes:

- `repo` - Repository access
- `read:user` - User profile
- `read:org` - Organization info

```typescript
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});
```

## Fetching Pull Requests

```typescript
async function getPullRequest(owner: string, repo: string, prNumber: number) {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  return data;
}
```

## Getting PR Files

```typescript
async function getPRFiles(owner: string, repo: string, prNumber: number) {
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });

  return data.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch,
  }));
}
```

## Rate Limiting

Check rate limit before making requests:

```typescript
async function checkRateLimit() {
  const { data } = await octokit.rateLimit.get();
  return data.rate;
}
```
