> [!NOTE]
> This policy changed on 26 October 2026. Previously, AI use had to be assistive only. Generated code is now allowed, but understanding and communication must still be human.

## AI Usage Policy

### Our Rule
Using AI tools to write code is fine, including fully generated code. But you need to understand what you submit, and you need to explain it in your own words.

This is to ensure the quality, security and maintainability of the codebase.

> [!WARNING]
> Maintainers may close PRs where the author cannot explain the change, or where the PR description or discussion appears to be AI-written.

You **must** write your own Pull Request description, and you **must** reply to review comments yourself. Descriptions and replies written by AI will be closed.
Its okay if English isn't your first language, we prefer poor human communication that demonstrates understanding over perfect AI-generated English that doesn't.

## Guidelines for Using AI Tools

1. **Understand fully:** You must be able to explain every line of code you submit, including why it works and why you chose that approach. Generated code you can't explain will be rejected.
2. **Communicate in your own words:** PR descriptions, commit messages, issue reports and review replies are written by you. Maintainers want to talk to you, not to a model.
3. **Test thoroughly:** Review and test all code before submission. Generating tests is fine, but manual testing must be completed too.
4. **Take responsibility:** You are accountable for bugs, issues, or problems with your contribution, whoever or whatever wrote the code.
5. **Keep it reviewable:** Keep PRs focused, remove unrelated changes and use multiple commits to break down changes. A single large commit makes review and tracking code changes difficult for maintainers.
6. **Disclose usage:** Note which AI tools you used, and how they were used, in your PR description.

### Example disclosure
> I used Claude to help debug a test failure. I reviewed the suggested fix, tested it locally, and verified it solves the issue without side effects.

> I used Gemini to generate most of the new upload handler. I read through it, tested it locally, and rewrote the error handling because it didn't handle failures correctly.

> I used ChatGPT to help me understand an error message and suggest debugging steps. I implemented the fix myself after verifying it.
