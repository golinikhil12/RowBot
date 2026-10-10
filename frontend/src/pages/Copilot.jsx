import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJob } from '../contexts/JobContext';
import {
  sendInstruction, getExamples, applyOperation,
  getGeminiStatus, setGeminiConfig, chatWithGemini, getGeminiAutoRecipe
} from '../services/api';
import toast from 'react-hot-toast';
import {
  Wand2, Send, AlertTriangle, CheckCircle, Zap, Sparkles,
  Settings, Key, ExternalLink, X, ShieldCheck, ArrowRight
} from 'lucide-react';

function BotMsg({ children, isGemini = false, model = null }) {
  return (
    <div className={`chat-msg bot ${isGemini ? 'gemini-bubble' : ''}`}>
      <div className="chat-avatar" style={{ fontSize: isGemini ? '1.2rem' : '1rem' }}>
        {isGemini ? '✨' : '🤖'}
      </div>
      <div className="chat-bubble">
        {isGemini && (
          <div className="gemini-response-header">
            <span className="gemini-response-tag">
              <Sparkles size={13} />
              <span>Google Gemini {model || '1.5 Flash'}</span>
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function UserMsg({ children }) {
  return (
    <div className="chat-msg user">
      <div className="chat-avatar">👤</div>
      <div className="chat-bubble">{children}</div>
    </div>
  );
}

const WELCOME = `Hi! I'm your Google Gemini AI Data Cleaning assistant for RowBot.

I can translate plain-English instructions into validated Pandas operations, or provide architectural advice for cleaning your dataset.

Try asking me:
• "Analyze my dataset and suggest a cleaning strategy"
• "Standardize all dates to YYYY-MM-DD"
• "Remove duplicate rows and trim extra spaces"
• "Fill missing numeric values with column medians"`;

export default function Copilot() {
  const navigate = useNavigate();
  const { jobId, jobMeta, score, setScore, setOperationLog } = useJob();
  const [messages, setMessages] = useState([{ role: 'bot', content: WELCOME, isGemini: true }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [examples, setExamples] = useState([]);
  const [pendingOp, setPendingOp] = useState(null);
  const [geminiConfig, setGeminiConfigState] = useState({
    configured: false,
    model: 'gemini-1.5-flash',
    masked_key: '',
    supported_models: ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [savingKey, setSavingKey] = useState(false);
  const bottomRef = useRef(null);

  // Load Gemini status and command examples
  useEffect(() => {
    getGeminiStatus()
      .then(({ data }) => {
        setGeminiConfigState(data);
        if (data.model) setSelectedModel(data.model);
      })
      .catch(() => {});

    getExamples()
      .then(({ data }) => setExamples(data.examples || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!jobId) return (
    <div className="empty-state">
      <div className="empty-state-icon">✨</div>
      <div className="empty-state-title">No dataset loaded</div>
      <div className="empty-state-desc" style={{ marginBottom: 16 }}>
        Upload a file or launch a demo dataset to start chatting with Google Gemini.
      </div>
      <button className="btn btn-primary" onClick={() => navigate('/upload')}>
        Upload File
      </button>
    </div>
  );

  const addMsg = (role, content, isGemini = false, model = null) =>
    setMessages(prev => [...prev, { role, content, isGemini, model, id: Date.now() }]);

  // Handle saving API key and model config
  const handleSaveGeminiConfig = async () => {
    setSavingKey(true);
    try {
      const { data } = await setGeminiConfig(apiKeyInput, selectedModel);
      if (data.ok) {
        setGeminiConfigState(data.config);
        setShowConfigModal(false);
        setApiKeyInput('');
        toast.success(`Google Gemini configured with ${data.config.model}!`);
      }
    } catch (e) {
      toast.error('Failed to update Gemini settings.');
    } finally {
      setSavingKey(false);
    }
  };

  // Main instruction dispatcher
  const sendMsg = async (text = input) => {
    const instruction = text.trim();
    if (!instruction || loading) return;
    setInput('');
    addMsg('user', instruction);
    setLoading(true);

    const isConversational = (
      instruction.toLowerCase().startsWith('analyze') ||
      instruction.toLowerCase().startsWith('explain') ||
      instruction.toLowerCase().startsWith('why') ||
      instruction.toLowerCase().startsWith('how') ||
      instruction.toLowerCase().startsWith('suggest') ||
      instruction.toLowerCase().includes('strategy')
    );

    try {
      if (isConversational && geminiConfig.configured) {
        // Send to conversational chatWithGemini
        const { data } = await chatWithGemini(jobId, instruction, null, selectedModel);
        if (data.ok) {
          addMsg('bot', (
            <div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.88rem', color: '#1e293b' }}>
                {data.reply}
              </div>
              {data.suggested_actions?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                    Proposed Cleaning Actions:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.suggested_actions.map((act, idx) => (
                      <div key={idx} className="gemini-action-card">
                        <div className="gemini-action-info">
                          <div><strong>{act.title || act.op}</strong></div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{act.instruction}</div>
                        </div>
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => sendMsg(act.instruction)}
                        >
                          Run Step →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ), true, data.model);
        } else {
          toast.error(data.error || 'Gemini conversational request failed.');
        }
      } else {
        // Send to instruction parser
        const { data } = await sendInstruction(jobId, instruction, null, selectedModel);

        if (!data.ok) {
          addMsg('bot', (
            <div>
              <div style={{ marginBottom: 8 }}>
                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: '#f59e0b' }} />
                {data.error}
              </div>
              {data.suggestions?.length > 0 && (
                <div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    {data.note || 'Try one of these allowlisted commands:'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'flex-start', color: '#845162' }}
                        onClick={() => sendMsg(s)}
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ), data.ai_mode === 'gemini', data.model);
        } else {
          const { parsed, preview } = data;
          setPendingOp(data.operation);

          addMsg('bot', (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <CheckCircle size={14} style={{ color: '#059669' }} />
                <strong>Operation Identified</strong>
                <span className={`badge ${data.ai_mode === 'gemini' ? 'badge-success' : 'badge-info'}`}>
                  {data.ai_mode === 'gemini' ? `✨ Google Gemini (${data.model})` : 'Deterministic Rule'}
                </span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Action:</strong> {parsed.description}
              </div>
              {parsed.reasoning && (
                <div style={{ fontSize: '.78rem', color: '#64748b', fontStyle: 'italic', marginBottom: 8 }}>
                  💡 Gemini Reasoning: {parsed.reasoning}
                </div>
              )}
              {parsed.columns_detected?.length > 0 && (
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Targeting columns: <strong>{parsed.columns_detected.join(', ')}</strong>
                </div>
              )}
              {preview && (
                <div style={{ marginBottom: 12, fontSize: '.82rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Preview Analysis:</div>
                  <div className="alert alert-info" style={{ padding: '6px 12px', fontSize: '.8rem' }}>
                    Will transform <strong>{preview.rows_affected?.toLocaleString()}</strong> rows/cells.
                  </div>
                  {preview.sample_changes?.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginTop: 4, fontFamily: 'monospace', fontSize: '.76rem' }}>
                      <span style={{ color: '#94a3b8' }}>{c.column}:</span>
                      <span style={{ color: '#f43f5e' }}>"{c.before}"</span>
                      <span>→</span>
                      <span style={{ color: '#22c55e' }}>"{c.after}"</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => applyPending(data.operation, parsed.description)}
                  id="copilot-apply-btn"
                >
                  ✓ Apply Operation
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setPendingOp(null); addMsg('bot', 'Operation cancelled.'); }}
                >
                  ✕ Cancel
                </button>
              </div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
                ℹ️ {data.disclosure}
              </div>
            </div>
          ), data.ai_mode === 'gemini', data.model);
        }
      }
    } catch (e) {
      addMsg('bot', `Error: ${e.response?.data?.error || 'Something went wrong.'}`);
    } finally {
      setLoading(false);
    }
  };

  const applyPending = async (operation, label) => {
    setPendingOp(null);
    try {
      const { data } = await applyOperation(jobId, operation);
      if (data.ok) {
        setOperationLog(prev => [...prev, data.log_entry]);
        setScore(data.score);
        addMsg('bot', (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <CheckCircle size={14} style={{ color: '#059669' }} />
              <strong>Applied Successfully:</strong> {label}
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
              {data.log_entry.rows_affected.toLocaleString()} rows updated · Revised quality score: <strong>{data.score?.score}/100</strong> (Grade {data.score?.grade}).
            </div>
          </div>
        ), true);
        toast.success(`Applied: ${label}`);
      }
    } catch (e) {
      addMsg('bot', `Failed to apply: ${e.response?.data?.error || 'Unknown error.'}`);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  return (
    <div className="animate-fadeInUp">
      {/* ── 1. Google Gemini Header Banner ── */}
      <div className="gemini-header-banner">
        <div className="gemini-branding">
          <div className="gemini-sparkle-icon">✨</div>
          <div>
            <div className="gemini-title">
              Google Gemini
              <span className="gemini-model-badge">{geminiConfig.model}</span>
            </div>
            <div className="gemini-tagline">
              Natural language intent translated to deterministic, allowlisted data cleaning operations
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className={`gemini-status-pill ${geminiConfig.configured ? 'active' : 'inactive'}`}
            onClick={() => setShowConfigModal(true)}
            title="Click to configure Google Gemini settings"
          >
            <Sparkles size={13} />
            <span>
              {geminiConfig.configured
                ? `Google Gemini Active (${geminiConfig.masked_key})`
                : 'Configure Gemini API Key'}
            </span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowConfigModal(true)}
            style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)' }}
          >
            <Settings size={14} /> Settings
          </button>
        </div>
      </div>

      {/* ── 2. Gemini Quick Action Prompt Chips ── */}
      <div className="gemini-chips-row">
        <button
          className="gemini-prompt-chip"
          onClick={() => sendMsg('Analyze my dataset quality and suggest an optimal cleaning strategy')}
        >
          ✨ Analyze Quality & Strategy
        </button>
        <button
          className="gemini-prompt-chip"
          onClick={() => sendMsg('Standardize all dates to YYYY-MM-DD')}
        >
          📅 Standardize Dates
        </button>
        <button
          className="gemini-prompt-chip"
          onClick={() => sendMsg('Trim whitespace from all text columns')}
        >
          ✂️ Trim Whitespace
        </button>
        <button
          className="gemini-prompt-chip"
          onClick={() => sendMsg('Remove duplicate rows')}
        >
          🧹 Remove Duplicates
        </button>
        <button
          className="gemini-prompt-chip"
          onClick={() => sendMsg('Normalize emails to lowercase')}
        >
          ✉️ Clean Emails
        </button>
      </div>

      {/* ── 3. Chat Interface ── */}
      <div className="copilot-layout-grid">
        {/* Chat Area */}
        <div className="chat-container">
          <div className="chat-messages">
            {messages.map((msg, i) => (
              msg.role === 'user' ? (
                <UserMsg key={i}>{msg.content}</UserMsg>
              ) : (
                <BotMsg key={i} isGemini={msg.isGemini} model={msg.model}>
                  {msg.content}
                </BotMsg>
              )
            ))}
            {loading && (
              <BotMsg isGemini={true} model={geminiConfig.model}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} className="animate-spin" style={{ color: '#9B72CB' }} />
                  <span>Google Gemini is processing your data request…</span>
                </div>
              </BotMsg>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-bar">
            <input
              className="chat-input"
              placeholder='Ask Gemini: "Clean whitespace", "Standardize dates", "Why is quality low?"...'
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              id="copilot-input"
            />
            <button
              className="btn btn-primary btn-icon"
              onClick={() => sendMsg()}
              disabled={loading || !input.trim()}
              id="copilot-send-btn"
              title="Send to Google Gemini"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Sidebar Info & Columns */}
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ fontSize: '.9rem' }}>
                <Sparkles size={14} style={{ color: '#9B72CB' }} />
                Gemini Prompt Examples
              </span>
            </div>
            <div style={{ padding: '10px' }}>
              {examples.map((ex, i) => (
                <button
                  key={i}
                  className="btn btn-ghost"
                  style={{
                    width: '100%', justifyContent: 'flex-start',
                    fontSize: '.8rem', padding: '7px 10px',
                    color: 'var(--text-secondary)',
                  }}
                  onClick={() => sendMsg(ex)}
                >
                  → {ex}
                </button>
              ))}
            </div>
          </div>

          {jobMeta && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-header">
                <span className="card-title" style={{ fontSize: '.9rem' }}>Active Dataset Columns</span>
              </div>
              <div style={{ padding: '10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {jobMeta.columns?.map(col => (
                  <span
                    key={col}
                    onClick={() => setInput(prev => `${prev} ${col}`)}
                    style={{
                      padding: '3px 10px',
                      background: 'var(--surface-2)',
                      borderRadius: 99,
                      fontSize: '.72rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                    title="Click to insert column into prompt"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Google Gemini Configuration Modal ── */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                <Sparkles size={18} style={{ color: '#9B72CB' }} />
                Google Gemini API Configuration
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setShowConfigModal(false)}
                style={{ padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Select Gemini Model
                </label>
                <select
                  className="select"
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast, Recommended)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Next-Gen Speed)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder={geminiConfig.configured ? `Configured (${geminiConfig.masked_key})` : 'AIzaSy...'}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                />
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Get your free Google Gemini API key from</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#4285F4', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}
                  >
                    Google AI Studio <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              <div className="alert alert-info" style={{ fontSize: '0.78rem', padding: '10px 14px' }}>
                <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Safe Allowlist Guarantee:</strong> Google Gemini parses natural language, but operations are executed strictly against RowBot's verified safe Pandas transformation engine.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowConfigModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveGeminiConfig}
                  disabled={savingKey}
                >
                  {savingKey ? 'Saving…' : 'Save & Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
