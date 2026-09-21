# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

## How to record a change

When you make a change worth releasing, add a changeset:

```sh
npm run changeset
```

Pick the bump type (patch / minor / major) and write a short, user-facing
summary. This creates a markdown file in `.changeset/` — commit it with your PR.

## How releases happen

- On push to `master`, the **release** workflow (`.github/workflows/release.yml`)
  runs Changesets.
- If unreleased changesets exist, it opens/updates a **"Version Packages"** PR
  that bumps the version and updates `CHANGELOG.md`.
- Merging that PR publishes the new version to npm and creates a GitHub release.

You normally only run `npm run changeset` yourself; versioning and publishing are
handled by CI. See the [common questions](https://github.com/changesets/changesets/blob/main/docs/common-questions.md).
