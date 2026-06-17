import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "scope-enum": [
            2,
            "always",
            [
                "provider",
                "auth",
                "tools",
                "executable",
                "settings",
                "sdk-loader",
                "constants",
                "build",
                "release",
                "ci",
                "deps",
                "docs",
            ],
        ],
    },
};

export default config;
