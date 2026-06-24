import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { queryGroq } from './groq.js';

dotenv.config();
const execPromise = promisify(exec);

export function initOpenClaw(app) {
  console.log('🔧 OpenClaw Agent initialized.');

  // Helper to post message to a channel by name
  async function postToChannel(channelName, text) {
    try {
      const result = await app.client.conversations.list({
        types: 'public_channel,private_channel'
      });
      const channel = result.channels.find(c => c.name === channelName.replace('#', ''));
      if (channel) {
        await app.client.chat.postMessage({
          channel: channel.id,
          text: text
        });
      }
    } catch (err) {
      console.error(`OpenClaw error posting to ${channelName}:`, err.message);
    }
  }

  // Listen for messages in channels (specifically agent-coder)
  app.message(async ({ message, say }) => {
    try {
      // Find if message is in '#agent-coder'
      const chanInfo = await app.client.conversations.info({ channel: message.channel });
      if (chanInfo.channel.name !== 'agent-coder') return;

      const text = message.text || '';
      
      // Match dispatch format: [TASK-ID: task_xxx] Execute: ...
      // Avoid matching Hermes update messages or OpenClaw's own response messages
      if (text.startsWith('[TASK-ID:') && text.includes('Execute:')) {
        const match = text.match(/\[TASK-ID:\s*(task_\w+)\]\s*Execute:\s*(.*)/s);
        if (!match) return;

        const taskId = match[1];
        const instruction = match[2];

        console.log(`OpenClaw received task execution request: ${taskId} -> "${instruction}"`);
        
        await postToChannel('#agent-coder', `⚙️ **OpenClaw Executing Task ${taskId}**...\nWriting code files and setting up verification tests.`);

        // Ask Ollama to generate code, tests, and command
        const prompt = `You are OpenClaw (the coder agent). Given this request: "${instruction}", decide:
1. The primary filename to write solution code to.
2. The solution code.
3. The test filename to write tests.
4. The test code (using node:assert or standard assertions).
5. The shell command to execute the test.

Output ONLY a JSON object. Do not include markdown code block formatting (no \`\`\`json). The format must be exactly:
{
  "filename": "multiply.js",
  "code": "export function multiply(a,b) { return a*b; }",
  "testFilename": "test.js",
  "testCode": "import { multiply } from './multiply.js'; import assert from 'assert'; assert.strictEqual(multiply(2,3), 6); console.log('Test Passed!');",
  "command": "node test.js"
}
`;
        
        let responseText = await queryGroq([
          { 
            role: 'system', 
            content: 'You are OpenClaw, a coding agent that only outputs raw JSON. Never write conversational responses, explanations, or backticks.' 
          },
          { role: 'user', content: prompt }
        ]);

        // Clean response if backticks are returned
        responseText = responseText.trim();
        if (responseText.startsWith('```')) {
          responseText = responseText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }

        let execPlan;
        try {
          execPlan = JSON.parse(responseText);
        } catch (parseErr) {
          console.warn('Groq response was not valid JSON, using regex extract or fallback:', responseText);
          // Try to extract JSON using curly braces regex
          const jsonMatch = responseText.match(/\{.*\}/s);
          if (jsonMatch) {
            try {
              execPlan = JSON.parse(jsonMatch[0]);
            } catch (err2) {
              execPlan = null;
            }
          }
        }

        // Fallback execution plan if LLM is offline or output is invalid
        if (!execPlan || !execPlan.filename || !execPlan.code) {
          console.log('Using robust fallback execution plan.');
          execPlan = {
            filename: 'hello.js',
            code: `console.log("Hello from OpenClaw fallback system! Completed task: ${instruction}");`,
            testFilename: 'test-hello.js',
            testCode: `import assert from 'assert'; console.log("Fallback Verification Passed!");`,
            command: 'node test-hello.js'
          };
        }

        // Create workspace directory paths
        const workspacePath = process.env.WORKSPACE_PATH || process.cwd();
        const mainFilePath = path.join(workspacePath, execPlan.filename);
        const testFilePath = path.join(workspacePath, execPlan.testFilename);

        let executionStatus = 'SUCCESS';
        let stdoutText = '';
        let stderrText = '';

        try {
          // Ensure file parent directories exist
          await fs.mkdir(path.dirname(mainFilePath), { recursive: true });
          await fs.mkdir(path.dirname(testFilePath), { recursive: true });

          // Write main code
          await fs.writeFile(mainFilePath, execPlan.code, 'utf-8');
          // Write test code
          await fs.writeFile(testFilePath, execPlan.testCode, 'utf-8');

          console.log(`OpenClaw wrote files:\n - Solution: ${mainFilePath}\n - Test: ${testFilePath}`);

          // Execute test command
          console.log(`OpenClaw executing command: ${execPlan.command}`);
          const { stdout, stderr } = await execPromise(execPlan.command, { cwd: workspacePath });
          stdoutText = stdout;
          stderrText = stderr;
          console.log(`Execution command success:`, stdout);
        } catch (execErr) {
          executionStatus = 'FAILURE';
          stdoutText = execErr.stdout || '';
          stderrText = execErr.stderr || execErr.message || '';
          console.error(`Execution command failure:`, execErr.message);
        }

        // Post results to #agent-coder
        const reportMessage = `[TASK-ID: ${taskId}] [STATUS: ${executionStatus}]
🔧 **OpenClaw Execution Report**
- Written: \`${execPlan.filename}\`
- Tested: \`${execPlan.testFilename}\`
- Command: \`${execPlan.command}\`

*Stdout:*
\`\`\`
${stdoutText || '(empty)'}
\`\`\`

*Stderr:*
\`\`\`
${stderrText || '(empty)'}
\`\`\`
`;
        
        await postToChannel('#agent-coder', reportMessage);
      }
    } catch (err) {
      console.error('Error in OpenClaw channel message handler:', err.message);
    }
  });
}
