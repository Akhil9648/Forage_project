# Skill: Status Report

This skill is executed autonomously by Hermes to compile progress reports and post them directly to the Slack channels.

## Specifications

- **Trigger:** Manual invoke via Slack command (`@Hermes status-report`) OR autonomous periodic schedule (every hour).
- **Execution Engine:** `skills/status-report/index.js`
- **Output Channel:** `#sprint-main`

## Expected Output Format

The status report must exactly adhere to the following Markdown layout:

```markdown
### 📊 Hermes Agentic Status Report

#### What I Did
- [List of completed actions, files written, and commands executed]

#### What's Left
- [Pending tasks in the plan or queue]

#### What Needs Your Call
- [Decisions, blockages, or feedback requests for the human operator]
```
