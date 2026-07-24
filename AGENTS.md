# Repository Instructions

- Keep `README.md` updated with a complete list of all built-in presets. For each preset, include an example CLI command, an example library usage snippet, and the resulting image.
- In examples that use images, logos, or other media assets, never hardcode those assets into preset code. Pass asset sources through CLI flags or library options in the example call.
- From now on, rely on GitHub CI to run the test suite because this machine can barely handle it. If tests are needed, commit the change, push it, and monitor the CI run on GitHub instead of running the full suite locally.
