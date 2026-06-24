import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import pkg from '@slack/bolt';

const { App } = pkg;
dotenv.config();

const MEMORY_FILE = path.join(process.cwd(), 'data', 'memory.json');

async function run() {
  console.log('🔄 Executing Status Report Skill standalone run...');

  let tasks = [];
  try {
    const content = await fs.readFile(MEMORY_FILE, 'utf-8');
    tasks = JSON.parse(content);
  } catch (err) {
    console.log('No database memory found yet. Initializing empty.');
  }

  const completed = tasks.filter(t => t.status === 'SUCCESS');
  const pending = tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');
  const failed = tasks.filter(t => t.status === 'FAILURE');

  let whatIDid = completed.map(t => `- **${t.id}**: ${t.prompt} (Completed)`).join('\n') || '- None';
  let whatsLeft = pending.map(t => `- **${t.id}**: ${t.prompt} (In Progress)`).join('\n') || '- None';
  let needsCall = failed.map(t => `- **${t.id}**: ${t.prompt} (Failed - Needs manual review)`).join('\n') || '- None';

  const report = `### 📊 Hermes Agentic Status Report

#### What I Did
${whatIDid}

#### What's Left
${whatsLeft}

#### What Needs Your Call
${needsCall}`;

  console.log('\n==================================================');
  console.log('STATUS REPORT OUTPUT:');
  console.log('==================================================');
  console.log(report);
  console.log('==================================================\n');

  // Try to post to Slack if configured
  const botToken = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;

  if (botToken && !botToken.includes('your-bot-token') && appToken && !appToken.includes('your-app-token')) {
    try {
      const app = new App({
        token: botToken,
        appToken: appToken,
        socketMode: true
      });

      const result = await app.client.conversations.list({
        types: 'public_channel,private_channel'
      });
      const channel = result.channels.find(c => c.name === 'sprint-main');
      if (channel) {
        await app.client.chat.postMessage({
          channel: channel.id,
          text: report
        });
        console.log('Status report posted to Slack channel #sprint-main.');
      } else {
        console.warn('Channel #sprint-main not found in Slack workspace.');
      }
    } catch (slackErr) {
      console.error('Could not post to Slack:', slackErr.message);
    }
  } else {
    console.log('Slack not configured or in mock mode. Skipping Slack post.');
  }
}

run();
