import fs from 'fs/promises';
import path from 'path';

const MEMORY_FILE = path.join(process.cwd(), 'data', 'memory.json');

export async function initMemory() {
  const dir = path.dirname(MEMORY_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // Already exists or can't create
  }

  try {
    await fs.access(MEMORY_FILE);
  } catch (err) {
    // File doesn't exist, create it with empty array
    await fs.writeFile(MEMORY_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export async function saveTask(task) {
  await initMemory();
  const content = await fs.readFile(MEMORY_FILE, 'utf-8');
  const tasks = JSON.parse(content);
  
  const existingIdx = tasks.findIndex(t => t.id === task.id);
  if (existingIdx > -1) {
    tasks[existingIdx] = { ...tasks[existingIdx], ...task, updatedAt: new Date().toISOString() };
  } else {
    tasks.push({
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  await fs.writeFile(MEMORY_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  return task;
}

export async function getTasks() {
  await initMemory();
  const content = await fs.readFile(MEMORY_FILE, 'utf-8');
  return JSON.parse(content);
}

export async function getLastTask() {
  const tasks = await getTasks();
  if (tasks.length === 0) return null;
  return tasks[tasks.length - 1];
}
