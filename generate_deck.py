import sys
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ── Colors from "Living Data — Elegant Motion on White" design specification ──
BG_CANVAS = RGBColor(0xFA, 0xF8, 0xFF)       # Very light lavender/white
WHITE = RGBColor(0xFF, 0xFF, 0xFF)           # Pure white for cards
DARK_PLUM = RGBColor(0x21, 0x15, 0x2B)       # Dark plum for headings
CHARCOAL = RGBColor(0x33, 0x31, 0x3A)        # Charcoal for body text
MUTED_TEXT = RGBColor(0x6E, 0x69, 0x7B)      # Muted slate/purple text
ELECTRIC_VIOLET = RGBColor(0xA7, 0x8B, 0xFA) # Electric violet
SOFT_PURPLE = RGBColor(0xD8, 0xC8, 0xFF)     # Soft purple
LAVENDER_BORDER = RGBColor(0xE4, 0xD9, 0xFB) # Thin border
PALE_WAVE = RGBColor(0xF0, 0xE9, 0xFD)       # Very soft wave accent
MINT = RGBColor(0x7C, 0xE7, 0xC5)            # Mint accent
CORAL = RGBColor(0xFF, 0x78, 0x67)           # Coral accent
CARD_BG = RGBColor(0xFF, 0xFF, 0xFF)         # Crisp card fill
CARD_SUBTLE = RGBColor(0xF6, 0xF2, 0xFE)     # Subtle lavender card fill

FONT_HEADING = "Segoe UI"
FONT_BODY = "Segoe UI"

