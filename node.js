const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const app = express();

app.use(express.json());
app.use(express.static('client'));
app.use('/apps', express.static('apps'));

// In-memory filesystem (persistent across sessions)
let filesystem = {
  '/': { type: 'dir', contents: {} },
  '/home': { type: 'dir', contents: { 'user': { type: 'dir', contents: {} } } },
  '/apps': { type: 'dir', contents: {} },
  '/system': { type: 'dir', contents: {} }
};

// Process manager
let processes = [];
let nextPid = 1;

// File operations
app.post('/fs/:path*', async (req, res) => {
  const fullPath = decodeURIComponent('/' + req.params.path + (req.params[0] || ''));
  const { operation, content, name } = req.body;
  
  try {
    switch (operation) {
      case 'read':
        res.json(readFile(fullPath));
        break;
      case 'write':
        writeFile(fullPath, content);
        res.json({ success: true });
        break;
      case 'mkdir':
        mkdir(fullPath);
        res.json({ success: true });
        break;
      case 'list':
        res.json(listDir(fullPath));
        break;
      case 'delete':
        deleteItem(fullPath);
        res.json({ success: true });
        break;
      default:
        res.status(400).json({ error: 'Invalid operation' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function readFile(path) {
  const parts = path.split('/').filter(Boolean);
  let current = filesystem;
  for (let part of parts) {
    if (!current.contents[part]) throw new Error('File not found');
    current = current.contents[part];
  }
  return current.type === 'file' ? current.content : current.contents;
}

function writeFile(path, content) {
  const parts = path.split('/').filter(Boolean);
  let current = filesystem;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current.contents[parts[i]]) {
      current.contents[parts[i]] = { type: 'dir', contents: {} };
    }
    current = current.contents[parts[i]];
  }
  const filename = parts[parts.length - 1];
  current.contents[filename] = { type: 'file', content, modified: Date.now() };
}

function mkdir(path) {
  const parts = path.split('/').filter(Boolean);
  let current = filesystem;
  for (let part of parts) {
    if (!current.contents[part]) {
      current.contents[part] = { type: 'dir', contents: {} };
    }
    current = current.contents[part];
  }
}

function listDir(path) {
  const parts = path.split('/').filter(Boolean);
  let current = filesystem;
  for (let part of parts) {
    current = current.contents[part];
  }
  return Object.entries(current.contents).map(([name, data]) => ({
    name,
    type: data.type,
    modified: data.modified || 0,
    size: data.type === 'file' ? (data.content?.length || 0) : 0
  }));
}

function deleteItem(path) {
  const parts = path.split('/').filter(Boolean);
  let current = filesystem;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current.contents[parts[i]];
  }
  delete current.contents[parts[parts.length - 1]];
}

// Process management
app.post('/process', (req, res) => {
  const { name, type, url } = req.body;
  const pid = nextPid++;
  processes.push({
    pid,
    name,
    type,
    url,
    status: 'running',
    windows: [],
    started: Date.now()
  });
  res.json({ pid });
});

app.get('/processes', (req, res) => {
  res.json(processes);
});

app.delete('/process/:pid', (req, res) => {
  processes = processes.filter(p => p.pid != req.params.pid);
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('AnuraOS Server running on http://localhost:3000');
});
