import React from 'react';
import './AnatomyMannequin.css';

/**
 * Interactive SVG Human Anatomy Mannequin
 * Renders both Anterior (Front) and Posterior (Back) views
 * Highlights active muscle groups with neon glow.
 */
export default function AnatomyMannequin({ selectedGroup, onSelectGroup, view = 'both' }) {
  // Normalize group keys: 'peito' | 'costas' | 'ombros' | 'biceps' | 'triceps' | 'pernas' | 'abdomen' | 'antebraco' | 'trapezio'
  const norm = (selectedGroup || '').toLowerCase();

  const isChest = norm.includes('peit');
  const isBack = norm.includes('cost') || norm.includes('dors');
  const isShoulders = norm.includes('omb') || norm.includes('delt');
  const isBiceps = norm.includes('bíc') || norm.includes('bic');
  const isTriceps = norm.includes('tríc') || norm.includes('tric');
  const isLegs = norm.includes('pern') || norm.includes('quad') || norm.includes('post') || norm.includes('pant') || norm.includes('coxa') || norm.includes('glút');
  const isAbs = norm.includes('abd') || norm.includes('core');
  const isForearms = norm.includes('anteb');
  const isTraps = norm.includes('trap');

  return (
    <div className="anatomy-mannequin-container">
      <div className="mannequin-figures-row">
        {/* FRONT / ANTERIOR VIEW */}
        <div className="mannequin-figure-box">
          <span className="mannequin-view-label">Frente</span>
          <svg viewBox="0 0 200 380" className="anatomy-svg" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="glow-neon" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Head & Neck Base */}
            <ellipse cx="100" cy="35" rx="16" ry="20" className="mannequin-base-part" />
            <path d="M 92 53 L 90 68 L 110 68 L 108 53 Z" className="mannequin-base-part" />

            {/* Traps (Front) */}
            <path 
              d="M 88 56 L 70 72 L 90 68 Z M 112 56 L 130 72 L 110 68 Z" 
              className={`muscle-path ${isTraps ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Trapézio')}
            />

            {/* Shoulders / Deltoids (Front) */}
            <path 
              d="M 68 72 C 55 76 48 90 52 105 C 57 106 66 98 72 88 C 74 80 72 74 68 72 Z" 
              className={`muscle-path ${isShoulders ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Ombros')}
            />
            <path 
              d="M 132 72 C 145 76 152 90 148 105 C 143 106 134 98 128 88 C 126 80 128 74 132 72 Z" 
              className={`muscle-path ${isShoulders ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Ombros')}
            />

            {/* Chest / Peitoral */}
            <path 
              d="M 72 74 L 98 74 L 98 108 C 84 108 72 100 70 88 Z" 
              className={`muscle-path ${isChest ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Peitoral')}
            />
            <path 
              d="M 128 74 L 102 74 L 102 108 C 116 108 128 100 130 88 Z" 
              className={`muscle-path ${isChest ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Peitoral')}
            />

            {/* Biceps */}
            <path 
              d="M 52 105 C 48 116 48 132 55 142 C 60 140 64 128 64 116 C 64 108 58 104 52 105 Z" 
              className={`muscle-path ${isBiceps ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Bíceps')}
            />
            <path 
              d="M 148 105 C 152 116 152 132 145 142 C 140 140 136 128 136 116 C 136 108 142 104 148 105 Z" 
              className={`muscle-path ${isBiceps ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Bíceps')}
            />

            {/* Forearms (Front) */}
            <path 
              d="M 54 144 C 44 158 40 180 46 195 L 53 194 C 58 180 62 160 62 144 Z" 
              className={`muscle-path ${isForearms ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Antebraço')}
            />
            <path 
              d="M 146 144 C 156 158 160 180 154 195 L 147 194 C 142 180 138 160 138 144 Z" 
              className={`muscle-path ${isForearms ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Antebraço')}
            />
            {/* Hands */}
            <circle cx="48" cy="205" r="7" className="mannequin-base-part" />
            <circle cx="152" cy="205" r="7" className="mannequin-base-part" />

            {/* Abdomen / Core */}
            {/* Upper Abs */}
            <path 
              d="M 76 112 L 98 112 L 98 126 L 76 126 Z M 102 112 L 124 112 L 124 126 L 102 126 Z" 
              className={`muscle-path ${isAbs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Abdômen')}
            />
            {/* Middle Abs */}
            <path 
              d="M 77 129 L 98 129 L 98 144 L 78 144 Z M 102 129 L 123 129 L 122 144 L 102 144 Z" 
              className={`muscle-path ${isAbs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Abdômen')}
            />
            {/* Lower Abs & Obliques */}
            <path 
              d="M 79 147 L 98 147 L 98 165 L 82 163 Z M 102 147 L 121 147 L 118 163 L 102 165 Z" 
              className={`muscle-path ${isAbs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Abdômen')}
            />
            {/* Obliques */}
            <path 
              d="M 70 115 C 68 135 72 155 78 165 L 75 167 C 68 152 65 130 68 115 Z" 
              className={`muscle-path ${isAbs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Abdômen')}
            />
            <path 
              d="M 130 115 C 132 135 128 155 122 165 L 125 167 C 132 152 135 130 132 115 Z" 
              className={`muscle-path ${isAbs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Abdômen')}
            />

            {/* Pelvis base */}
            <path d="M 80 167 L 120 167 L 100 186 Z" className="mannequin-base-part" />

            {/* Thighs / Quadriceps (Front) */}
            <path 
              d="M 76 172 C 65 190 62 230 70 262 C 78 263 88 260 92 245 C 96 225 96 195 96 176 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />
            <path 
              d="M 124 172 C 135 190 138 230 130 262 C 122 263 112 260 108 245 C 104 225 104 195 104 176 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />

            {/* Knees */}
            <circle cx="78" cy="272" r="7" className="mannequin-base-part" />
            <circle cx="122" cy="272" r="7" className="mannequin-base-part" />

            {/* Calves & Shins (Front) */}
            <path 
              d="M 72 280 C 64 300 66 332 72 352 L 84 352 C 88 335 88 305 84 280 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />
            <path 
              d="M 128 280 C 136 300 134 332 128 352 L 116 352 C 112 335 112 305 116 280 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />

            {/* Feet */}
            <path d="M 68 354 L 84 354 L 80 370 L 62 370 Z" className="mannequin-base-part" />
            <path d="M 132 354 L 116 354 L 120 370 L 138 370 Z" className="mannequin-base-part" />
          </svg>
        </div>

        {/* BACK / POSTERIOR VIEW */}
        <div className="mannequin-figure-box">
          <span className="mannequin-view-label">Costas</span>
          <svg viewBox="0 0 200 380" className="anatomy-svg" xmlns="http://www.w3.org/2000/svg">
            {/* Head & Neck Back */}
            <ellipse cx="100" cy="35" rx="16" ry="20" className="mannequin-base-part" />
            <path d="M 92 53 L 90 68 L 110 68 L 108 53 Z" className="mannequin-base-part" />

            {/* Traps & Upper Back */}
            <path 
              d="M 88 56 L 68 72 L 98 96 L 98 68 Z M 112 56 L 132 72 L 102 96 L 102 68 Z" 
              className={`muscle-path ${isTraps || isBack ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Costas')}
            />

            {/* Rear Deltoids */}
            <path 
              d="M 68 72 C 55 76 48 90 52 105 C 57 106 66 98 72 88 C 74 80 72 74 68 72 Z" 
              className={`muscle-path ${isShoulders ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Ombros')}
            />
            <path 
              d="M 132 72 C 145 76 152 90 148 105 C 143 106 134 98 128 88 C 126 80 128 74 132 72 Z" 
              className={`muscle-path ${isShoulders ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Ombros')}
            />

            {/* Lats (Dorsais / Costas) */}
            <path 
              d="M 72 88 C 65 110 68 140 76 158 L 98 152 L 98 98 Z" 
              className={`muscle-path ${isBack ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Costas')}
            />
            <path 
              d="M 128 88 C 135 110 132 140 124 158 L 102 152 L 102 98 Z" 
              className={`muscle-path ${isBack ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Costas')}
            />

            {/* Lower Back / Lombar */}
            <path 
              d="M 78 155 L 98 155 L 98 172 L 80 172 Z M 102 155 L 122 155 L 120 172 L 102 172 Z" 
              className={`muscle-path ${isBack ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Costas')}
            />

            {/* Triceps (Back of arm) */}
            <path 
              d="M 52 105 C 46 116 46 134 54 144 C 60 142 64 130 64 116 C 64 108 58 104 52 105 Z" 
              className={`muscle-path ${isTriceps ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Tríceps')}
            />
            <path 
              d="M 148 105 C 154 116 154 134 146 144 C 140 142 136 130 136 116 C 136 108 142 104 148 105 Z" 
              className={`muscle-path ${isTriceps ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Tríceps')}
            />

            {/* Forearms (Back) */}
            <path 
              d="M 54 144 C 44 158 40 180 46 195 L 53 194 C 58 180 62 160 62 144 Z" 
              className={`muscle-path ${isForearms ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Antebraço')}
            />
            <path 
              d="M 146 144 C 156 158 160 180 154 195 L 147 194 C 142 180 138 160 138 144 Z" 
              className={`muscle-path ${isForearms ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Antebraço')}
            />
            <circle cx="48" cy="205" r="7" className="mannequin-base-part" />
            <circle cx="152" cy="205" r="7" className="mannequin-base-part" />

            {/* Glutes */}
            <path 
              d="M 78 174 C 68 185 68 215 80 226 C 92 226 98 215 98 174 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />
            <path 
              d="M 122 174 C 132 185 132 215 120 226 C 108 226 102 215 102 174 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />

            {/* Hamstrings / Posteriores de Coxa */}
            <path 
              d="M 76 228 C 68 240 68 258 74 268 C 82 268 90 260 94 248 C 96 238 96 230 96 228 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />
            <path 
              d="M 124 228 C 132 240 132 258 126 268 C 118 268 110 260 106 248 C 104 238 104 230 104 228 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />

            {/* Knee backs */}
            <circle cx="78" cy="274" r="6" className="mannequin-base-part" />
            <circle cx="122" cy="274" r="6" className="mannequin-base-part" />

            {/* Calves / Panturrilhas (Back) */}
            <path 
              d="M 72 280 C 62 298 62 328 72 352 L 86 352 C 92 328 90 298 84 280 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />
            <path 
              d="M 128 280 C 138 298 138 328 128 352 L 114 352 C 108 328 110 298 116 280 Z" 
              className={`muscle-path ${isLegs ? 'active-muscle' : 'base-muscle'}`}
              onClick={() => onSelectGroup?.('Pernas')}
            />

            {/* Heels */}
            <path d="M 68 354 L 86 354 L 84 370 L 70 370 Z" className="mannequin-base-part" />
            <path d="M 132 354 L 114 354 L 116 370 L 130 370 Z" className="mannequin-base-part" />
          </svg>
        </div>
      </div>

      <div className="mannequin-active-badge">
        <span className="badge-dot" />
        <span>Músculo Ativo: <strong>{selectedGroup || 'Geral'}</strong></span>
      </div>
    </div>
  );
}
