import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FolderPlus, 
  User, 
  Calendar, 
  Tag, 
  Trash2, 
  Check, 
  Edit3, 
  MoveRight, 
  Briefcase,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function App() {
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState('');
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);

  // Form states
  const [newBoardName, setNewBoardName] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newCardTitles, setNewCardTitles] = useState({}); // listId -> title

  // Modal editing card
  const [editingCard, setEditingCard] = useState(null);

  // Load boards on startup
  useEffect(() => {
    fetchBoards();
  }, []);

  // Load lists and cards when active board changes
  useEffect(() => {
    if (activeBoardId) {
      fetchListsAndCards(activeBoardId);
    }
  }, [activeBoardId]);

  const fetchBoards = async () => {
    try {
      const res = await fetch(`${API_BASE}/boards`);
      const data = await res.json();
      setBoards(data);
      if (data.length > 0) {
        setActiveBoardId(data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching boards:', err);
    }
  };

  const fetchListsAndCards = async (boardId) => {
    try {
      const [listsRes, cardsRes] = await Promise.all([
        fetch(`${API_BASE}/lists?boardId=${boardId}`),
        fetch(`${API_BASE}/cards?boardId=${boardId}`)
      ]);
      const listsData = await listsRes.json();
      const cardsData = await cardsRes.json();
      setLists(listsData);
      setCards(cardsData);
    } catch (err) {
      console.error('Error fetching board contents:', err);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName })
      });
      const data = await res.json();
      setBoards([...boards, data]);
      setActiveBoardId(data._id);
      setNewBoardName('');
    } catch (err) {
      console.error('Error creating board:', err);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim() || !activeBoardId) return;
    try {
      const res = await fetch(`${API_BASE}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName, boardId: activeBoardId })
      });
      const data = await res.json();
      setLists([...lists, data]);
      setNewListName('');
    } catch (err) {
      console.error('Error creating list:', err);
    }
  };

  const handleCreateCard = async (listId) => {
    const title = newCardTitles[listId];
    if (!title || !title.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          description: '',
          listId: listId,
          boardId: activeBoardId,
          tags: [],
          assignee: '',
          dueDate: '',
          position: cards.filter(c => c.listId === listId).length
        })
      });
      const data = await res.json();
      setCards([...cards, data]);
      setNewCardTitles({ ...newCardTitles, [listId]: '' });
    } catch (err) {
      console.error('Error creating card:', err);
    }
  };

  const handleUpdateCard = async (cardId, updates) => {
    try {
      const res = await fetch(`${API_BASE}/cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = await res.json();
      setCards(cards.map(c => c._id === cardId ? updated : c));
      if (editingCard && editingCard._id === cardId) {
        setEditingCard(updated);
      }
    } catch (err) {
      console.error('Error updating card:', err);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    try {
      await fetch(`${API_BASE}/cards/${cardId}`, { method: 'DELETE' });
      setCards(cards.filter(c => c._id !== cardId));
      setEditingCard(null);
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, cardId) => {
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetListId) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    // Check if card is actually changing lists
    const card = cards.find(c => c._id === cardId);
    if (card && card.listId !== targetListId) {
      await handleUpdateCard(cardId, { listId: targetListId });
    }
  };

  const activeBoard = boards.find(b => b._id === activeBoardId);

  return (
    <div className="flex flex-col h-screen max-h-screen text-slate-100 overflow-hidden bg-gradient-to-br from-[#0c1020] via-[#0f172a] to-[#1e1b4b]">
      
      {/* Top Navigation / Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg text-white shadow-lg shadow-indigo-500/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
              Forge Board <span className="ml-2 text-xs py-0.5 px-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">Edition 1</span>
            </h1>
            <p className="text-xs text-slate-400">Collaborative Multi-Agent Kanban</p>
          </div>
        </div>

        {/* Board Selection and Board Creation */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-slate-950/60 border border-slate-800 rounded-lg p-1">
            <span className="text-xs text-slate-400 px-2 font-medium">BOARDS:</span>
            <select 
              value={activeBoardId} 
              onChange={(e) => setActiveBoardId(e.target.value)}
              className="bg-transparent text-sm text-white font-semibold py-1 px-2 focus:outline-none cursor-pointer"
            >
              {boards.map(b => (
                <option key={b._id} value={b._id} className="bg-slate-900 text-white">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleCreateBoard} className="flex items-center space-x-2">
            <input 
              type="text" 
              placeholder="New Board..."
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              className="bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none text-white w-40 placeholder-slate-500"
            />
            <button 
              type="submit"
              className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
              title="Add Board"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Board View */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex flex-row items-start space-x-6">
        {lists.map(list => {
          const listCards = cards.filter(c => c.listId === list._id);
          return (
            <div 
              key={list._id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, list._id)}
              className="w-80 flex-shrink-0 bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 flex flex-col max-h-[85vh] backdrop-blur-sm"
            >
              {/* List Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-base tracking-wide flex items-center">
                  {list.name}
                  <span className="ml-2 py-0.5 px-2 bg-slate-800/80 rounded-full text-xs font-semibold text-slate-400">
                    {listCards.length}
                  </span>
                </h3>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                {listCards.map(card => (
                  <div
                    key={card._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card._id)}
                    onClick={() => setEditingCard(card)}
                    className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 hover:bg-slate-950 rounded-lg cursor-pointer transition-all duration-200 shadow-md group relative hover:-translate-y-0.5"
                  >
                    <h4 className="font-semibold text-white text-sm mb-2 group-hover:text-indigo-400 transition-colors">
                      {card.title}
                    </h4>

                    {card.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {card.description}
                      </p>
                    )}

                    {/* Metadata: Assignee, DueDate, Tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-900">
                      {card.assignee && (
                        <div className="flex items-center space-x-1 text-[11px] text-slate-400 bg-slate-900 py-0.5 px-1.5 rounded-full border border-slate-800/50">
                          <User className="w-3 h-3 text-indigo-400" />
                          <span>{card.assignee}</span>
                        </div>
                      )}
                      
                      {card.dueDate && (
                        <div className="flex items-center space-x-1 text-[11px] text-slate-400 bg-slate-900 py-0.5 px-1.5 rounded-full border border-slate-800/50">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          <span>{card.dueDate}</span>
                        </div>
                      )}

                      {card.tags && card.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase font-bold tracking-wider py-0.5 px-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Card Form */}
              <div className="mt-4 pt-2 border-t border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    placeholder="New Card title..."
                    value={newCardTitles[list._id] || ''}
                    onChange={(e) => setNewCardTitles({ ...newCardTitles, [list._id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCard(list._id)}
                    className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <button 
                    onClick={() => handleCreateCard(list._id)}
                    className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 rounded-lg text-indigo-400 hover:text-white transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}

        {/* Add List Form */}
        <form onSubmit={handleCreateList} className="w-80 flex-shrink-0 bg-slate-900/20 border border-slate-800/40 border-dashed hover:border-indigo-500/40 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 transition-colors backdrop-blur-xs">
          <FolderPlus className="w-8 h-8 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-400">Add New Column</h4>
          <div className="flex items-center space-x-2 w-full">
            <input 
              type="text" 
              placeholder="Column Name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="flex-1 bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none w-full"
            />
            <button 
              type="submit"
              className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </main>

      {/* Card Details Editor Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950 border border-indigo-900/50 py-0.5 px-2 rounded-full">
                  Card Editor
                </span>
                <input 
                  type="text" 
                  value={editingCard.title}
                  onChange={(e) => handleUpdateCard(editingCard._id, { title: e.target.value })}
                  className="bg-transparent font-bold text-lg text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none w-full mt-2"
                />
              </div>
              <button 
                onClick={() => setEditingCard(null)}
                className="text-slate-400 hover:text-white text-xl font-bold bg-slate-800 hover:bg-slate-700/80 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                <textarea 
                  value={editingCard.description}
                  onChange={(e) => handleUpdateCard(editingCard._id, { description: e.target.value })}
                  placeholder="Enter detailed description here..."
                  rows="3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Assignee & Due Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center">
                    <User className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Assignee
                  </label>
                  <input 
                    type="text" 
                    value={editingCard.assignee || ''}
                    onChange={(e) => handleUpdateCard(editingCard._id, { assignee: e.target.value })}
                    placeholder="Assign to..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Due Date
                  </label>
                  <input 
                    type="date" 
                    value={editingCard.dueDate || ''}
                    onChange={(e) => handleUpdateCard(editingCard._id, { dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center">
                  <Tag className="w-3.5 h-3.5 mr-1 text-amber-400" /> Tags (comma separated)
                </label>
                <input 
                  type="text" 
                  value={editingCard.tags ? editingCard.tags.join(', ') : ''}
                  onChange={(e) => {
                    const tagArr = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    handleUpdateCard(editingCard._id, { tags: tagArr });
                  }}
                  placeholder="e.g. Frontend, API, Design"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Column Selection (Move Card) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center">
                  <MoveRight className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Move Column
                </label>
                <select 
                  value={editingCard.listId}
                  onChange={(e) => handleUpdateCard(editingCard._id, { listId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {lists.map(list => (
                    <option key={list._id} value={list._id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-800">
              <button 
                onClick={() => handleDeleteCard(editingCard._id)}
                className="flex items-center space-x-1.5 py-2 px-3 bg-red-950 hover:bg-red-900 border border-red-900/50 hover:border-red-700/60 text-red-200 hover:text-white rounded-lg text-xs font-bold transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Card</span>
              </button>

              <button 
                onClick={() => setEditingCard(null)}
                className="flex items-center space-x-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Close</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
