import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Download, Maximize2, Minimize2,
  ArrowLeft, Sparkles, Zap, Shield, CheckCircle2, AlertTriangle,
  Play, RefreshCw, Layers, Database, Wand2, Table2
} from 'lucide-react';
import RowBotLogo from '../components/RowBotLogo';

// ── 10 Curated Presentation Slides for RowBot ──
const SLIDES = [
  {
    id: 1,
    tag: "RowBot · Hackathon Presentation",
    title: "RowBot",
    subtitle: "Messy Data In. Clean Data Out.",
    type: "title",
    pillars: [
      { title: "0–100 Quality Score", desc: "Mathematical audit of completeness & validity", color: "#7CE7C5" },
      { title: "1-Click Deterministic Fixes", desc: "Missing values, whitespace, deduplication, dates", color: "#A78BFA" },
      { title: "Natural Language Copilot", desc: "Plain English commands mapped to safe Pandas operations", color: "#FF7867" },
      { title: "100% In-Memory Privacy", desc: "Zero external latency, zero cloud leakage, client-safe", color: "#21152B" },
    ]
  },
  {
    id: 2,
    tag: "The Market Crisis",
    title: "Spreadsheets Are Dirty, Fragile & Cost Millions",
    subtitle: "Data teams spend 40% to 60% of their operational time manually wrestling with corrupted CSV and Excel exports.",
    type: "cards_grid",
    items: [
      {
        title: "Inconsistent Formats",
        desc: "Dates split across YYYY-MM-DD, MM/DD/YY, timestamps, and unstructured strings that crash downstream SQL pipelines.",
        color: "#FF7867",
        icon: "📅"
      },
      {
        title: "Silent Duplicates",
        desc: "Near-duplicate entries with trailing whitespaces, differing capitalization, and hidden non-printing characters.",
        color: "#A78BFA",
        icon: "👥"
      },
      {
        title: "Missing & Ghost Cells",
        desc: "Undefined NULLs, NaN, empty strings, and masked zeros skewing critical aggregations and financial projections.",
        color: "#FF7867",
        icon: "⚠️"
      },
      {
        title: "Mixed Data Types",
        desc: "Numerical ID columns infected with letters, currencies written with mixed symbols, leading to silent calculation errors.",
        color: "#21152B",
        icon: "🔣"
      }
    ]
  },
  {
    id: 3,
    tag: "The Solution",
    title: "RowBot: Autonomous & Explainable Data Hygiene",
    subtitle: "Zero-setup desktop & web data preparation: upload any dirty file, receive an instant audit, and clean in one click.",
    type: "features_list",
    features: [
      { title: "Instant Quality Scoring", desc: "Calculates a deterministic 0–100 composite score with explicit penalization breakdown for transparency.", color: "#7CE7C5" },
      { title: "Automated One-Click Recipes", desc: "Pre-built modular transformation routines: trim text, drop/fill nulls, standardize ISO dates, deduplicate.", color: "#A78BFA" },
      { title: "Side-by-Side Live Diff Engine", desc: "Preview exact row and cell changes before committing any transformation, with full color-coded diffing.", color: "#D8C8FF" },
      { title: "Natural Language Copilot", desc: "Type plain-English instructions like 'convert dates to YYYY-MM-DD' without writing complex Python scripts.", color: "#FF7867" },
      { title: "Infinite Undo / Redo Stack", desc: "Every step is completely reversible. Original uploaded files are preserved untouched in memory.", color: "#7CE7C5" },
      { title: "Audit Trail & Clean Export", desc: "Export cleaned CSV/Excel files alongside an executive HTML Data Quality Certificate.", color: "#21152B" }
    ]
  },
  {
    id: 4,
    tag: "Living Data Pipeline",
    title: "The 5-Stage Living Data Transformation Engine",
    subtitle: "How messy input data streams through automated analysis, human oversight, and clean export.",
    type: "pipeline",
    stages: [
      { num: "01", name: "Ingestion", desc: "Uploads CSV, XLSX, XLS. Automatic sheet detection, delimiter inference & encoding resolution.", color: "#FF7867" },
      { num: "02", name: "Diagnostics", desc: "Column type inference, null distributions, duplicate detection, and initial 0–100 score.", color: "#A78BFA" },
      { num: "03", name: "Studio", desc: "Apply 1-click rules or prompt the Copilot. Each step updates live in-memory state.", color: "#D8C8FF" },
      { num: "04", name: "Diff Check", desc: "Side-by-side inspection showing exact before-and-after values with cell-level highlighting.", color: "#7CE7C5" },
      { num: "05", name: "Export", desc: "Download cleaned dataset in CSV/Excel plus export a verifiable HTML Audit Certificate.", color: "#21152B" }
    ]
  },
  {
    id: 5,
    tag: "Measurable Impact",
    title: "Before & After: Real Transformation Results",
    subtitle: "Actual audit results from our benchmark messy enterprise customer dataset.",
    type: "comparison",
    before: {
      grade: "Grade D (42 / 100)",
      color: "#FF7867",
      points: [
        "❌ 12.4% Missing Numerical Values in 'Revenue'",
        "❌ 8 Duplicate Rows with Trailing Whitespace differences",
        "❌ 4 Inconsistent Date Formats (YYYY-MM-DD vs MM/DD/YY)",
        "❌ Mixed Text in 'ZipCode' (numerical strings with letters)",
        "❌ Unstandardized Country Names (USA, U.S., United States)",
        "⚠️ Downstream Risk: 100% of automated ETL jobs break"
      ]
    },
    after: {
      grade: "Grade A (96 / 100)",
      color: "#7CE7C5",
      points: [
        "✓ 0 Missing Values: Numerical imputed with column median",
        "✓ 0 Duplicates: Clean deduplication with first-instance retention",
        "✓ 100% ISO-8601 Compliance: Dates standardized to YYYY-MM-DD",
        "✓ Cleaned Data Types: Strict numeric casting with invalid values pruned",
        "✓ Standardized Text: Whitespace trimmed and title-cased",
        "🚀 Production Ready: Instant CSV & Excel export with audit proof"
      ]
    }
  },
  {
    id: 6,
    tag: "Explainable AI",
    title: "Deterministic & Explainable Quality Scoring",
    subtitle: "No black boxes. Every deduction in the 0–100 Quality Score is tied to a documented, inspectable metric.",
    type: "metrics",
    metrics: [
      { title: "Completeness Penalty (Weight: 30%)", desc: "Measures missing, NULL, NaN, or whitespace-only cells across rows and columns.", color: "#FF7867" },
      { title: "Uniqueness Penalty (Weight: 25%)", desc: "Scans for exact and near-duplicate rows with whitespace normalization.", color: "#A78BFA" },
      { title: "Format Validity (Weight: 25%)", desc: "Validates date coherence, valid email structures, zip codes, and schema uniformity.", color: "#7CE7C5" },
      { title: "Consistency Score (Weight: 20%)", desc: "Detects mixed data types (numbers mixed with strings) within single columns.", color: "#21152B" }
    ]
  },
  {
    id: 7,
    tag: "AI Copilot",
    title: "Natural Language to Deterministic Pandas Actions",
    subtitle: "Bridge the gap between business users and complex Pandas scripts with plain English instructions.",
    type: "copilot",
    prompts: [
      "💬 “Trim extra spaces in all customer names”",
      "💬 “Convert invoice_date column to YYYY-MM-DD”",
      "💬 “Remove all duplicate rows based on Email”",
      "💬 “Fill empty revenue cells with column median”",
      "💬 “Drop rows where ID is missing”",
      "💬 “Capitalize state codes and country names”"
    ],
    advantages: [
      { title: "🔒 Zero Hallucination", desc: "Translates intent into constrained Pandas primitives. Never invents phantom rows." },
      { title: "⚡ Sub-Second Speed", desc: "Vectorized operations handle 50,000+ rows in milliseconds with zero LLM API latency." },
      { title: "🛡️ 100% Host Privacy", desc: "Spreadsheet data stays entirely in memory on your host machine." },
      { title: "↩️ 1-Click Reversibility", desc: "Every copilot command is recorded in the transformation ledger and fully undoable." }
    ]
  },
  {
    id: 8,
    tag: "System Architecture",
    title: "Production Tech Stack & Hardware Optimization",
    subtitle: "Engineered specifically for snappy performance on standard laptops (Intel Core i5, 16GB RAM, Iris Xe).",
    type: "architecture",
    blocks: [
      { name: "Frontend Architecture", stack: "React 18 · Vite · Vanilla CSS · Lucide · Recharts", detail: "Fast HMR, zero CSS framework overhead, 60fps canvas animations, responsive drawer.", color: "#A78BFA" },
      { name: "Backend Services", stack: "Python 3.12+ · Flask 3.1 · Flask-CORS · OpenPyXL", detail: "Lightweight REST API, multi-sheet workbook support, automated delimiter resolution.", color: "#7CE7C5" },
      { name: "Data Transformation Core", stack: "Pandas 2.2 · NumPy Vectorization · Rule Engine", detail: "Vectorized transformations, zero heavy ML bloat, sub-100ms response times.", color: "#FF7867" },
      { name: "Privacy & Security", stack: "100% In-Memory Processing · Session Cleanup", detail: "No persistent file storage, no cloud database dependencies, client-safe sandbox.", color: "#21152B" }
    ]
  },
  {
    id: 9,
    tag: "Market Impact",
    title: "Target Users & Business Value Proposition",
    subtitle: "Serving analysts, ops managers, and data engineers who are bottle-necked by dirty operational exports.",
    type: "cards_grid",
    items: [
      {
        title: "Data Analysts & BI Teams",
        desc: "Eliminate 5+ hours per week spent fixing corrupted CSV exports before loading into PowerBI, Tableau, or Snowflake.",
        color: "#A78BFA",
        icon: "📊"
      },
      {
        title: "Finance & Accounting",
        desc: "Catch duplicate invoices, mismatched dates, and ghost numerical values before monthly closing reconciliations.",
        color: "#FF7867",
        icon: "💳"
      },
      {
        title: "Operations & Supply Chain",
        desc: "Clean inconsistent SKU numbers, vendor names, and warehouse location codes with standardized rules.",
        color: "#7CE7C5",
        icon: "📦"
      },
      {
        title: "Growth & Marketing Ops",
        desc: "Normalize messy lead lists, standardize phone/email formatting, and purge duplicate CRM contacts.",
        color: "#21152B",
        icon: "📈"
      }
    ]
  },
  {
    id: 10,
    tag: "Conclusion",
    title: "RowBot: Living Data, Perfectly Clean.",
    subtitle: "Transforming chaotic spreadsheets into clean, trusted intelligence in seconds.",
    type: "conclusion",
    highlights: [
      "1. Working Full-Stack Product: Real file uploads, real data transformations, actual downloadable outputs.",
      "2. Explainable AI: 0–100 Quality scoring with transparent penalties and full audit certificate.",
      "3. Natural Language Power: Plain-English commands mapped to safe, reversible Pandas code.",
      "4. Private & Lightweight: Runs smoothly on standard laptops with zero external dependencies.",
      "5. Hackathon Demonstration: Ready for live file drop with instant quality score impact."
    ]
  }
];

