import fs from 'fs/promises';
import path from 'path';
import { initMemory, saveTask, getTasks, getLastTask } from '../src/memory.js';

async function runTests() {
  console.log('🧪 Starting Multi-Agent Orchestrator Self-Validation Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Configuration load
  try {
    const pkgContent = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgContent);
    assert(pkg.name === 'forge2-agent-orchestrator', 'package.json contains correct name');
  } catch (err) {
    assert(false, `package.json check failed: ${err.message}`);
  }

  // Test 2: Database Memory persistence
  try {
    await initMemory();
    const testTaskId = `test_task_${Date.now()}`;
    const testTask = {
      id: testTaskId,
      prompt: 'test multiply function',
      status: 'PENDING',
      plan: '1. write multiply.js\n2. run node multiply.js'
    };
    
    await saveTask(testTask);
    const tasks = await getTasks();
    const loadedTask = tasks.find(t => t.id === testTaskId);
    assert(loadedTask && loadedTask.prompt === 'test multiply function', 'memory saves and retrieves tasks');

    const lastTask = await getLastTask();
    assert(lastTask && lastTask.id === testTaskId, 'getLastTask returns the most recent task');
  } catch (err) {
    assert(false, `Memory database persistence failed: ${err.message}`);
  }

  // Test 3: Groq API Key and Connection validation
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey || groqKey.includes('your-groq-key')) {
      console.log(`⚠️  WARNING: GROQ_API_KEY is not configured or is set to default placeholder in your .env file.`);
    } else {
      console.log('Validating connection to Groq API Cloud...');
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${groqKey}` }
      }).catch(() => null);

      if (response && response.ok) {
        console.log(`✅ INFO: Groq API connection validated successfully.`);
      } else {
        console.log(`⚠️  WARNING: Failed to authenticate with Groq API. Please verify that your GROQ_API_KEY is valid.`);
      }
    }
  } catch (err) {
    console.log(`⚠️  WARNING: Groq API endpoint connection failed: ${err.message}`);
  }

  console.log(`\n==================================================`);
  console.log(`Validation Completed. Passed: ${passed}, Failed: ${failed}`);
  console.log(`==================================================`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
