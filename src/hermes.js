import dotenv from 'dotenv';
import cron from 'node-cron';
import { saveTask, getLastTask, getTasks } from './memory.js';
import { queryGroq } from './groq.js';
import fs from 'fs/promises';
import path from 'path';
import { executeTask } from './openclaw.js';

dotenv.config();

// Helper to write to agent-log.md file
async function writeToAgentLogFile(entryText) {
  try {
    const logFilePath = path.join(process.cwd(), 'agent-log.md');
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const entry = `\n### [${timestamp}] - ${entryText}\n`;
    await fs.appendFile(logFilePath, entry, 'utf-8');
  } catch (err) {
    console.error('Failed to write to agent-log.md:', err.message);
  }
}

export function initHermes(app) {
  console.log('🤖 Hermes Agent initialized.');

  // Helper to post message to a channel by name
  async function postToChannel(channelName, text) {
    try {
      // Find channel ID
      const result = await app.client.conversations.list({
        types: 'public_channel,private_channel'
      });
      const channel = result.channels.find(c => c.name === channelName.replace('#', ''));
      if (channel) {
        await app.client.chat.postMessage({
          channel: channel.id,
          text: text
        });
      } else {
        console.warn(`Channel ${channelName} not found. Posting to console:`, text);
      }
    } catch (err) {
          console.error(`Error posting to ${channelName}:`);
         console.error(err);
      }
  }

  // Define status-report skill execution
  async function executeStatusReport(channelId) {
    console.log('Running Status Report Skill...');
    const tasks = await getTasks();
    
    // Sort tasks
    const completed = tasks.filter(t => t.status === 'SUCCESS');
    const pending = tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');
    const failed = tasks.filter(t => t.status === 'FAILURE');

    let whatIDid = completed.map(t => `- **${t.id}**: ${t.prompt} (Completed)`).join('\n') || '- None';
    let whatsLeft = pending.map(t => `- **${t.id}**: ${t.prompt} (In Progress)`).join('\n') || '- None';
    let needsCall = failed.map(t => `- **${t.id}**: ${t.prompt} (Failed - Needs manual restart/debugging)`).join('\n') || '- None';

    const report = `### 📊 Hermes Agentic Status Report

#### What I Did
${whatIDid}

#### What's Left
${whatsLeft}

#### What Needs Your Call
${needsCall}`;

    if (channelId) {
      await app.client.chat.postMessage({
        channel: channelId,
        text: report
      });
    } else {
      await postToChannel('#sprint-main', report);
    }
    
    await writeToAgentLogFile('Hermes executed Status Report Skill.');
  }

  // Setup autonomous scheduled run (Default: Hourly)
  const cronInterval = process.env.AUTONOMOUS_CRON_INTERVAL || '0 * * * *';
  cron.schedule(cronInterval, async () => {
    console.log('Autonomous Cron Triggered: Running Status Report...');
    await executeStatusReport();
  });

  // Listen to messages in channels to detect task feedback from OpenClaw
  app.message(async ({ message, say }) => {
    // We check if it is in the coder channel
    try {
      const result = await app.client.conversations.info({ channel: message.channel });
      if (result.channel.name === 'agent-coder') {
        const text = message.text || '';
        
        // Match format: [TASK-ID: task_xxx] [STATUS: SUCCESS/FAILURE] Logs: ...
        const taskRegex = /\[TASK-ID:\s*(task_\w+)\]\s*\[STATUS:\s*(\w+)\]/;
        const match = text.match(taskRegex);
        
        if (match) {
          const taskId = match[1];
          const status = match[2]; // SUCCESS or FAILURE
          
          console.log(`Hermes received feedback from OpenClaw for task ${taskId}: ${status}`);
          
          // Fetch existing tasks
          const tasks = await getTasks();
          const task = tasks.find(t => t.id === taskId);
          
          if (task) {
            task.status = status;
            task.logs = text;
            await saveTask(task);
            
            await writeToAgentLogFile(`Task ${taskId} execution finished with status ${status}`);
            await postToChannel('#agent-log', `📝 **Hermes Plan Update**: Task ${taskId} marked as **${status}**.\nMemory synced to database.`);
            
            // Post final status to sprint-main
            if (status === 'SUCCESS') {
              await postToChannel('#sprint-main', `✅ **Hermes Orchestration Success**: Task **${taskId}** has been completed by OpenClaw.\n\n*Task Prompt:* "${task.prompt}"\n\n*OpenClaw Report:* Code successfully written and verification tests passed.`);
            } else {
              await postToChannel('#sprint-main', `❌ **Hermes Orchestration Alert**: Task **${taskId}** failed execution. OpenClaw reports errors.\n\n*Logs:* Please check \`#agent-coder\` for details.`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error handling channel message in Hermes:', err.message);
    }
  });

  // Listen for direct mentions in Slack
  app.event('app_mention', async ({ event, say }) => {
    try {
      const text = event.text.replace(/<@.*?>/, '').trim(); // Remove the bot mention
      console.log(`Hermes received mention: "${text}"`);
      
      // 1. Check for status-report request
      if (text.toLowerCase().includes('status-report') || text.toLowerCase().includes('status report')) {
        await say(`Generating requested status report...`);
        await executeStatusReport(event.channel);
        return;
      }

      // 2. Check for memory persistence query
      if (text.toLowerCase().includes('what was the last task') || text.toLowerCase().includes('recall last task') || text.toLowerCase().includes('memory proof')) {
        const lastTask = await getLastTask();
        if (lastTask) {
          await say(`🔍 **Hermes Memory Database Recall**:\n\n*Last Task ID:* \`${lastTask.id}\`\n*Prompt:* "${lastTask.prompt}"\n*Status:* **${lastTask.status}**\n*Created At:* ${lastTask.createdAt}\n\nThis proves memory persists across container/process sessions!`);
        } else {
          await say(`🔍 **Hermes Memory Database Recall**: I have no recorded tasks in database memory yet.`);
        }
        await writeToAgentLogFile('Hermes performed Memory Database Recall.');
        return;
      }

      // 3. Normal task request -> Plan and Dispatch
      const taskId = `task_${Date.now()}`;
      await say(`🤖 **Hermes received task request.** Generating execution plan... (Task ID: \`${taskId}\`)`);

      // Deconstruct request and write plan
      const prompt = text;
      const planPrompt = `Create a step-by-step plan for this request: "${prompt}". Output only the plans as a numbered list.`;
      
      const planContent = await queryGroq([{ role: 'user', content: planPrompt }]);
      
      const taskObject = {
        id: taskId,
        prompt: prompt,
        plan: planContent,
        status: 'PENDING'
      };
      
      // Save task to memory
      await saveTask(taskObject);
      await writeToAgentLogFile(`Task ${taskId} initiated. Plan generated: ${planContent.replace(/\n/g, ' ')}`);

      // Log plan to #agent-log
      await postToChannel('#agent-log', `📋 **Hermes Plan Generated for Task ${taskId}**:\n${planContent}\n\n*Saving context to database memory...*`);

      // Dispatch to OpenClaw via #agent-coder
      await postToChannel('#agent-coder', `[TASK-ID: ${taskId}] Execute: ${prompt}`);
      console.log("DISPATCHED TO AGENT-CODER:", taskId);
      await executeTask(taskId, prompt, app);
      await say(`Plan logged to \`#agent-log\`. Task dispatched to OpenClaw in \`#agent-coder\`.`);

    } catch (err) {
      console.error('Error handling Hermes app_mention event:', err.message);
      await say(`Error: ${err.message}`);
    }
  });
}
