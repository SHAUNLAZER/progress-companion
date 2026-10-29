const fs = require('fs');

const cssPath = 'C:/Users/shaun/.gemini/antigravity/scratch/bodywise-progress-companion/style.css';
let css = fs.readFileSync(cssPath, 'utf8');

const newCSSAdditions = `
/* ============================================================
   HERO POLISH & PLACARD ENHANCEMENTS (AUDIT FIXES)
   ============================================================ */

/* Hero Split & Spacing */
.hero-card-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--border-light);
}

.hero-card-tag {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary-blue);
}

.hero-card-meta {
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.journey-labels {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-light);
}

.journey-labels span {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--deep-navy);
  background: #F0F7FD;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid #D1E5F8;
  white-space: nowrap;
}

.hero-cta-group {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  margin-top: 24px;
}

.privacy-badge {
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.hero-benefits {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 22px 0 10px 0;
}

.benefit-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--deep-navy);
  background: #F8FAFC;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  border: 1px solid #E2E8F0;
  max-width: fit-content;
}

/* ============================================================
   SLEEK VERTICAL PROGRESS STEPPER (DESKTOP RAIL FIX - IMAGE 4)
   ============================================================ */

#desktop-rail {
  width: 220px !important;
  flex-shrink: 0;
  position: sticky;
  top: 96px;
  height: calc(100vh - 120px);
  padding: 24px 16px 24px var(--gutter);
  display: block;
}

.rail-list {
  list-style: none !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.rail-list::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 14px;
  bottom: 14px;
  width: 2px;
  background: #E2E8F0;
  z-index: 0;
}

.rail-btn {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  display: flex !important;
  align-items: center !important;
  gap: 12px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  transition: all var(--dur-fast) ease;
  text-align: left;
  position: relative;
  z-index: 1;
  width: 100%;
}

.rail-btn:hover {
  background: rgba(11, 94, 158, 0.06) !important;
}

.rail-dot {
  width: 22px !important;
  height: 22px !important;
  border-radius: 50% !important;
  background: #FFFFFF !important;
  border: 2px solid #CBD5E1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0;
  transition: all var(--dur-fast) ease;
}

.rail-dot.done {
  background: var(--primary-blue) !important;
  border-color: var(--primary-blue) !important;
  color: #FFFFFF !important;
}

.rail-dot.done svg {
  width: 12px !important;
  height: 12px !important;
  stroke: #FFFFFF !important;
  stroke-width: 3.5 !important;
}

.rail-btn.active .rail-dot {
  border-color: var(--primary-blue) !important;
  box-shadow: 0 0 0 4px rgba(11, 94, 158, 0.2) !important;
}

.rail-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color var(--dur-fast) ease;
}

.rail-btn.active .rail-label,
.rail-btn:hover .rail-label {
  color: var(--deep-navy);
  font-weight: 700;
}

/* ============================================================
   MODERN TIMELINE PLACARDS (AUDIT FIX - IMAGE 5)
   ============================================================ */

.timeline {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.milestone {
  background: var(--surface-white) !important;
  border: 1.5px solid var(--border-light) !important;
  border-radius: var(--radius-lg) !important;
  padding: 24px 28px !important;
  box-shadow: 0 4px 18px rgba(15, 45, 94, 0.05) !important;
  transition: all var(--dur-fast) ease;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.milestone:hover {
  border-color: #CBD5E1 !important;
  box-shadow: 0 8px 24px rgba(15, 45, 94, 0.09) !important;
}

.milestone.current {
  border-color: var(--primary-blue) !important;
  background: #FDFEFF !important;
  box-shadow: 0 0 0 3px rgba(11, 94, 158, 0.14), 0 8px 28px rgba(11, 94, 158, 0.1) !important;
}

.milestone-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.milestone-duration-pill {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--deep-navy);
  background: #EFF6FF;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid #BFDBFE;
}

.milestone-title {
  font-size: 1.18rem;
  font-weight: 700;
  color: var(--deep-navy);
  margin: 0;
}

.milestone-desc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.milestone-desc-item {
  font-size: 0.94rem;
  color: var(--text-secondary);
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.milestone-desc-item svg {
  flex-shrink: 0;
  margin-top: 3px;
  color: var(--primary-blue);
}

/* ============================================================
   CINEMATIC BRAND INTRO ANIMATION (6-7s LILAC STAGE)
   ============================================================ */

.intro-stage {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: #F3E8FF;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.85s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.65s ease;
  overflow: hidden;
}

.intro-stage.dismissed {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
}

.intro-skip-btn {
  position: absolute;
  top: 24px;
  right: 28px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(15, 45, 94, 0.15);
  color: #0F2D5E;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all var(--dur-fast) ease;
}

.intro-skip-btn:hover {
  background: #FFFFFF;
  transform: translateY(-1px);
}

.intro-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  transform-origin: center;
  transition: all 0.75s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.intro-svg {
  width: 220px;
  height: 220px;
}

/* Strokes for B, +, W */
.intro-draw-path {
  stroke: #0F2D5E;
  stroke-width: 7px;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke-dasharray: 600;
  stroke-dashoffset: 600;
  animation: introDrawStroke 1.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

#intro-stroke-plus {
  animation-delay: 1.1s;
}

#intro-stroke-w {
  animation-delay: 1.4s;
}

@keyframes introDrawStroke {
  to {
    stroke-dashoffset: 0;
  }
}

/* Final Figure Group */
.intro-final-figure {
  opacity: 0;
  transform-origin: center;
  transition: opacity 0.6s ease, transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.intro-final-figure.revealed {
  opacity: 1;
  animation: introFigureSettle 1.8s ease-in-out infinite alternate;
}

@keyframes introFigureSettle {
  from { transform: scale(1); }
  to { transform: scale(1.03) translateY(-3px); }
}

.intro-wordmark {
  text-align: center;
  font-size: 2.1rem;
  font-weight: 800;
  color: #0F2D5E;
  letter-spacing: 0.05em;
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.intro-wordmark.revealed {
  opacity: 1;
  transform: translateY(0);
}

/* ============================================================
   SHOP OFFICIAL FORMULAS BUTTON IN HEADER
   ============================================================ */

.header-shop-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary-blue);
  background: #F0F7FD;
  border: 1px solid #D1E5F8;
  padding: 7px 14px;
  border-radius: var(--radius-pill);
  text-decoration: none;
  transition: all var(--dur-fast) ease;
}

.header-shop-btn:hover {
  background: var(--primary-blue);
  color: #FFFFFF;
  border-color: var(--primary-blue);
  transform: translateY(-1px);
}
`;

fs.writeFileSync(cssPath, css + '\n' + newCSSAdditions, 'utf8');
console.log('Successfully updated style.css with hero, stepper, placards, and intro animation styles!');
