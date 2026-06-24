# Multi-Agent System Architecture (Hermes & OpenClaw)

This document describes the multi-agent architecture built for the **Forge 2 Edition 1 Qualifier**.

```mermaid
sequenceDiagram
    autonumber
    actor Human
    participant Slack_Sprint as #sprint-main (Slack)
    participant Hermes as Hermes (Brain/Planner)
    participant Slack_Coder as #agent-coder (Slack)
    participant OpenClaw as OpenClaw (Hands/Executor)
    participant Local_OS as Local System / Sandbox
    participant Slack_Log as #agent-log (Slack)

    Human->>Slack_Sprint: Mention @Hermes with Task Prompt
    Slack_Sprint->>Hermes: Receive event (Socket Mode)
    Note over Hermes: Plan Task, Update Persistent Memory
    Hermes->>Slack_Log: Log step-by-step Plan & Architecture state
    Hermes->>Slack_Coder: Dispatch execution task instructions
    Slack_Coder->>OpenClaw: Receive event (Socket Mode)
    Note over OpenClaw: Parse task, Write Code, Execute command
    OpenClaw->>Local_OS: Run file and execute verification tests
    Local_OS-->>OpenClaw: stdout / stderr (Test success/fail)
    OpenClaw->>Slack_Coder: Reply with build logs & test output
    OpenClaw->>Slack_Sprint: Post execution success message
    Note over Hermes: Verify result, Update Memory, Finalize task
    Hermes->>Slack_Sprint: Post final task report
```

## Agent Roles

### 1. Hermes (The Brain / Planner)
- **Primary Role:** Orchestration, task decomposition, memory preservation, and scheduling.
- **Workflow:**
  - Listens for direct mentions in the main communication channel (`#sprint-main`).
  - Reads persistent memory from the local database (`data/memory.db`) to retrieve context from previous sessions.
  - Decomposes the high-level human prompt into a structured, step-by-step execution plan.
  - Logs the active plan to the auditing channel (`#agent-log`).
  - Formulates code-generation and command-execution tasks and dispatches them to the developer channel (`#agent-coder`).
  - Runs a background cron job to trigger periodic `status-report` skills.

### 2. OpenClaw (The Hands / Coder)
- **Primary Role:** Code writing, file operations, command execution, and test verification.
- **Workflow:**
  - Listens for dispatched plan items in the developer channel (`#agent-coder`).
  - Synthesizes code contents based on the instructions, writes them to files in the repository workspace.
  - Runs local terminal commands to execute programs or build scripts.
  - Executes validation suites (such as unit tests or health-checks) to verify correctness.
  - Returns raw logs, execution reports, and test results back to the Slack channel (`#agent-coder`).

## Slack Channel Layout

1. **`#sprint-main`**: Main channel for human operators to direct Hermes and view completed status updates.
2. **`#agent-coder`**: Inter-agent communication channel where Hermes dispatches instructions and OpenClaw reports execution logs.
3. **`#agent-log`**: Audit and monitoring channel where Hermes writes detailed planning steps, state changes, and session memory proofs.
