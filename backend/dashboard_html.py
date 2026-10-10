"""
dashboard_html.py
Standalone web interface for the RowBot backend server.
Serves a responsive control center & API explorer at http://localhost:5000/
"""

BACKEND_DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RowBot Core Engine — Backend Control Center</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><polygon points='50,5 90,27 90,73 50,95 10,73 10,27' fill='%237928ca'/><circle cx='50' cy='50' r='18' fill='%2300f5d4'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #070814;
      --bg-surface: rgba(15, 20, 48, 0.75);
      --bg-card: rgba(20, 27, 65, 0.6);
      --border-glow: rgba(0, 245, 212, 0.25);
      --border-subtle: rgba(147, 129, 255, 0.18);
      --cyan: #00f5d4;
      --violet: #8b5cf6;
      --orchid: #d946ef;
      --amber: #fbbf24;
      --rose: #f43f5e;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      min-height: 100vh;
      line-height: 1.5;
      background-image: 
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.25), transparent),
        radial-gradient(ellipse 60% 40% at 85% 60%, rgba(0, 245, 212, 0.12), transparent),
        radial-gradient(ellipse 50% 50% at 10% 80%, rgba(217, 70, 239, 0.12), transparent);
      background-attachment: fixed;
      padding: 32px 20px 60px;
    }
    .container {
      max-width: 1180px;
      margin: 0 auto;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 32px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      text-decoration: none;
      color: inherit;
    }
    .brand-svg {
      width: 44px;
      height: 44px;
      filter: drop-shadow(0 0 16px rgba(0, 245, 212, 0.6));
      animation: pulse-badge 3s ease-in-out infinite alternate;
    }
    @keyframes pulse-badge {
      0% { filter: drop-shadow(0 0 10px rgba(0, 245, 212, 0.4)); }
      100% { filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.8)); }
    }
    .brand-name {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 30%, var(--cyan) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-sub {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--cyan);
      font-weight: 700;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: blink 2s infinite ease-in-out;
    }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--cyan), var(--violet));
      color: #070814;
      font-weight: 700;
      box-shadow: 0 4px 18px rgba(0, 245, 212, 0.35);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(0, 245, 212, 0.55);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-main);
      border: 1px solid var(--border-subtle);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--border-glow);
    }
    .btn-sm {
      padding: 5px 12px;
      font-size: 12px;
      border-radius: 6px;
    }
    .hero {
      background: var(--bg-surface);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-glow);
      border-radius: 18px;
      padding: 28px 32px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }
    .hero-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }
    .hero-desc {
      color: var(--text-muted);
      font-size: 14px;
      max-width: 600px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 20px;
      transition: all 0.25s ease;
    }
    .stat-card:hover {
      border-color: var(--border-glow);
      transform: translateY(-2px);
    }
    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .stat-val {
      font-size: 26px;
      font-weight: 800;
      color: var(--text-main);
      font-family: 'JetBrains Mono', monospace;
    }
    .stat-sub {
      font-size: 12px;
      color: var(--cyan);
      margin-top: 4px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 18px;
      border-radius: 2px;
      background: linear-gradient(to bottom, var(--cyan), var(--orchid));
    }
    .panel {
      background: var(--bg-surface);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 28px;
    }
    .console-box {
      background: rgba(4, 6, 18, 0.9);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 10px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #a5f3fc;
      max-height: 260px;
      overflow-y: auto;
      white-space: pre-wrap;
      margin-top: 14px;
      line-height: 1.6;
    }
    .actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 8px;
    }
    th, td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    th {
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.8px;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .method-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .method-get { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .method-post { background: rgba(52, 211, 153, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
    .endpoint-path {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-main);
      font-weight: 500;
    }
    .footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <a href="/" class="brand">
        <svg class="brand-svg" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f5d4" />
              <stop offset="50%" stop-color="#8b5cf6" />
              <stop offset="100%" stop-color="#d946ef" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <polygon points="50,5 92,27 92,73 50,95 8,73 8,27" fill="none" stroke="url(#cyberGrad)" stroke-width="4" filter="url(#neonGlow)"/>
          <path d="M30 40 L50 26 L70 40 L70 65 L50 78 L30 65 Z" fill="rgba(139, 92, 246, 0.25)" stroke="#00f5d4" stroke-width="2"/>
          <line x1="36" y1="46" x2="64" y2="46" stroke="#00f5d4" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="36" y1="54" x2="64" y2="54" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="36" y1="62" x2="64" y2="62" stroke="#d946ef" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="50" cy="54" r="5" fill="#00f5d4" filter="url(#neonGlow)"/>
        </svg>
        <div>
          <div class="brand-name">RowBot Core</div>
          <div class="brand-sub">Backend API & Engine Control</div>
        </div>
      </a>
      <div class="header-actions">
        <div class="badge">
          <span class="badge-dot"></span>
          <span>ONLINE · PORT 5000</span>
        </div>
        <a href="http://localhost:5173" target="_blank" class="btn btn-primary">
          Open RowBot App (5173) ↗
        </a>
      </div>
    </header>

    <div class="hero">
      <div>
        <h1 class="hero-title">High-Performance Data Cleaning Backend</h1>
        <p class="hero-desc">RowBot's Flask & Pandas processing engine handles automated profiling, quality scoring, 12+ cleaning transforms, AI command interpretation, and multi-format exports.</p>
      </div>
      <div>
        <button class="btn btn-primary" onclick="initDemoDataset()">⚡ Load Demo Dataset</button>
      </div>
    </div>

    <div class="grid">
      <div class="stat-card">
        <div class="stat-label">API Status</div>
        <div class="stat-val" style="color: #34d399;">200 OK</div>
        <div class="stat-sub">Healthy & Accepting Traffic</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active In-Memory Jobs</div>
        <div class="stat-val" id="jobsCount">0</div>
        <div class="stat-sub" id="jobsSub">Stored in thread-safe memory</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Python Environment</div>
        <div class="stat-val" style="font-size: 20px;">Python 3.13</div>
        <div class="stat-sub">Flask 3.x · Pandas 2.x</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cleaning Pipeline</div>
        <div class="stat-val" style="color: var(--cyan);">12 Transforms</div>
        <div class="stat-sub">Full Undo Stack Supported</div>
      </div>
    </div>

    <div class="panel">
      <div class="section-title">Interactive API Workbench</div>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">Trigger backend operations directly from your browser to inspect real-time JSON responses.</p>
      
      <div class="actions-row">
        <button class="btn btn-secondary btn-sm" onclick="testHealth()">Health Check</button>
        <button class="btn btn-secondary btn-sm" onclick="refreshJobsList()">List Active Jobs</button>
        <button class="btn btn-secondary btn-sm" onclick="initDemoDataset()">Create Demo Job</button>
        <a href="/api/sample" class="btn btn-secondary btn-sm">Download Sample CSV</a>
        <button class="btn btn-secondary btn-sm" onclick="clearConsole()">Clear Output</button>
      </div>

      <div class="console-box" id="consoleOutput">// Click an action above to execute live backend API calls...</div>
    </div>

    <div class="panel">
      <div class="section-title">Active Dataset Jobs in RAM</div>
      <div id="jobsTableContainer">
        <p style="color: var(--text-muted); font-size: 13px;">Loading sessions...</p>
      </div>
    </div>

    <div class="panel">
      <div class="section-title">Available REST Endpoints</div>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Description</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="method-badge method-get">GET</span></td>
            <td class="endpoint-path">/api/health</td>
            <td>Liveness check and service version telemetry</td>
            <td><button class="btn btn-secondary btn-sm" onclick="testHealth()">Run</button></td>
          </tr>
          <tr>
            <td><span class="method-badge method-post">POST</span></td>
            <td class="endpoint-path">/api/upload</td>
            <td>Upload and validate CSV, TSV, or Excel (.xlsx) file</td>
            <td><span style="color: var(--text-muted); font-size: 12px;">Multipart</span></td>
          </tr>
          <tr>
            <td><span class="method-badge method-post">POST</span></td>
            <td class="endpoint-path">/api/demo</td>
            <td>Pre-provisions sample messy dataset for instant profiling</td>
            <td><button class="btn btn-secondary btn-sm" onclick="initDemoDataset()">Run</button></td>
          </tr>
          <tr>
            <td><span class="method-badge method-get">GET</span></td>
            <td class="endpoint-path">/api/jobs</td>
            <td>List active in-memory dataset sessions and summaries</td>
            <td><button class="btn btn-secondary btn-sm" onclick="refreshJobsList()">Run</button></td>
          </tr>
          <tr>
            <td><span class="method-badge method-get">GET</span></td>
            <td class="endpoint-path">/api/jobs/{id}/profile</td>
            <td>Computes 0-100 quality score, issues catalog, and radar data</td>
            <td><span style="color: var(--text-muted); font-size: 12px;">Requires ID</span></td>
          </tr>
          <tr>
            <td><span class="method-badge method-post">POST</span></td>
            <td class="endpoint-path">/api/jobs/{id}/apply</td>
            <td>Executes transformation rule with undo snapshot push</td>
            <td><span style="color: var(--text-muted); font-size: 12px;">Requires Op</span></td>
          </tr>
          <tr>
            <td><span class="method-badge method-post">POST</span></td>
            <td class="endpoint-path">/api/jobs/{id}/assistant</td>
            <td>Natural-language AI copilot command interpreter</td>
            <td><span style="color: var(--text-muted); font-size: 12px;">NL Prompt</span></td>
          </tr>
          <tr>
            <td><span class="method-badge method-get">GET</span></td>
            <td class="endpoint-path">/api/sample</td>
            <td>Direct download of 20-row dirty test CSV</td>
            <td><a href="/api/sample" class="btn btn-secondary btn-sm">Download</a></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      RowBot Autonomous Data Cleaning System · DeepMind Architecture · Hackathon Ready
    </div>
  </div>

  <script>
    const consoleBox = document.getElementById('consoleOutput');

    function logToConsole(title, data) {
      const time = new Date().toLocaleTimeString();
      consoleBox.innerHTML = `// [${time}] ${title}\n` + JSON.stringify(data, null, 2);
    }

    function clearConsole() {
      consoleBox.innerText = '// Console ready.';
    }

    async function testHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        logToConsole('GET /api/health Response (HTTP 200 OK)', data);
      } catch (err) {
        logToConsole('GET /api/health Error', { error: err.message });
      }
    }

    async function refreshJobsList() {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        logToConsole('GET /api/jobs Response', data);
        
        const count = data.jobs ? data.jobs.length : 0;
        document.getElementById('jobsCount').innerText = count;
        document.getElementById('jobsSub').innerText = count === 1 ? '1 active dataset' : `${count} active datasets`;

        renderJobsTable(data.jobs || []);
      } catch (err) {
        logToConsole('GET /api/jobs Error', { error: err.message });
      }
    }

    async function initDemoDataset() {
      try {
        consoleBox.innerText = '// Provisioning sample messy dataset...';
        const res = await fetch('/api/demo', { method: 'POST' });
        const data = await res.json();
        logToConsole('POST /api/demo Created Successfully', data);
        await refreshJobsList();
      } catch (err) {
        logToConsole('POST /api/demo Error', { error: err.message });
      }
    }

    function renderJobsTable(jobs) {
      const container = document.getElementById('jobsTableContainer');
      if (!jobs || jobs.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No active dataset jobs in memory. Click "Create Demo Job" to load one immediately.</p>';
        return;
      }

      let html = `<table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Job ID</th>
            <th>Rows</th>
            <th>Cols</th>
            <th>Quality Score</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>`;

      jobs.forEach(j => {
        const scoreDisplay = j.quality_score ? `${j.quality_score}/100` : 'Pending';
        html += `<tr>
          <td><strong>${j.filename}</strong></td>
          <td style="font-family: monospace; font-size: 12px; color: var(--cyan);">${j.id.slice(0, 8)}...</td>
          <td>${j.row_count}</td>
          <td>${j.col_count}</td>
          <td><span style="color: #34d399; font-weight: 700;">${scoreDisplay}</span></td>
          <td>
            <a href="http://localhost:5173/profile" target="_blank" class="btn btn-primary btn-sm">Inspect in UI ↗</a>
          </td>
        </tr>`;
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    }

    // Auto-load jobs list on page load
    window.addEventListener('DOMContentLoaded', () => {
      refreshJobsList();
    });
  </script>
</body>
</html>
"""
