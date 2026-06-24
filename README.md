# Forge 2 Qualifier: Multi-Agent System (Hermes & OpenClaw)

This repository contains the complete implementation of the multi-agent orchestrator system built for the Forge 2 Edition 1 Qualifier.

It features **Hermes (The Brain)**, a planning agent with persistent cross-session memory and autonomous scheduling skills, and **OpenClaw (The Hands)**, an execution agent capable of writing code, running commands, and executing tests. Communication and coordination are fully routed through Slack Socket Mode.

---

## 🛠️ Step-by-Step Slack Setup

### 1. Create a Slack Workspace
1. Go to [slack.com/create](https://slack.com/create).
2. Follow the prompt to create a new workspace (e.g., `Forge Multi-Agent Team`).
3. Add the following three public channels:
   - `#sprint-main` (for human operator commands and final reports)
   - `#agent-coder` (for Hermes to assign tasks and OpenClaw to post build/test logs)
   - `#agent-log` (for auditing Hermes' plan transitions and memory proofs)

### 2. Create the Slack App
1. Go to the [Slack App Dashboard](https://api.slack.com/apps).
2. Click **Create New App** -> Select **From scratch**.
3. Name your app `Hermes-OpenClaw-Orchestrator` and select your newly created workspace.

### 3. Configure Scopes & Bot Tokens
1. Go to **OAuth & Permissions** in the sidebar.
2. Scroll down to **Scopes** -> **Bot Token Scopes** and add the following 6 scopes:
   - `chat:write` (Allows posting messages)
   - `channels:history` (Allows viewing channel messages)
   - `channels:read` (Allows listing channels)
   - `app_mentions:read` (Allows listening to direct @mentions)
   - `im:history` (Allows direct messaging)
   - `users:read` (Allows reading user list/profiles)
3. Scroll to the top of OAuth & Permissions and click **Install to Workspace**. Authorize the permissions.
4. Copy the generated **Bot User OAuth Token** (starts with `xoxb-`). Save this as `SLACK_BOT_TOKEN`.

### 4. Enable Socket Mode
1. Go to **Socket Mode** in the sidebar.
2. Toggle **Enable Socket Mode** to On.
3. You will be prompted to generate an **App-Level Token**. Set the Token Name to `SocketModeToken` and add the `connections:write` scope (default). Click **Generate**.
4. Copy the generated App Token (starts with `xapp-`). Save this as `SLACK_APP_TOKEN`.

### 5. Enable Event Subscriptions
1. Go to **Event Subscriptions** in the sidebar.
2. Toggle **Enable Events** to On.
3. Scroll to **Subscribe to bot events** and add the following:
   - `app_mention` (for @mentions in public channels)
   - `message.channels` (for reading messages in the channels our bot is added to)
4. Click **Save Changes** at the bottom.

### 6. Invite Bot to Channels
Before running the bot, open your Slack workspace and invite the bot to the channels. In each channel (`#sprint-main`, `#agent-coder`, `#agent-log`), type:
```text
/invite @Hermes-OpenClaw-Orchestrator
```

---

## 💻 Installation & LLM Setup

### 1. Get Groq API Key
The system uses the Groq Cloud API.
1. Sign up for a developer account at [console.groq.com](https://console.groq.com).
2. Go to **API Keys** in the sidebar and click **Create API Key**.
3. Copy the key (starts with `gsk_`) and save it in your `.env` file as `GROQ_API_KEY`.
4. Choose your preferred model (default: `llama-3.1-70b-versatile`) and configure it via `GROQ_MODEL` in `.env`.

### 2. Install Project Dependencies
In the root directory `c:\Users\akhil\Forage`, install the Node.js packages:
```powershell
npm install
```

### 3. Setup Environment Variables
Create a file named `.env` by copying `.env.example` and filling in your Slack tokens:
```powershell
cp .env.example .env
```
Open `.env` and fill in `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`.

---

## 🚀 Running the Multi-Agent System

### Start the Agents
Run the master script which starts both the Hermes and OpenClaw agents in the same process (or separate processes if preferred):
```powershell
npm start
```
Upon startup, the console will print connection confirmation logs for both agents, indicating that Socket Mode has established active websocket tunnels.

---

## 🤖 How to Interact (Human -> Hermes -> OpenClaw -> Result)

### Scenario: Code Generation & Execution Task
1. Go to `#sprint-main` in Slack.
2. Ask Hermes to perform a task, mentioning the bot:
   > `@Hermes-OpenClaw-Orchestrator write a node script named multiply.js that multiplies two numbers, and run verification tests on it.`
3. **Hermes** will receive the request, load past memory, and post an execution plan to `#agent-log`.
4. **Hermes** will dispatch the task to OpenClaw in `#agent-coder`.
5. **OpenClaw** will parse the instructions, write `multiply.js` to disk, create an automated test script, execute it, and reply in `#agent-coder` with console output and status.
6. **Hermes** compiles the final success report and posts it to `#sprint-main`.

### Scenario: Memory Persistence Check
1. Start the agents, send a task, and then stop the process (`Ctrl + C`).
2. Restart the agents (`npm start`).
3. Send a message to `#sprint-main`:
   > `@Hermes-OpenClaw-Orchestrator what was the last task you worked on?`
4. Hermes will read the database memory (`data/memory.db`) and respond in `#sprint-main` recalling the details of the previous session.

### Scenario: Autonomous Scheduled Skill Trigger
1. Hermes schedules the `status-report` skill autonomously (cron job).
2. To trigger it manually in Slack:
   > `@Hermes-OpenClaw-Orchestrator status-report`
3. Hermes will generate a status report formatting:
   - What I Did
   - What's Left
   - What Needs Your Call
4. The output will be posted directly to `#sprint-main`.

---

## 🏆 Evidence Checklist for Judges

Ensure you capture screenshots and logs of the following:
1. [ ] **Slack Channels Workspace:** Screenshot of Slack sidebar showing `#sprint-main`, `#agent-coder`, `#agent-log` channels with the bot invited.
2. [ ] **Plan Auditing:** Screenshot of `#agent-log` showing Hermes posting a structured step-by-step plan.
3. [ ] **Execution Logs:** Screenshot of `#agent-coder` showing OpenClaw posting execution logs and output of the command/tests.
4. [ ] **Memory Verification:** Screenshot of `#sprint-main` showing Hermes recalling the previous task across restarts.
5. [ ] **Skill Trigger:** Screenshot of `#sprint-main` showing the structured `status-report` markdown format.