def create_rowbot_deck(output_path):
    prs = Presentation()
    # 16:9 widescreen layout
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    def add_background_and_waves(slide, is_title=False):
        # 1. Base Canvas
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_CANVAS
        bg.line.fill.background()

        # 2. Flowing lavender gradient corner waves
        # Top-right corner wave
        wave1 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(10.2), Inches(-1.5), Inches(4.5), Inches(4.2))
        wave1.fill.solid()
        wave1.fill.fore_color.rgb = PALE_WAVE
        wave1.line.color.rgb = SOFT_PURPLE
        wave1.line.width = Pt(1)
        wave1.rotation = 28

        # Bottom-left corner wave
        wave2 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(-1.8), Inches(5.2), Inches(5.0), Inches(4.0))
        wave2.fill.solid()
        wave2.fill.fore_color.rgb = PALE_WAVE
        wave2.line.color.rgb = SOFT_PURPLE
        wave2.line.width = Pt(1)
        wave2.rotation = -22

        # 3. Subtle floating particles / glowing dots along corners
        dot_coords = [
            (Inches(11.2), Inches(1.8), 0.12, ELECTRIC_VIOLET),
            (Inches(12.0), Inches(2.6), 0.18, SOFT_PURPLE),
            (Inches(10.5), Inches(3.1), 0.10, MINT),
            (Inches(12.4), Inches(1.2), 0.14, CORAL),
            (Inches(1.2), Inches(6.0), 0.15, ELECTRIC_VIOLET),
            (Inches(2.0), Inches(5.4), 0.11, MINT),
            (Inches(0.6), Inches(4.8), 0.14, SOFT_PURPLE),
        ]
        for x, y, size, col in dot_coords:
            dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y, Inches(size), Inches(size))
            dot.fill.solid()
            dot.fill.fore_color.rgb = col
            dot.line.fill.background()

        # 4. Thin data grid lines in background corner
        grid_line1 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(9.8), Inches(0.8), Inches(2.8), Inches(0.015))
        grid_line1.fill.solid()
        grid_line1.fill.fore_color.rgb = SOFT_PURPLE
        grid_line1.line.fill.background()

        grid_line2 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(10.5), Inches(0.4), Inches(0.015), Inches(2.2))
        grid_line2.fill.solid()
        grid_line2.fill.fore_color.rgb = SOFT_PURPLE
        grid_line2.line.fill.background()

    def add_data_transformation_motif(slide, left, top, width, height):
        """Draws the signature RowBot motif: scattered messy dots flowing into a neat aligned grid."""
        container = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        container.fill.solid()
        container.fill.fore_color.rgb = CARD_SUBTLE
        container.line.color.rgb = LAVENDER_BORDER
        container.line.width = Pt(1)

        # Label: Messy Data
        lbl1 = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.15), Inches(1.8), Inches(0.35))
        tf1 = lbl1.text_frame
        tf1.word_wrap = True
        p1 = tf1.paragraphs[0]
        p1.text = "MESSY INPUT"
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(8.5)
        p1.font.bold = True
        p1.font.color.rgb = CORAL

        # Scattered red/purple dots (representing errors, duplicates, missing cells)
        scattered_pts = [
            (0.35, 0.55, CORAL), (0.75, 0.70, ELECTRIC_VIOLET), (1.20, 0.48, CORAL),
            (0.50, 0.95, ELECTRIC_VIOLET), (0.95, 1.05, SOFT_PURPLE), (1.40, 0.85, CORAL),
            (0.30, 1.30, SOFT_PURPLE), (0.80, 1.45, CORAL), (1.30, 1.35, ELECTRIC_VIOLET)
        ]
        for dx, dy, col in scattered_pts:
            dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, left + Inches(dx), top + Inches(dy), Inches(0.12), Inches(0.12))
            dot.fill.solid()
            dot.fill.fore_color.rgb = col
            dot.line.fill.background()

        # Arrow indicator
        arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, left + width/2 - Inches(0.3), top + height/2 - Inches(0.12), Inches(0.6), Inches(0.24))
        arrow.fill.solid()
        arrow.fill.fore_color.rgb = ELECTRIC_VIOLET
        arrow.line.fill.background()

        # Label: Clean Grid
        lbl2 = slide.shapes.add_textbox(left + width - Inches(2.0), top + Inches(0.15), Inches(1.8), Inches(0.35))
        tf2 = lbl2.text_frame
        p2 = tf2.paragraphs[0]
        p2.text = "CLEAN ROWBOT GRID"
        p2.font.name = FONT_HEADING
        p2.font.size = Pt(8.5)
        p2.font.bold = True
        p2.font.color.rgb = MINT

        # Aligned clean grid rows
        grid_start_x = left + width - Inches(1.9)
        grid_start_y = top + Inches(0.55)
        for r in range(4):
            for c in range(4):
                cell = slide.shapes.add_shape(
                    MSO_SHAPE.ROUNDED_RECTANGLE,
                    grid_start_x + Inches(c * 0.42),
                    grid_start_y + Inches(r * 0.28),
                    Inches(0.34), Inches(0.20)
                )
                cell.fill.solid()
                cell.fill.fore_color.rgb = WHITE if (r + c) % 2 == 0 else PALE_WAVE
                cell.line.color.rgb = MINT if r == 0 else ELECTRIC_VIOLET
                cell.line.width = Pt(0.75)

    def add_header(slide, tag, title, subtitle=None):
        # Category Tag
        tag_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.9), Inches(0.55), Inches(2.4), Inches(0.34))
        tag_box.fill.solid()
        tag_box.fill.fore_color.rgb = CARD_SUBTLE
        tag_box.line.color.rgb = SOFT_PURPLE
        tag_box.line.width = Pt(1)
        tf_tag = tag_box.text_frame
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = tag.upper()
        p_tag.font.name = FONT_HEADING
        p_tag.font.size = Pt(9)
        p_tag.font.bold = True
        p_tag.font.color.rgb = ELECTRIC_VIOLET
        p_tag.alignment = PP_ALIGN.CENTER

        # Title
        tb_title = slide.shapes.add_textbox(Inches(0.85), Inches(0.95), Inches(11.5), Inches(0.75))
        tf_title = tb_title.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title
        p_title.font.name = FONT_HEADING
        p_title.font.size = Pt(26)
        p_title.font.bold = True
        p_title.font.color.rgb = DARK_PLUM

        # Subtitle
        if subtitle:
            tb_sub = slide.shapes.add_textbox(Inches(0.85), Inches(1.65), Inches(11.5), Inches(0.45))
            tf_sub = tb_sub.text_frame
            tf_sub.word_wrap = True
            p_sub = tf_sub.paragraphs[0]
            p_sub.text = subtitle
            p_sub.font.name = FONT_BODY
            p_sub.font.size = Pt(13)
            p_sub.font.color.rgb = MUTED_TEXT

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 1: Title Slide (Living Data — Elegant Motion on White)
    # ══════════════════════════════════════════════════════════════════════════
    slide1 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide1, is_title=True)

    # Logo Badge
    logo_badge = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(1.2), Inches(3.6), Inches(0.55))
    logo_badge.fill.solid()
    logo_badge.fill.fore_color.rgb = CARD_SUBTLE
    logo_badge.line.color.rgb = ELECTRIC_VIOLET
    logo_badge.line.width = Pt(1.5)
    tf_lb = logo_badge.text_frame
    p_lb = tf_lb.paragraphs[0]
    p_lb.text = "✦  ROWBOT  ·  LIVING DATA AI"
    p_lb.font.name = FONT_HEADING
    p_lb.font.size = Pt(11)
    p_lb.font.bold = True
    p_lb.font.color.rgb = DARK_PLUM
    p_lb.alignment = PP_ALIGN.CENTER

    # Main Headline
    tb_main = slide1.shapes.add_textbox(Inches(0.95), Inches(1.9), Inches(11.0), Inches(1.6))
    tf_main = tb_main.text_frame
    tf_main.word_wrap = True
    p_m1 = tf_main.paragraphs[0]
    p_m1.text = "RowBot"
    p_m1.font.name = FONT_HEADING
    p_m1.font.size = Pt(54)
    p_m1.font.bold = True
    p_m1.font.color.rgb = DARK_PLUM

    # Tagline Box
    tagline_card = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(3.6), Inches(6.8), Inches(1.2))
    tagline_card.fill.solid()
    tagline_card.fill.fore_color.rgb = WHITE
    tagline_card.line.color.rgb = ELECTRIC_VIOLET
    tagline_card.line.width = Pt(2)
    tf_tc = tagline_card.text_frame
    p_tc1 = tf_tc.paragraphs[0]
    p_tc1.text = "“Messy Data In. Clean Data Out.”"
    p_tc1.font.name = FONT_HEADING
    p_tc1.font.size = Pt(22)
    p_tc1.font.bold = True
    p_tc1.font.color.rgb = DARK_PLUM

    p_tc2 = tf_tc.add_paragraph()
    p_tc2.text = "Autonomous, explainable spreadsheet cleaning & data hygiene platform"
    p_tc2.font.name = FONT_BODY
    p_tc2.font.size = Pt(12)
    p_tc2.font.color.rgb = MUTED_TEXT

    # Visual Motif on Title: Messy to Clean alignment
    add_data_transformation_motif(slide1, Inches(8.2), Inches(2.2), Inches(4.3), Inches(2.6))

    # Bottom Pillars Row
    pillars = [
        ("0–100 Quality Score", "Mathematical audit of completeness, uniqueness & validity", MINT),
        ("1-Click Deterministic Fixes", "Missing values, whitespace, deduplication, date normalization", ELECTRIC_VIOLET),
        ("Natural Language Copilot", "Translates plain English commands into safe Pandas operations", CORAL),
        ("100% In-Memory Privacy", "Zero local LLM latency, zero cloud leaks, zero external telemetry", DARK_PLUM),
    ]
    for i, (head, sub, accent) in enumerate(pillars):
        px = Inches(1.0 + i * 2.85)
        card = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, px, Inches(5.2), Inches(2.7), Inches(1.6))
        card.fill.solid()
        card.fill.fore_color.rgb = WHITE
        card.line.color.rgb = LAVENDER_BORDER
        card.line.width = Pt(1)

        # Accent top bar
        bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, px + Inches(0.15), Inches(5.35), Inches(0.4), Inches(0.06))
        bar.fill.solid()
        bar.fill.fore_color.rgb = accent
        bar.line.fill.background()

        tb = slide1.shapes.add_textbox(px + Inches(0.15), Inches(5.45), Inches(2.4), Inches(1.2))
        tf = tb.text_frame
        tf.word_wrap = True
        p1 = tf.paragraphs[0]
        p1.text = head
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(12)
        p1.font.bold = True
        p1.font.color.rgb = DARK_PLUM

        p2 = tf.add_paragraph()
        p2.text = sub
        p2.font.name = FONT_BODY
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = CHARCOAL

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 2: Problem Statement (The Spreadsheet Crisis)
    # ══════════════════════════════════════════════════════════════════════════
    slide2 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide2)
    add_header(slide2, "The Market Crisis", "Spreadsheets Are Dirty, Fragile, and Cost Millions",
               "Data teams spend 40% to 60% of their operational time manually wrestling with corrupted CSV and Excel exports.")

    problems = [
        ("Inconsistent Formats", "Dates split across YYYY-MM-DD, MM/DD/YY, timestamps, and unstructured strings that crash downstream SQL pipelines.", CORAL),
        ("Silent Duplicates", "Near-duplicate entries with trailing whitespaces, differing capitalization, and hidden special characters.", ELECTRIC_VIOLET),
        ("Missing & Ghost Cells", "Undefined NULLs, NaN, empty strings, and masked zeros skewing critical aggregations and financial projections.", CORAL),
        ("Mixed Data Types", "Numerical ID columns infected with letters, currencies written with mixed symbols, leading to silent calculation errors.", DARK_PLUM),
    ]
    for i, (title, desc, col) in enumerate(problems):
        row = i // 2
        col_idx = i % 2
        x = Inches(0.9 + col_idx * 5.8)
        y = Inches(2.2 + row * 2.3)

        card = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.5), Inches(2.0))
        card.fill.solid()
        card.fill.fore_color.rgb = WHITE
        card.line.color.rgb = LAVENDER_BORDER
        card.line.width = Pt(1)

        # Badge
        badge = slide2.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.25), y + Inches(0.25), Inches(0.35), Inches(0.35))
        badge.fill.solid()
        badge.fill.fore_color.rgb = col
        badge.line.fill.background()

        tb = slide2.shapes.add_textbox(x + Inches(0.75), y + Inches(0.18), Inches(4.5), Inches(1.6))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = DARK_PLUM

        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.name = FONT_BODY
        p_desc.font.size = Pt(11)
        p_desc.font.color.rgb = CHARCOAL

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 3: The RowBot Solution (Autonomous & Explainable)
    # ══════════════════════════════════════════════════════════════════════════
    slide3 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide3)
    add_header(slide3, "The Solution", "RowBot: Autonomous, Explainable Spreadsheet Normalization",
               "Zero-setup desktop & web data preparation: upload any dirty file, receive an instant audit, and clean in one click.")

    solutions = [
        ("Instant Quality Scoring", "Calculates a deterministic 0–100 composite score with explicit penalization breakdown for transparency.", MINT),
        ("Automated One-Click Recipes", "Pre-built modular transformation routines: trim text, drop/fill nulls, standardize ISO dates, deduplicate.", ELECTRIC_VIOLET),
        ("Side-by-Side Live Diff Engine", "Preview exact row and cell changes before committing any transformation, with full color-coded diffing.", SOFT_PURPLE),
        ("Natural Language Copilot", "Type plain-English instructions like 'convert dates to YYYY-MM-DD' without writing complex Python scripts.", CORAL),
        ("Infinite Undo / Redo Stack", "Every step is completely reversible. Original uploaded files are preserved untouched in memory.", MINT),
        ("Audit Trail & Clean Export", "Export cleaned CSV/Excel files alongside an executive HTML Data Quality Certificate.", DARK_PLUM),
    ]

    for i, (title, desc, col) in enumerate(solutions):
        col_idx = i % 3
        row_idx = i // 3
        x = Inches(0.9 + col_idx * 3.85)
        y = Inches(2.2 + row_idx * 2.3)

        card = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.6), Inches(2.05))
        card.fill.solid()
        card.fill.fore_color.rgb = WHITE
        card.line.color.rgb = LAVENDER_BORDER
        card.line.width = Pt(1)

        # Top tag
        top_bar = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x + Inches(0.2), y + Inches(0.2), Inches(0.3), Inches(0.3))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = col
        top_bar.line.fill.background()

        tb = slide3.shapes.add_textbox(x + Inches(0.6), y + Inches(0.18), Inches(2.85), Inches(1.7))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = DARK_PLUM

        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.name = FONT_BODY
        p_desc.font.size = Pt(10)
        p_desc.font.color.rgb = CHARCOAL

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 4: "Living Data" 5-Stage Workflow Pipeline
    # ══════════════════════════════════════════════════════════════════════════
    slide4 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide4)
    add_header(slide4, "Core Workflow", "The 5-Stage Living Data Transformation Engine",
               "How messy input data streams through automated analysis, human oversight, and clean export.")

    # Visual Motif on Workflow Slide
    add_data_transformation_motif(slide4, Inches(8.7), Inches(0.6), Inches(3.8), Inches(1.3))

    stages = [
        ("Stage 1", "Multi-Format Ingestion", "Uploads CSV, XLSX, or XLS. Automatic sheet detection, delimiter inference, and in-memory encoding resolution.", CORAL),
        ("Stage 2", "Diagnostic Profiling", "Generates column-level type inference, null distributions, duplicate detection, and initial 0–100 quality score.", ELECTRIC_VIOLET),
        ("Stage 3", "Interactive Studio", "Apply 1-click rules or prompt the Copilot. Each step generates an operation log with delta calculations.", SOFT_PURPLE),
        ("Stage 4", "Diff Verification", "Side-by-side inspection showing exact before-and-after values with cell-level change highlighting.", MINT),
        ("Stage 5", "Certified Export", "Download cleaned dataset in CSV/Excel plus export a verifiable HTML Data Quality Audit Certificate.", DARK_PLUM),
    ]

    for i, (num, title, body, col) in enumerate(stages):
        x = Inches(0.9 + i * 2.35)
        card = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.3), Inches(2.2), Inches(4.5))
        card.fill.solid()
        card.fill.fore_color.rgb = WHITE
        card.line.color.rgb = LAVENDER_BORDER
        card.line.width = Pt(1)

        # Stage Number circle
        num_circle = slide4.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.2), Inches(2.55), Inches(0.55), Inches(0.55))
        num_circle.fill.solid()
        num_circle.fill.fore_color.rgb = col
        num_circle.line.fill.background()
        tf_nc = num_circle.text_frame
        p_nc = tf_nc.paragraphs[0]
        p_nc.text = str(i + 1)
        p_nc.font.name = FONT_HEADING
        p_nc.font.size = Pt(14)
        p_nc.font.bold = True
        p_nc.font.color.rgb = WHITE
        p_nc.alignment = PP_ALIGN.CENTER

        tb = slide4.shapes.add_textbox(x + Inches(0.15), Inches(3.25), Inches(1.9), Inches(3.3))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = DARK_PLUM

        p_desc = tf.add_paragraph()
        p_desc.text = body
        p_desc.font.name = FONT_BODY
        p_desc.font.size = Pt(10)
        p_desc.font.color.rgb = CHARCOAL

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 5: Before & After Live Transformation Proof
    # ══════════════════════════════════════════════════════════════════════════
    slide5 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide5)
    add_header(slide5, "Measurable Impact", "Before & After: Real Transformation Results",
               "Actual audit results from our benchmark messy enterprise customer dataset.")

    # Left: Before Card
    card_before = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.9), Inches(2.2), Inches(5.5), Inches(4.6))
    card_before.fill.solid()
    card_before.fill.fore_color.rgb = WHITE
    card_before.line.color.rgb = CORAL
    card_before.line.width = Pt(1.5)

    tb_b = slide5.shapes.add_textbox(Inches(1.1), Inches(2.35), Inches(5.1), Inches(4.3))
    tf_b = tb_b.text_frame
    tf_b.word_wrap = True
    p = tf_b.paragraphs[0]
    p.text = "BEFORE ROWBOT  ·  Grade D (42 / 100)"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = CORAL

    b_points = [
        "❌ 12.4% Missing Numerical Values in 'Revenue'",
        "❌ 8 Duplicate Rows with Trailing Whitespace differences",
        "❌ 4 Inconsistent Date Formats (YYYY-MM-DD vs MM/DD/YY)",
        "❌ Mixed Text in 'ZipCode' (numerical strings with letters)",
        "❌ Unstandardized Country Names (USA, U.S., United States)",
        "⚠️ Downstream Risk: 100% of automated ETL jobs break"
    ]
    for pt in b_points:
        p_pt = tf_b.add_paragraph()
        p_pt.text = pt
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(11)
        p_pt.font.color.rgb = CHARCOAL

    # Right: After Card
    card_after = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(2.2), Inches(5.6), Inches(4.6))
    card_after.fill.solid()
    card_after.fill.fore_color.rgb = WHITE
    card_after.line.color.rgb = MINT
    card_after.line.width = Pt(2)

    tb_a = slide5.shapes.add_textbox(Inches(7.0), Inches(2.35), Inches(5.2), Inches(4.3))
    tf_a = tb_a.text_frame
    tf_a.word_wrap = True
    p = tf_a.paragraphs[0]
    p.text = "AFTER ROWBOT  ·  Grade A (96 / 100)"
    p.font.name = FONT_HEADING
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = MINT

    a_points = [
        "✓ 0 Missing Values: Numerical imputed with column median",
        "✓ 0 Duplicates: Clean deduplication with first-instance retention",
        "✓ 100% ISO-8601 Compliance: Dates standardized to YYYY-MM-DD",
        "✓ Cleaned Data Types: Strict numeric casting with invalid values pruned",
        "✓ Standardized Text: Whitespace trimmed and title-cased",
        "🚀 Production Ready: Instant CSV & Excel export with audit proof"
    ]
    for pt in a_points:
        p_pt = tf_a.add_paragraph()
        p_pt.text = pt
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(11)
        p_pt.font.color.rgb = CHARCOAL

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 6: Explainable Quality Scoring Matrix
    # ══════════════════════════════════════════════════════════════════════════
    slide6 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide6)
    add_header(slide6, "Explainable AI", "Deterministic & Explainable Quality Scoring",
               "No black boxes. Every deduction in the 0–100 Quality Score is tied to a documented, inspectable metric.")

    metrics = [
        ("Completeness Penalty", "Measures missing, NULL, NaN, or whitespace-only cells across rows and columns. Weight: 30%", CORAL),
        ("Uniqueness Penalty", "Scans for exact and near-duplicate rows with whitespace normalization. Weight: 25%", ELECTRIC_VIOLET),
        ("Format Validity", "Validates date coherence, valid email structures, zip codes, and schema uniformity. Weight: 25%", MINT),
        ("Consistency Score", "Detects mixed data types (numbers mixed with strings) within single columns. Weight: 20%", DARK_PLUM),
    ]

    for i, (m_title, m_desc, col) in enumerate(metrics):
        col_idx = i % 2
        row_idx = i // 2
        x = Inches(0.9 + col_idx * 5.8)
        y = Inches(2.2 + row_idx * 2.3)

        card = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.5), Inches(2.0))
        card.fill.solid()
        card.fill.fore_color.rgb = WHITE
        card.line.color.rgb = LAVENDER_BORDER
        card.line.width = Pt(1)

        # Indicator
        ind = slide6.shapes.add_shape(MSO_SHAPE.RECTANGLE, x + Inches(0.2), y + Inches(0.2), Inches(0.12), Inches(1.6))
        ind.fill.solid()
        ind.fill.fore_color.rgb = col
        ind.line.fill.background()

        tb = slide6.shapes.add_textbox(x + Inches(0.5), y + Inches(0.18), Inches(4.7), Inches(1.6))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = m_title
        p.font.name = FONT_HEADING
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = DARK_PLUM

        p_desc = tf.add_paragraph()
        p_desc.text = m_desc
        p_desc.font.name = FONT_BODY
        p_desc.font.size = Pt(11)
        p_desc.font.color.rgb = CHARCOAL

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 7: Natural Language Copilot & AI Engine
    # ══════════════════════════════════════════════════════════════════════════
    slide7 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide7)
    add_header(slide7, "AI Copilot", "Natural Language to Deterministic Transformation",
               "Bridge the gap between business users and complex Pandas scripts with plain English instructions.")

    # Left: Copilot Prompt Card
    card_prompt = slide7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.9), Inches(2.2), Inches(5.5), Inches(4.6))
    card_prompt.fill.solid()
    card_prompt.fill.fore_color.rgb = WHITE
    card_prompt.line.color.rgb = ELECTRIC_VIOLET
    card_prompt.line.width = Pt(1.5)

    tb_p = slide7.shapes.add_textbox(Inches(1.1), Inches(2.35), Inches(5.1), Inches(4.3))
    tf_p = tb_p.text_frame
    tf_p.word_wrap = True
    p = tf_p.paragraphs[0]
    p.text = "Supported Natural Language Actions"
    p.font.name = FONT_HEADING
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = DARK_PLUM

    examples = [
        "💬 “Trim extra spaces in all customer names”",
        "💬 “Convert invoice_date column to YYYY-MM-DD”",
        "💬 “Remove all duplicate rows based on Email”",
        "💬 “Fill empty revenue cells with column median”",
        "💬 “Drop rows where ID is missing”",
        "💬 “Capitalize state codes and country names”"
    ]
    for ex in examples:
        p_ex = tf_p.add_paragraph()
        p_ex.text = ex
        p_ex.font.name = FONT_BODY
        p_ex.font.size = Pt(11)
        p_ex.font.color.rgb = CHARCOAL

    # Right: Engine Architecture
    card_eng = slide7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(2.2), Inches(5.6), Inches(4.6))
    card_eng.fill.solid()
    card_eng.fill.fore_color.rgb = WHITE
    card_eng.line.color.rgb = SOFT_PURPLE
    card_eng.line.width = Pt(1)

    tb_e = slide7.shapes.add_textbox(Inches(7.0), Inches(2.35), Inches(5.2), Inches(4.3))
    tf_e = tb_e.text_frame
    tf_e.word_wrap = True
    p = tf_e.paragraphs[0]
    p.text = "Why RowBot's AI Approach is Superior"
    p.font.name = FONT_HEADING
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = DARK_PLUM

    reasons = [
        ("🔒 Zero Data Hallucination", "RowBot translates intent into constrained, validated Pandas primitives. It never guesses or generates phantom rows."),
        ("⚡ Sub-Second Execution", "Local vectorized execution handles 50,000+ rows in milliseconds without external LLM API roundtrips."),
        ("🛡️ Full Privacy Guarantee", "Spreadsheet data stays entirely in memory on your host machine. Perfect for HIPAA, GDPR, and financial data."),
        ("↩️ 100% Audit Reversibility", "Every copilot command is recorded in the transformation ledger and can be undone with one click.")
    ]
    for r_head, r_body in reasons:
        p_h = tf_e.add_paragraph()
        p_h.text = r_head
        p_h.font.name = FONT_HEADING
        p_h.font.size = Pt(11.5)
        p_h.font.bold = True
        p_h.font.color.rgb = DARK_PLUM

        p_b = tf_e.add_paragraph()
        p_b.text = r_body
        p_b.font.name = FONT_BODY
        p_b.font.size = Pt(9.5)
        p_b.font.color.rgb = CHARCOAL

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 8: Technology Stack & Local Hardware Optimization
    # ══════════════════════════════════════════════════════════════════════════
    slide8 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide8)
    add_header(slide8, "System Architecture", "Production Technology Stack & Hardware Optimization",
               "Engineered specifically for snappy performance on standard laptops (Intel Core i5, 16GB RAM, Iris Xe).")

    tech_blocks = [
        ("Frontend Architecture", "React 18 · Vite · Vanilla CSS Design System · Lucide Icons · Recharts", "Ultra-fast HMR, zero CSS framework bloat, responsive mobile drawer, 60fps canvas animations.", ELECTRIC_VIOLET),
        ("Backend Services", "Python 3.12+ · Flask 3.1 · Flask-CORS · OpenPyXL · XLRD", "Lightweight REST API, multi-sheet workbook support, automated delimiter resolution, memory-safe streaming.", MINT),
        ("Data Transformation Core", "Pandas 2.2 · NumPy Vectorization · Deterministic Engine", "Vectorized transformations, zero external heavy ML frameworks, sub-100ms response times on typical operational exports.", CORAL),
        ("Privacy & Security", "100% Local In-Memory Processing · Session Cleanup", "No persistent file storage, no cloud database dependencies, no tracking cookies, client-safe sandbox.", DARK_PLUM),
    ]

    for i, (cat, stack, desc, col) in enumerate(tech_blocks):
        x = Inches(0.9 + i * 2.85)
        card = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.3), Inches(2.7), Inches(4.5))
        card.fill.solid()
        card.fill.fore_color.rgb = WHITE
        card.line.color.rgb = LAVENDER_BORDER
        card.line.width = Pt(1)

        # Header tag
        ht = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x + Inches(0.15), Inches(2.5), Inches(2.4), Inches(0.35))
        ht.fill.solid()
        ht.fill.fore_color.rgb = PALE_WAVE
        ht.line.color.rgb = col
        ht.line.width = Pt(1)
        tf_ht = ht.text_frame
        p_ht = tf_ht.paragraphs[0]
        p_ht.text = cat.upper()
        p_ht.font.name = FONT_HEADING
        p_ht.font.size = Pt(8.5)
        p_ht.font.bold = True
        p_ht.font.color.rgb = DARK_PLUM
        p_ht.alignment = PP_ALIGN.CENTER

        tb = slide8.shapes.add_textbox(x + Inches(0.15), Inches(3.05), Inches(2.4), Inches(3.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p_stack = tf.paragraphs[0]
        p_stack.text = stack
        p_stack.font.name = FONT_HEADING
        p_stack.font.size = Pt(12)
        p_stack.font.bold = True
        p_stack.font.color.rgb = col

        p_desc = tf.add_paragraph()
        p_desc.text = "\n" + desc
        p_desc.font.name = FONT_BODY
        p_desc.font.size = Pt(10)
        p_desc.font.color.rgb = CHARCOAL

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 9: Target Market & Enterprise Value Proposition
    # ══════════════════════════════════════════════════════════════════════════
    slide9 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide9)
    add_header(slide9, "Market Impact", "Target Users & Business Value Proposition",
               "Serving analysts, ops managers, and data engineers who are bottle-necked by dirty operational exports.")

    segments = [
        ("Data Analysts & BI Teams", "Eliminate 5+ hours per week spent fixing corrupted CSV exports before loading into PowerBI, Tableau, or Snowflake.", ELECTRIC_VIOLET),
        ("Finance & Accounting", "Catch duplicate invoices, mismatched dates, and ghost numerical values before monthly closing reconciliations.", CORAL),
        ("Operations & Supply Chain", "Clean inconsistent SKU numbers, vendor names, and warehouse location codes with standardized rules.", MINT),
        ("Growth & Marketing Ops", "Normalize messy lead lists, standardize phone/email formatting, and purge duplicate CRM contacts.", DARK_PLUM),
    ]

    for i, (title, desc, col) in enumerate(segments):
        col_idx = i % 2
        row_idx = i // 2
        x = Inches(0.9 + col_idx * 5.8)
        y = Inches(2.2 + row_idx * 2.3)

        card = slide9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.5), Inches(2.0))
        card.fill.solid()
        card.fill.fore_color.rgb = WHITE
        card.line.color.rgb = LAVENDER_BORDER
        card.line.width = Pt(1)

        # Icon Accent
        acc = slide9.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.25), y + Inches(0.25), Inches(0.35), Inches(0.35))
        acc.fill.solid()
        acc.fill.fore_color.rgb = col
        acc.line.fill.background()

        tb = slide9.shapes.add_textbox(x + Inches(0.75), y + Inches(0.18), Inches(4.5), Inches(1.6))
        tf = tb.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEADING
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = DARK_PLUM

        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.name = FONT_BODY
        p_desc.font.size = Pt(10.5)
        p_desc.font.color.rgb = CHARCOAL

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 10: Conclusion & Living Data Vision
    # ══════════════════════════════════════════════════════════════════════════
    slide10 = prs.slides.add_slide(blank_layout)
    add_background_and_waves(slide10, is_title=True)

    # Header
    tb_c = slide10.shapes.add_textbox(Inches(0.95), Inches(1.2), Inches(11.0), Inches(1.5))
    tf_c = tb_c.text_frame
    tf_c.word_wrap = True
    p = tf_c.paragraphs[0]
    p.text = "RowBot: Living Data, Perfectly Clean."
    p.font.name = FONT_HEADING
    p.font.size = Pt(38)
    p.font.bold = True
    p.font.color.rgb = DARK_PLUM

    # Visual Motif on Conclusion
    add_data_transformation_motif(slide10, Inches(1.0), Inches(2.6), Inches(5.2), Inches(2.2))

    # Right: Summary Highlights
    sum_card = slide10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.6), Inches(2.4), Inches(5.8), Inches(4.2))
    sum_card.fill.solid()
    sum_card.fill.fore_color.rgb = WHITE
    sum_card.line.color.rgb = ELECTRIC_VIOLET
    sum_card.line.width = Pt(1.5)

    tb_sc = slide10.shapes.add_textbox(Inches(6.85), Inches(2.55), Inches(5.3), Inches(3.9))
    tf_sc = tb_sc.text_frame
    tf_sc.word_wrap = True

    p_sc = tf_sc.paragraphs[0]
    p_sc.text = "Key Takeaways for Judges & Stakeholders"
    p_sc.font.name = FONT_HEADING
    p_sc.font.size = Pt(16)
    p_sc.font.bold = True
    p_sc.font.color.rgb = DARK_PLUM

    takeaways = [
        "1. Working Full-Stack Product: Real file uploads, real data transformations, actual downloadable outputs.",
        "2. Explainable AI: 0–100 Quality scoring with transparent penalties and full audit certificate.",
        "3. Natural Language Power: Plain-English commands mapped to safe, reversible Pandas code.",
        "4. Private & Lightweight: Runs smoothly on standard laptops with zero external dependencies.",
        "5. Hackathon Demonstration: Ready for live file drop with instant quality score impact."
    ]
    for ta in takeaways:
        p_ta = tf_sc.add_paragraph()
        p_ta.text = ta
        p_ta.font.name = FONT_BODY
        p_ta.font.size = Pt(10.5)
        p_ta.font.color.rgb = CHARCOAL

    # Bottom Tagline Bar
    tag_bar = slide10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(5.2), Inches(5.2), Inches(1.4))
    tag_bar.fill.solid()
    tag_bar.fill.fore_color.rgb = CARD_SUBTLE
    tag_bar.line.color.rgb = SOFT_PURPLE
    tag_bar.line.width = Pt(1)
    tf_tb = tag_bar.text_frame
    p_tb1 = tf_tb.paragraphs[0]
    p_tb1.text = "“Messy Data In. Clean Data Out.”"
    p_tb1.font.name = FONT_HEADING
    p_tb1.font.size = Pt(16)
    p_tb1.font.bold = True
    p_tb1.font.color.rgb = DARK_PLUM
    p_tb1.alignment = PP_ALIGN.CENTER

    p_tb2 = tf_tb.add_paragraph()
    p_tb2.text = "Experience the live app at http://localhost:5173"
    p_tb2.font.name = FONT_BODY
    p_tb2.font.size = Pt(11)
    p_tb2.font.color.rgb = ELECTRIC_VIOLET
    p_tb2.alignment = PP_ALIGN.CENTER

    # Save presentation
    prs.save(output_path)
    print(f"Successfully generated PowerPoint presentation at: {output_path}")

if __name__ == '__main__':
    target = os.path.join(r"c:\Users\keerthna&eshwar\OneDrive\Desktop\ROWBOT", "RowBot_Presentation.pptx")
    create_rowbot_deck(target)
