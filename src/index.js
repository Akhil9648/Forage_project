import dotenv from 'dotenv';
import pkg from '@slack/bolt';
import { initMemory, saveTask, getTasks } from './memory.js';
import { initHermes } from './hermes.js';
import { initOpenClaw } from './openclaw.js';
import readline from 'readline';

const { App } = pkg;
dotenv.config();

async function start() {
  console.log('🚀 Starting Multi-Agent Orchestrator (Hermes × OpenClaw)...');

  // Initialize Memory
  await initMemory();
  console.log('📦 Persistent database memory initialized.');

  const botToken = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;

  if (!botToken || botToken.includes('your-bot-token') || !appToken || appToken.includes('your-app-token')) {
    console.warn('\n⚠️  WARNING: SLACK_BOT_TOKEN or SLACK_APP_TOKEN is missing or not configured in .env.');
    console.warn('Slack Socket Mode integration will be disabled.');
    console.warn('Starting in terminal Mock CLI Demo Mode...\n');
    runCliDemoMode();
    return;
  }

  try {
    const app = new App({
      token: botToken,
      appToken: appToken,
      socketMode: true,
      port: process.env.PORT || 3000
    });

    // Initialize Hermes (Brain)
    initHermes(app);

    // Initialize OpenClaw (Hands)
    initOpenClaw(app);

    await app.start();
    console.log('⚡ Multi-Agent System is active and connected to Slack via Socket Mode!');
  } catch (err) {
    console.error('❌ Failed to start Slack Bot app in Socket Mode:', err.message);
    console.log('Starting terminal Mock CLI Demo Mode instead...');
    runCliDemoMode();
  }
}

// Interactive terminal CLI mock mode when Slack is not yet configured
function runCliDemoMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('==================================================');
  console.log('       HERMES × OPENCLAW MOCK CLI DEMO            ');
  console.log('==================================================');
  console.log('You can type prompts to test the multi-agent loop.');
  console.log('Type "status-report" to trigger the status report skill.');
  console.log('Type "memory" to test memory persistence.');
  console.log('Type "exit" to quit.\n');

  // Stub Slack Bolt client functionality for local testing
  const mockSay = (text) => console.log(`\n💬 [Slack Response] -> ${text}\n`);
  const mockApp = {
    client: {
      conversations: {
        list: async () => ({ channels: [{ name: 'sprint-main', id: 'C1' }, { name: 'agent-coder', id: 'C2' }, { name: 'agent-log', id: 'C3' }] }),
        info: async () => ({ channel: { name: 'agent-coder' } })
      },
      chat: {
        postMessage: async ({ channel, text }) => {
          console.log(`\n📡 [POST TO ${channel}]`);
          console.log(text);
          console.log('--------------------------------------------------\n');
        }
      }
    },
    message: () => {},
    event: () => {}
  };

  // Setup handlers locally
  let appMentionHandler = null;
  let coderMessageHandler = null;

  mockApp.event = (name, cb) => {
    if (name === 'app_mention') appMentionHandler = cb;
  };
  mockApp.message = (cb) => {
    coderMessageHandler = cb;
  };

  // Initialize
  initHermes(mockApp);
  initOpenClaw(mockApp);

  const promptUser = () => {
    rl.question('Human operator prompt > ', async (input) => {
      const cleanInput = input.trim();
      if (cleanInput.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      if (cleanInput.toLowerCase() === 'status-report' || cleanInput.toLowerCase() === 'status report') {
        if (appMentionHandler) {
          await appMentionHandler({
            event: { text: '@Hermes status-report', channel: 'sprint-main' },
            say: mockSay
          });
        }
      } else if (cleanInput.toLowerCase() === 'memory') {
        if (appMentionHandler) {
          await appMentionHandler({
            event: { text: '@Hermes what was the last task you worked on?', channel: 'sprint-main' },
            say: mockSay
          });
        }
      } else if (cleanInput) {
        // Run full task loop
        if (appMentionHandler) {
          await appMentionHandler({
            event: { text: `@Hermes ${cleanInput}`, channel: 'sprint-main' },
            say: mockSay
          });
        }

        // Mock OpenClaw executing the task
        // Find last task ID from the memory db
        const tasks = await getTasks();
        if (tasks.length > 0) {
          const lastTask = tasks[tasks.length - 1];
          if (lastTask.status === 'PENDING') {
            console.log(`\n⏳ [Simulating OpenClaw receiving task ${lastTask.id} in #agent-coder]...`);
            if (coderMessageHandler) {
              await coderMessageHandler({
                message: {
                  channel: 'agent-coder',
                  text: `[TASK-ID: ${lastTask.id}] Execute: ${lastTask.prompt}`
                },
                say: mockSay
              });

              // Simulate the success result callback to Hermes
              const finalTasks = await getTasks();
              const updatedTask = finalTasks.find(t => t.id === lastTask.id);
              if (updatedTask && updatedTask.status === 'PENDING') {
                // If OpenClaw handled it, it should post SUCCESS or FAILURE
                // In mock mode, we trigger coderMessageHandler with the result message
                await coderMessageHandler({
                  message: {
                    channel: 'agent-coder',
                    text: `[TASK-ID: ${lastTask.id}] [STATUS: SUCCESS] Mock verification passed!`
                  },
                  say: mockSay
                });
              }
            }
          }
        }
      }
      promptUser();
    });
  };

  promptUser();
}

start();
