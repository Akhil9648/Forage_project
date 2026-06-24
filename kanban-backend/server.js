import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory Fallback Database
let isMongoDbConnected = false;
let memoryDb = {
  boards: [
    { _id: 'b1', name: 'Product Roadmap' },
    { _id: 'b2', name: 'Sprint Board' }
  ],
  lists: [
    { _id: 'l1', name: 'To Do', boardId: 'b1' },
    { _id: 'l2', name: 'In Progress', boardId: 'b1' },
    { _id: 'l3', name: 'Done', boardId: 'b1' }
  ],
  cards: [
    { _id: 'c1', title: 'Setup Repo', description: 'Initialize Hermes and OpenClaw agents.', listId: 'l1', boardId: 'b1', tags: ['Backend'], assignee: 'Hermes', dueDate: '2026-06-25', position: 0 },
    { _id: 'c2', title: 'Slack Setup', description: 'Create Slack App and configure scopes.', listId: 'l2', boardId: 'b1', tags: ['Config'], assignee: 'Akhil', dueDate: '2026-06-26', position: 1 }
  ]
};

// MongoDB Mongoose Schemas
const BoardSchema = new mongoose.Schema({ name: String });
const ListSchema = new mongoose.Schema({ name: String, boardId: String });
const CardSchema = new mongoose.Schema({
  title: String,
  description: String,
  listId: String,
  boardId: String,
  tags: [String],
  assignee: String,
  dueDate: String,
  position: Number
});

const Board = mongoose.models.Board || mongoose.model('Board', BoardSchema);
const List = mongoose.models.List || mongoose.model('List', ListSchema);
const Card = mongoose.models.Card || mongoose.model('Card', CardSchema);

// Connect to MongoDB Atlas if URI is provided
const mongoUri = process.env.MONGODB_URI;
if (mongoUri && !mongoUri.includes('your-mongodb-uri')) {
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('🔌 Connected to MongoDB Atlas successfully.');
      isMongoDbConnected = true;
    })
    .catch(err => {
      console.error('⚠️  Failed to connect to MongoDB Atlas. Falling back to In-Memory DB:', err.message);
    });
} else {
  console.log('ℹ️  No MONGODB_URI configured. Running backend in In-Memory Mode.');
}

// REST API Endpoints

// 1. BOARDS
app.get('/api/boards', async (req, res) => {
  try {
    if (isMongoDbConnected) {
      const boards = await Board.find();
      // Seed if empty
      if (boards.length === 0) {
        const seed = await Board.insertMany([{ name: 'Product Roadmap' }, { name: 'Sprint Board' }]);
        return res.json(seed);
      }
      return res.json(boards);
    } else {
      return res.json(memoryDb.boards);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/boards', async (req, res) => {
  try {
    const { name } = req.body;
    if (isMongoDbConnected) {
      const board = new Board({ name });
      await board.save();
      res.status(201).json(board);
    } else {
      const board = { _id: `b_${Date.now()}`, name };
      memoryDb.boards.push(board);
      res.status(201).json(board);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. LISTS
app.get('/api/lists', async (req, res) => {
  const { boardId } = req.query;
  try {
    if (isMongoDbConnected) {
      const lists = await List.find({ boardId });
      return res.json(lists);
    } else {
      return res.json(memoryDb.lists.filter(l => l.boardId === boardId));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lists', async (req, res) => {
  try {
    const { name, boardId } = req.body;
    if (isMongoDbConnected) {
      const list = new List({ name, boardId });
      await list.save();
      res.status(201).json(list);
    } else {
      const list = { _id: `l_${Date.now()}`, name, boardId };
      memoryDb.lists.push(list);
      res.status(201).json(list);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CARDS
app.get('/api/cards', async (req, res) => {
  const { boardId } = req.query;
  try {
    if (isMongoDbConnected) {
      const cards = await Card.find({ boardId });
      return res.json(cards);
    } else {
      return res.json(memoryDb.cards.filter(c => c.boardId === boardId));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cards', async (req, res) => {
  try {
    const cardData = req.body; // title, description, listId, boardId, tags, assignee, dueDate, position
    if (isMongoDbConnected) {
      const card = new Card(cardData);
      await card.save();
      res.status(201).json(card);
    } else {
      const card = { _id: `c_${Date.now()}`, ...cardData };
      memoryDb.cards.push(card);
      res.status(201).json(card);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cards/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (isMongoDbConnected) {
      const card = await Card.findByIdAndUpdate(id, updates, { new: true });
      if (!card) return res.status(404).json({ error: 'Card not found' });
      res.json(card);
    } else {
      const cardIdx = memoryDb.cards.findIndex(c => c._id === id);
      if (cardIdx === -1) return res.status(404).json({ error: 'Card not found' });
      memoryDb.cards[cardIdx] = { ...memoryDb.cards[cardIdx], ...updates };
      res.json(memoryDb.cards[cardIdx]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (isMongoDbConnected) {
      const card = await Card.findByIdAndDelete(id);
      if (!card) return res.status(404).json({ error: 'Card not found' });
      res.json({ message: 'Card deleted successfully' });
    } else {
      const cardIdx = memoryDb.cards.findIndex(c => c._id === id);
      if (cardIdx === -1) return res.status(404).json({ error: 'Card not found' });
      memoryDb.cards.splice(cardIdx, 1);
      res.json({ message: 'Card deleted successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Kanban API server running on port ${PORT}`);
});

export default app;

