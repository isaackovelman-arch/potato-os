class AnuraOS {
  constructor() {
    this.currentPath = '/home/user/Desktop';
    this.windows = new Map();
    this.fs = new FileSystemAPI();
    this.processes = [];
    this.init();
  }

  async init() {
    this.renderTime();
    this.setupDock();
    this.setupTaskbar();
    this.setupContextMenu();
    this.loadDesktop();
    setInterval(() => this.renderTime(), 1000);
  }

  async loadDesktop() {
    const files = await this.fs.list(this.currentPath);
    const desktopIcons = document.querySelector('#desktop');
    desktopIcons.innerHTML = '<div class="wallpaper"></div>';
    
    files.forEach(file => {
      const icon = this.createIcon(file);
      desktopIcons.appendChild(icon);
    });
  }

  createIcon(file) {
    const div = document.createElement('div');
    div.className = `icon ${file.type}`;
    div.dataset.path = this.currentPath + '/' + file.name;
    div.innerHTML = `
      <div class="icon-image">${this.getIcon(file.type)}</div>
      <div class="icon-label">${file.name}</div>
    `;
    div.addEventListener('dblclick', () => this.openFile(file));
    div.addEventListener('contextmenu', (e) => this.showContextMenu(e, file));
    return div;
  }

  getIcon(type) {
    const icons = {
      'dir': '📁',
      'file': '📄',
      'app': '⚡',
      'image': '🖼️',
      'text': '📝'
    };
    return icons[type] || '📄';
  }

  async openFile(file) {
    if (file.type === 'dir') {
      this.openFileManager(file.name);
    } else if (file.type === 'app') {
      this.launchApp(file.name);
    } else {
      this.openTextEditor(file.name);
    }
  }

  openFileManager(path) {
    const winId = `fm-${Date.now()}`;
    const window = this.createWindow('File Manager', winId);
    window.innerHTML = FileManager.render(path);
    this.windows.set(winId, { type: 'filemanager', path });
  }

  launchApp(appName) {
    fetch('/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: appName, type: 'app', url: `/apps/${appName}/index.html` })
    });
    
    const winId = `app-${appName}-${Date.now()}`;
    const iframe = document.createElement('iframe');
    iframe.src = `/apps/${appName}/index.html`;
    iframe.className = 'app-frame';
    
    const window = this.createWindow(appName, winId);
    window.appendChild(iframe);
    this.windows.set(winId, { type: 'app', appName });
  }

  createWindow(title, id) {
    const container = document.getElementById('windows-container');
    const window = document.createElement('div');
    window.className = 'window';
    window.id = id;
    window.dataset.draggable = true;
    window.innerHTML = `
      <div class="window-header">
        <span class="window-controls">
          <span class="control minimize" title="Minimize">−</span>
          <span class="control maximize" title="Maximize">□</span>
          <span class="control close" title="Close">×</span>
        </span>
        <div class="window-title">${title}</div>
      </div>
      <div class="window-content"></div>
    `;
    
    container.appendChild(window);
    this.makeDraggable(window);
    this.bindWindowControls(window);
    return window.querySelector('.window-content');
  }

  setupDock() {
    document.querySelectorAll('.dock-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const app = e.currentTarget.dataset.app;
        this.launchDockApp(app);
      });
    });
  }

  launchDockApp(app) {
    const apps = {
      terminal: () => this.openTerminal(),
      browser: () => this.openBrowser(),
      files: () => this.openFileManager('/'),
      notepad: () => this.openTextEditor(),
      settings: () => this.openSettings()
    };
    apps[app]?.();
  }

  openTerminal() {
    const winId = `terminal-${Date.now()}`;
    const term = Terminal.create();
    const window = this.createWindow('Terminal', winId);
    window.appendChild(term);
  }
}

class FileSystemAPI {
  async list(path) {
    const res = await fetch(`/fs${path}?operation=list`, { method: 'POST' });
    return res.json();
  }

  async read(path) {
    const res = await fetch(`/fs${path}?operation=read`, { method: 'POST' });
    return res.json();
  }

  async write(path, content) {
    await fetch(`/fs${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'write', content })
    });
  }
}

// Terminal Emulator
class Terminal {
  static create() {
    const term = document.createElement('div');
    term.className = 'terminal';
    term.innerHTML = `
      <div class="terminal-header">anura@os:~$</div>
      <div class="terminal-output"></div>
      <div class="terminal-input-line">
        <span class="prompt">anura@os:~$ </span>
        <input type="text" class="terminal-input" autocomplete="off">
      </div>
    `;
    
    const input = term.querySelector('.terminal-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const command = input.value;
        Terminal.execute(command, term);
        input.value = '';
      }
    });
    
    return term;
  }

  static async execute(command, term) {
    const output = term.querySelector('.terminal-output');
    output.innerHTML += `<div class="cmd">${command}</div>`;
    
    if (command === 'ls') {
      output.innerHTML += '<div class="output">Desktop  Documents  apps  system</div>';
    } else if (command === 'pwd') {
      output.innerHTML += '<div class="output">/home/user/Desktop</div>';
    } else if (command.startsWith('cat ')) {
      output.innerHTML += '<div class="output">Hello, AnuraOS!</div>';
    } else {
      output.innerHTML += `<div class="output">command not found: ${command}</div>`;
    }
    
    term.scrollTop = term.scrollHeight;
  }
}

// Initialize OS
document.addEventListener('DOMContentLoaded', () => {
  window.anuraOS = new AnuraOS();
});
