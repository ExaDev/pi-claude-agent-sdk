import type { GlobalConfig } from "semantic-release";

/**
 * semantic-release configuration.
 *
 * The commit-analyzer and release-notes-generator use the default
 * `conventionalcommits`-compatible preset (semantic-release's default), so
 * `feat` -> minor, `fix`/`perf` -> patch, a breaking change -> major, and
 * `refactor`/`docs`/`chore`/`test`/`style`/`build`/`ci` do not trigger a
 * release. `branches`, `repositoryUrl`, and `tagFormat` are the GlobalConfig
 * required fields, set to their conventional defaults.
 *
 * The default plugin set (commit-analyzer, release-notes-generator, npm,
 * github) is extended with @semantic-release/changelog (write CHANGELOG.md) and
 * @semantic-release/git (commit the version bump + changelog). npm publishing is
 * disabled (npmPublish: false) — releases are GitHub-only; set this to true and
 * add an NPM_TOKEN to publish to the npm registry.
 */
const config: GlobalConfig = {
    branches: [{ name: "main" }],
    repositoryUrl: "git+https://github.com/ExaDev/pi-claude-agent-sdk.git",
    tagFormat: "v${version}",
    plugins: [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@semantic-release/changelog",
        ["@semantic-release/npm", { npmPublish: false }],
        [
            "@semantic-release/git",
            {
                assets: ["package.json", "CHANGELOG.md"],
                message:
                    "chore(release): ${nextRelease.version}\n\n${nextRelease.notes}",
            },
        ],
        "@semantic-release/github",
    ],
};

export default config;