export default function PresentationDeck() {
  const navigate = useNavigate();
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [motifState, setMotifState] = useState('messy'); // 'messy' -> 'aligning' -> 'clean'
  const canvasRef = useRef(null);

  const slide = SLIDES[currentSlideIdx];

  // Keyboard navigation: Left/Right arrows, Space
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlideIdx((prev) => Math.min(SLIDES.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlideIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Home') {
        setCurrentSlideIdx(0);
      } else if (e.key === 'End') {
        setCurrentSlideIdx(SLIDES.length - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Living Data — Subtle background particles & connecting lines canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Subtle particles in lavender, mint, and pale purple
    const particles = [];
    const colors = ['#A78BFA', '#D8C8FF', '#7CE7C5', '#FF7867', '#C4B5FD'];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2.2 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.35 + 0.15,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(167, 139, 250, ${(1 - dist / 120) * 0.12})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Nodes
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        else if (p.y > height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Living Data Transformation Motif Animation State (Messy -> Aligning -> Clean)
  useEffect(() => {
    const timer = setInterval(() => {
      setMotifState((prev) => {
        if (prev === 'messy') return 'aligning';
        if (prev === 'aligning') return 'clean';
        return 'messy';
      });
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const handleDownloadPptx = () => {
    const link = document.createElement('a');
    link.href = '/RowBot_Presentation.pptx';
    link.download = 'RowBot_Presentation.pptx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="presentation-viewport">
      {/* ── Living Data Background Canvas ── */}
      <canvas ref={canvasRef} className="presentation-canvas" />

      {/* ── Flowing Lavender Gradient Waves ── */}
      <div className="presentation-wave-tr" />
      <div className="presentation-wave-bl" />

      {/* ── Top Navigation Bar ── */}
      <header className="presentation-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate('/')}
            className="btn btn-ghost btn-sm"
            style={{ color: '#21152B', fontWeight: 700, gap: 6 }}
            title="Return to RowBot Studio"
          >
            <ArrowLeft size={16} /> Exit Deck
          </button>
          <div style={{ width: 1, height: 18, background: '#E4D9FB' }} />
          <RowBotLogo size="sm" subtitle="Pitch Presentation" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="slide-counter-badge">
            Slide {currentSlideIdx + 1} of {SLIDES.length}
          </span>
          <button
            onClick={handleDownloadPptx}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: '#A78BFA', color: '#6D28D9', fontWeight: 700, gap: 6 }}
            title="Download Editable PowerPoint File (.pptx)"
          >
            <Download size={15} /> Download .PPTX
          </button>
          <button
            onClick={handleToggleFullscreen}
            className="btn btn-ghost btn-sm"
            style={{ color: '#21152B', padding: '6px 8px' }}
            title="Toggle Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      {/* ── Main Slide Stage (16:9 Aspect Ratio Container) ── */}
      <main className="presentation-stage-container">
        <div key={slide.id} className="presentation-slide-card animate-fadeInUp">
          
          {/* Header of the Slide */}
          <div className="slide-header">
            <span className="slide-tag-pill">{slide.tag}</span>
            <h1 className="slide-heading">{slide.title}</h1>
            {slide.subtitle && <p className="slide-subtitle">{slide.subtitle}</p>}
          </div>

          {/* ── Slide Specific Content Rendering ── */}
          <div className="slide-body-content">

            {/* SLIDE 1: Title Slide */}
            {slide.type === 'title' && (
              <div className="slide-title-layout">
                <div className="title-left-col">
                  <div className="title-tagline-quote">
                    “Messy Data In. Clean Data Out.”
                  </div>
                  <p style={{ color: '#33313A', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 24, maxWidth: 540 }}>
                    An autonomous, explainable data preparation engine that uploads messy CSV & Excel spreadsheets,
                    audits them with a composite 0–100 quality score, and delivers clean, normalized datasets in seconds.
                  </p>

                  {/* 4 Core Pillars */}
                  <div className="title-pillars-grid">
                    {slide.pillars.map((pil, idx) => (
                      <div key={idx} className="pillar-item-card">
                        <div className="pillar-bar" style={{ background: pil.color }} />
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#21152B', marginBottom: 2 }}>{pil.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#6E697B' }}>{pil.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature Motif Showcase on Title */}
                <div className="title-motif-col">
                  <div className="living-motif-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        ✦ Signature Living Data Motif
                      </span>
                      <span className="motif-status-badge">
                        Status: {motifState.toUpperCase()}
                      </span>
                    </div>

                    <div className="motif-animation-canvas">
                      <div className={`motif-scattered-nodes ${motifState}`}>
                        {[...Array(16)].map((_, i) => (
                          <div key={i} className={`motif-dot dot-${i} ${motifState}`} />
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: '0.78rem', fontWeight: 700 }}>
                      <span style={{ color: '#FF7867' }}>1. Chaotic Scattered Input</span>
                      <span style={{ color: '#A78BFA' }}>→</span>
                      <span style={{ color: '#7CE7C5' }}>2. Aligned Clean Grid</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2 & 9: Cards Grid Layout */}
            {slide.type === 'cards_grid' && (
              <div className="slide-cards-2x2-grid">
                {slide.items.map((it, idx) => (
                  <div key={idx} className="grid-card-modern">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: '1.4rem' }}>{it.icon}</span>
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#21152B' }}>{it.title}</h3>
                    </div>
                    <p style={{ fontSize: '0.92rem', color: '#33313A', lineHeight: 1.55 }}>{it.desc}</p>
                    <div className="card-accent-line" style={{ background: it.color }} />
                  </div>
                ))}
              </div>
            )}

            {/* SLIDE 3: Features List */}
            {slide.type === 'features_list' && (
              <div className="slide-features-3x2-grid">
                {slide.features.map((feat, idx) => (
                  <div key={idx} className="feature-item-box">
                    <div className="feature-indicator-dot" style={{ background: feat.color }} />
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#21152B', marginBottom: 4 }}>{feat.title}</h4>
                      <p style={{ fontSize: '0.86rem', color: '#33313A', lineHeight: 1.5 }}>{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SLIDE 4: 5-Stage Pipeline */}
            {slide.type === 'pipeline' && (
              <div className="slide-pipeline-container">
                {slide.stages.map((stg, idx) => (
                  <div key={idx} className="pipeline-step-card">
                    <div className="pipeline-num-badge" style={{ background: stg.color }}>
                      {stg.num}
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#21152B', marginBottom: 6 }}>{stg.name}</h4>
                    <p style={{ fontSize: '0.84rem', color: '#33313A', lineHeight: 1.5 }}>{stg.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* SLIDE 5: Before & After Comparison */}
            {slide.type === 'comparison' && (
              <div className="slide-comparison-layout">
                <div className="comparison-card before-card">
                  <div className="comparison-header">
                    <span style={{ color: '#FF7867', fontWeight: 900, fontSize: '1.1rem' }}>BEFORE ROWBOT</span>
                    <span className="score-pill score-d">{slide.before.grade}</span>
                  </div>
                  <ul className="comparison-list">
                    {slide.before.points.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </div>

                <div className="comparison-arrow-badge">
                  →
                </div>

                <div className="comparison-card after-card">
                  <div className="comparison-header">
                    <span style={{ color: '#059669', fontWeight: 900, fontSize: '1.1rem' }}>AFTER ROWBOT</span>
                    <span className="score-pill score-a">{slide.after.grade}</span>
                  </div>
                  <ul className="comparison-list">
                    {slide.after.points.map((pt, idx) => (
                      <li key={idx} style={{ color: '#15803d' }}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* SLIDE 6: Explainable Quality Scoring Metrics */}
            {slide.type === 'metrics' && (
              <div className="slide-metrics-grid">
                {slide.metrics.map((m, idx) => (
                  <div key={idx} className="metric-score-card">
                    <div className="metric-bar" style={{ background: m.color }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#21152B', marginBottom: 6 }}>{m.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#33313A', lineHeight: 1.55 }}>{m.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* SLIDE 7: AI Copilot */}
            {slide.type === 'copilot' && (
              <div className="slide-copilot-layout">
                <div className="copilot-prompts-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#21152B', marginBottom: 14 }}>
                    Supported Natural Language Actions
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {slide.prompts.map((p, idx) => (
                      <div key={idx} className="prompt-chip">
                        {p}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="copilot-advantages-card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#21152B', marginBottom: 14 }}>
                    Why RowBot's AI Approach Is Superior
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {slide.advantages.map((adv, idx) => (
                      <div key={idx} className="advantage-row">
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#21152B', marginBottom: 2 }}>{adv.title}</div>
                        <div style={{ fontSize: '0.86rem', color: '#33313A', lineHeight: 1.45 }}>{adv.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 8: System Architecture */}
            {slide.type === 'architecture' && (
              <div className="slide-arch-grid">
                {slide.blocks.map((blk, idx) => (
                  <div key={idx} className="arch-card">
                    <div className="arch-tag" style={{ color: blk.color }}>{blk.name}</div>
                    <div className="arch-stack" style={{ color: '#21152B' }}>{blk.stack}</div>
                    <div className="arch-detail">{blk.detail}</div>
                  </div>
                ))}
              </div>
            )}

            {/* SLIDE 10: Conclusion */}
            {slide.type === 'conclusion' && (
              <div className="slide-conclusion-layout">
                <div className="conclusion-left">
                  <div className="conclusion-tagline-box">
                    <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#21152B', marginBottom: 8 }}>
                      “Messy Data In. Clean Data Out.”
                    </div>
                    <div style={{ fontSize: '1rem', color: '#6D28D9', fontWeight: 700 }}>
                      Experience the live web app now at http://localhost:5173
                    </div>
                  </div>

                  {/* Closing Motif */}
                  <div className="living-motif-box" style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#A78BFA' }}>
                        ✦ ROWBOT LIVING DATA IDENTITY
                      </span>
                    </div>
                    <div className="motif-animation-canvas">
                      <div className="motif-scattered-nodes clean">
                        {[...Array(16)].map((_, i) => (
                          <div key={i} className={`motif-dot dot-${i} clean`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="conclusion-right-card">
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#21152B', marginBottom: 16 }}>
                    Key Takeaways for Stakeholders & Judges
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {slide.highlights.map((h, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 10, fontSize: '0.94rem', color: '#33313A', lineHeight: 1.5 }}>
                        <span style={{ color: '#A78BFA', fontWeight: 800 }}>✓</span>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Slide Footer */}
          <div className="slide-footer-bar">
            <span>RowBot AI · Enterprise Data Hygiene</span>
            <span>Living Data — Elegant Motion on White</span>
            <span>Slide {currentSlideIdx + 1} / {SLIDES.length}</span>
          </div>

        </div>
      </main>

      {/* ── Bottom Presentation Control Bar ── */}
      <footer className="presentation-footer-controls">
        <button
          onClick={() => setCurrentSlideIdx((prev) => Math.max(0, prev - 1))}
          disabled={currentSlideIdx === 0}
          className="btn btn-secondary btn-sm"
          style={{ gap: 6, fontWeight: 700 }}
        >
          <ChevronLeft size={18} /> Previous
        </button>

        {/* Thumbnail Selector Dots */}
        <div className="slide-dots-tray">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlideIdx(idx)}
              className={`slide-dot-btn ${currentSlideIdx === idx ? 'active' : ''}`}
              title={`Slide ${idx + 1}: ${s.title}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentSlideIdx((prev) => Math.min(SLIDES.length - 1, prev + 1))}
          disabled={currentSlideIdx === SLIDES.length - 1}
          className="btn btn-primary btn-sm"
          style={{ gap: 6, fontWeight: 700, background: '#A78BFA', borderColor: '#8B5CF6' }}
        >
          Next <ChevronRight size={18} />
        </button>
      </footer>
    </div>
  );
}
