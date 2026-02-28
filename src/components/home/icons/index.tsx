// src/components/home/icons/index.tsx
// MazayaGo Homepage SVG Icons — Brand colors from logo
'use client';

import React from 'react';

// Brand palette
const C = {
  teal: '#14C3BF',
  tealDk: '#0FA8A5',
  orange: '#F89437',
  orangeDk: '#E07D1F',
  green: '#77C738',
  dark: '#1A2332',
  darkMid: '#2C3E50',
  gray: '#5A6B7E',
  grayLt: '#8B95A1',
  grayMuted: '#CED4DA',
  white: '#FFFFFF',
  gold: '#D4AF37',
  goldLt: '#F5E6B3',
};

type IconProps = { size?: number; color?: string };

/* ═══════════════════════════════════
   SERVICE ICONS (3 core services)
   ═══════════════════════════════════ */

export const RafflesIcon = ({ size = 64, color = C.teal }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect x="8" y="20" width="48" height="28" rx="4" fill={`${color}20`} />
    <rect x="6" y="18" width="48" height="28" rx="4" fill={color} />
    <line x1="20" y1="18" x2="20" y2="46" stroke="white" strokeWidth="2" strokeDasharray="4 3" />
    <circle cx="38" cy="32" r="12" fill={C.orange} />
    <path d="M38 24L40 29H45L41 33L43 38L38 35L33 38L35 33L31 29H36L38 24Z" fill="white" />
  </svg>
);

export const RiddlesIcon = ({ size = 64, color = C.teal }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <circle cx="34" cy="34" r="22" fill={`${C.orange}20`} />
    <circle cx="32" cy="32" r="22" fill={color} />
    <text x="32" y="42" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">?</text>
    <circle cx="50" cy="14" r="8" fill={C.orange} />
  </svg>
);

export const PredictionsIcon = ({ size = 64, color = C.teal }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="54" rx="14" ry="4" fill={`${color}40`} />
    <rect x="24" y="48" width="16" height="8" rx="2" fill={color} />
    <circle cx="32" cy="28" r="18" fill={color} />
    <circle cx="32" cy="28" r="12" fill={`${C.orange}40`} />
    <circle cx="32" cy="28" r="4" fill={C.orange} />
  </svg>
);

/* ═══════════════════════════════════
   WHY ICONS — Audience mode
   ═══════════════════════════════════ */

export const FairChanceIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="22" y="8" width="4" height="28" rx="1" fill={C.teal} />
    <rect x="18" y="36" width="12" height="4" rx="2" fill={C.teal} />
    <rect x="10" y="16" width="28" height="3" rx="1" fill={C.teal} />
    <ellipse cx="12" cy="28" rx="6" ry="2" fill={C.orange} />
    <ellipse cx="36" cy="28" rx="6" ry="2" fill={C.orange} />
    <circle cx="40" cy="10" r="6" fill={C.green} />
  </svg>
);

export const EasyJoinIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="28" r="16" fill={`${C.teal}20`} />
    <path d="M24 14C20 14 16 16 16 22V32C16 36 20 40 24 40C28 40 32 36 32 32V22C32 16 28 14 24 14Z" fill={C.teal} />
    <ellipse cx="24" cy="20" rx="4" ry="6" fill="white" />
    <circle cx="38" cy="12" r="6" fill={C.orange} />
    <path d="M36 12L38 14L40 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const RealPrizesIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="10" y="20" width="28" height="20" rx="3" fill={C.orange} />
    <rect x="8" y="14" width="32" height="8" rx="2" fill={C.teal} />
    <circle cx="24" cy="14" r="4" fill={C.orange} />
    <circle cx="40" cy="10" r="5" fill={C.green} />
  </svg>
);

export const GuaranteedFunIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="18" fill={C.orange} />
    <circle cx="18" cy="20" r="3" fill="white" />
    <circle cx="30" cy="20" r="3" fill="white" />
    <circle cx="18" cy="20" r="1.5" fill={C.dark} />
    <circle cx="30" cy="20" r="1.5" fill={C.dark} />
    <path d="M16 28C16 28 20 34 24 34C28 34 32 28 32 28" stroke="white" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/* ═══════════════════════════════════
   WHY ICONS — Business mode
   ═══════════════════════════════════ */

export const TransparencyIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <ellipse cx="24" cy="24" rx="16" ry="10" fill={C.teal} />
    <circle cx="24" cy="24" r="8" fill="white" />
    <circle cx="24" cy="24" r="5" fill={C.orange} />
    <circle cx="24" cy="24" r="2" fill={C.dark} />
    <circle cx="40" cy="12" r="6" fill={C.green} />
  </svg>
);

export const EasyLaunchIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M24 8C24 8 32 12 32 24L28 32H20L16 24C16 12 24 8 24 8Z" fill={C.teal} />
    <circle cx="24" cy="18" r="4" fill="white" />
    <path d="M20 32L24 42L28 32" fill={C.orange} />
  </svg>
);

export const RealDataIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="8" width="36" height="32" rx="4" fill={`${C.teal}15`} />
    <rect x="12" y="26" width="6" height="12" rx="1" fill={`${C.teal}50`} />
    <rect x="21" y="18" width="6" height="20" rx="1" fill={C.teal} />
    <rect x="30" y="14" width="6" height="24" rx="1" fill={C.orange} />
    <path d="M12 32L21 24L30 18L38 12" stroke={C.green} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ProfessionalIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="10" y="6" width="28" height="36" rx="4" fill={C.teal} />
    <rect x="13" y="12" width="22" height="24" rx="2" fill="white" />
    <rect x="16" y="15" width="16" height="3" rx="1" fill={C.teal} />
    <rect x="16" y="30" width="8" height="4" rx="1" fill={C.orange} />
  </svg>
);

/* ═══════════════════════════════════
   INDUSTRY ICONS (Business use cases)
   ═══════════════════════════════════ */

export const RestaurantsIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <ellipse cx="24" cy="32" rx="14" ry="5" fill={C.teal} />
    <path d="M12 8V14M14 8V12M16 8V14M12 14C12 18 14 20 14 20V28" stroke={C.teal} strokeWidth="2" strokeLinecap="round" />
    <path d="M36 8C36 8 38 10 38 16V28" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="40" cy="12" r="5" fill={C.orange} />
  </svg>
);

export const SupermarketIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M8 12H12L16 32H38L42 16H14" stroke={C.teal} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="18" cy="38" r="4" fill={C.teal} />
    <circle cx="36" cy="38" r="4" fill={C.teal} />
    <circle cx="40" cy="10" r="5" fill={C.orange} />
  </svg>
);

export const BrandsIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M12 8L36 8C38 8 40 10 40 12V32L24 44L8 32V12C8 10 10 8 12 8Z" fill={C.teal} />
    <circle cx="24" cy="16" r="4" fill="white" />
    <rect x="16" y="24" width="16" height="3" rx="1" fill="white" />
  </svg>
);

export const TvChannelsIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="6" y="12" width="36" height="26" rx="3" fill={C.teal} />
    <rect x="10" y="16" width="28" height="18" rx="2" fill={C.dark} />
    <path d="M20 20L32 25L20 30Z" fill={C.orange} />
  </svg>
);

export const SportsStoresIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="18" fill={C.teal} />
    <circle cx="24" cy="24" r="16" fill="white" />
    <path d="M24 14L30 18L28 26L20 26L18 18Z" fill={C.teal} />
  </svg>
);

export const EducationalIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M24 10L4 20L24 30L44 20L24 10Z" fill={C.teal} />
    <path d="M12 22V34C12 34 18 40 24 40C30 40 36 34 36 34V22" fill={`${C.teal}70`} />
    <path d="M40 20V32" stroke={C.orange} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ═══════════════════════════════════
   USER TYPE ICONS (Audience use cases)
   ═══════════════════════════════════ */

export const ShopperIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M10 16L14 40H34L38 16H10Z" fill={C.teal} />
    <path d="M16 16V12C16 8 20 6 24 6C28 6 32 8 32 12V16" stroke={C.teal} strokeWidth="3" fill="none" />
    <circle cx="40" cy="12" r="6" fill={C.orange} />
  </svg>
);

export const LuckHunterIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="18" r="8" fill={C.green} />
    <circle cx="18" cy="24" r="8" fill={C.green} />
    <circle cx="30" cy="24" r="8" fill={C.green} />
    <circle cx="24" cy="30" r="8" fill={C.green} />
    <path d="M24 34V42" stroke={C.green} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const KnowledgeIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="20" r="14" fill={C.teal} />
    <circle cx="24" cy="20" r="6" fill={C.orange} />
    <rect x="22" y="26" width="4" height="4" rx="1" fill={C.orange} />
  </svg>
);

export const RiddleLoverIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="8" y="8" width="14" height="14" rx="2" fill={C.teal} />
    <rect x="26" y="8" width="14" height="14" rx="2" fill={C.orange} />
    <rect x="8" y="26" width="14" height="14" rx="2" fill={C.orange} />
    <rect x="26" y="26" width="14" height="14" rx="2" fill={C.teal} />
    <text x="15" y="18" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">?</text>
  </svg>
);

export const SportsFanIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M16 10H32V20C32 28 28 32 24 32C20 32 16 28 16 20V10Z" fill={C.orange} />
    <rect x="22" y="32" width="4" height="6" fill={C.orange} />
    <rect x="18" y="38" width="12" height="4" rx="1" fill={C.teal} />
  </svg>
);

export const SeriesFollowerIcon = ({ size = 48 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M12 18L16 42H32L36 18H12Z" fill={C.orange} />
    <circle cx="18" cy="14" r="4" fill={`${C.teal}40`} />
    <circle cx="24" cy="12" r="5" fill={`${C.teal}40`} />
    <circle cx="30" cy="14" r="4" fill={`${C.teal}40`} />
  </svg>
);

/* ═══════════════════════════════════
   COMPARISON ICONS
   ═══════════════════════════════════ */

export const CheckIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={C.green} />
    <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const CrossIcon = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={C.grayLt} />
    <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* ═══════════════════════════════════
   HERO GRAPHICS
   ═══════════════════════════════════ */

export const AudienceHeroGraphic = () => (
  <svg viewBox="0 0 400 380" className="h-full w-full">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F5E6B3" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#B8860B" />
      </linearGradient>
      <linearGradient id="coinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#B8860B" />
      </linearGradient>
    </defs>
    <circle cx="200" cy="180" r="140" fill={`${C.teal}08`} />
    <circle cx="200" cy="180" r="100" fill={`${C.orange}06`} />
    <path d="M280 60C280 60 240 80 240 130C240 180 280 200 280 200C250 195 225 165 225 130C225 95 250 65 280 60Z" fill="url(#goldGrad)" />
    <circle cx="290" cy="75" r="8" fill={C.gold} />
    <rect x="130" y="200" width="140" height="100" rx="8" fill={C.orange} />
    <rect x="190" y="200" width="20" height="100" fill={C.teal} />
    <rect x="120" y="180" width="160" height="25" rx="6" fill={C.teal} />
    <ellipse cx="200" cy="175" rx="25" ry="12" fill={C.orange} />
    <circle cx="200" cy="175" r="8" fill={C.gold} />
    <g transform="translate(80, 100)">
      <ellipse cx="0" cy="-3" rx="25" ry="8" fill="url(#coinGrad)" />
      <text x="0" y="1" textAnchor="middle" fill="#B8860B" fontSize="12" fontWeight="bold">$</text>
    </g>
    <g transform="translate(320, 130)">
      <ellipse cx="0" cy="-3" rx="20" ry="6" fill="url(#coinGrad)" />
      <text x="0" y="0" textAnchor="middle" fill="#B8860B" fontSize="10" fontWeight="bold">$</text>
    </g>
    <polygon points="100,60 103,70 114,70 105,76 108,86 100,80 92,86 95,76 86,70 97,70" fill={C.gold} opacity="0.8" />
  </svg>
);

export const BusinessHeroGraphic = () => (
  <svg viewBox="0 0 400 380" className="h-full w-full">
    <defs>
      <linearGradient id="goldGradB" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F5E6B3" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#B8860B" />
      </linearGradient>
      <linearGradient id="chartGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor={C.teal} stopOpacity="0.3" />
        <stop offset="100%" stopColor={C.teal} />
      </linearGradient>
    </defs>
    <circle cx="200" cy="190" r="150" fill={`${C.orange}06`} />
    <g transform="translate(280, 30)">
      <path d="M50 10C50 10 20 25 20 65C20 105 50 120 50 120C25 116 5 92 5 65C5 38 25 14 50 10Z" fill="url(#goldGradB)" />
      <circle cx="58" cy="20" r="6" fill={C.gold} />
    </g>
    <rect x="60" y="100" width="180" height="130" rx="16" fill="white" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.1))" />
    <rect x="75" y="115" width="80" height="8" rx="4" fill={C.orange} />
    <rect x="75" y="130" width="50" height="5" rx="2" fill={C.grayMuted} />
    <rect x="75" y="145" width="150" height="70" rx="8" fill={`${C.teal}08`} />
    <path d="M85 195 L110 175 L135 185 L160 160 L185 145 L210 130" stroke={C.teal} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M85 195 L110 175 L135 185 L160 160 L185 145 L210 130 L210 210 L85 210 Z" fill="url(#chartGrad)" opacity="0.3" />
    <circle cx="110" cy="175" r="4" fill={C.orange} />
    <circle cx="160" cy="160" r="4" fill={C.orange} />
    <circle cx="210" cy="130" r="5" fill={C.green} />
    <rect x="200" y="160" width="140" height="100" rx="12" fill="white" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.1))" />
    <circle cx="240" cy="200" r="25" fill={`${C.orange}15`} />
    <rect x="280" y="185" width="45" height="6" rx="3" fill={C.teal} />
    <rect x="280" y="198" width="35" height="5" rx="2" fill={C.grayMuted} />
    <g transform="translate(305, 235)">
      <circle cx="0" cy="0" r="12" fill={C.green} />
      <path d="M-5 3 L0 -5 L5 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </g>
    <polygon points="50,80 52,86 58,86 54,90 55,96 50,93 45,96 46,90 42,86 48,86" fill={C.gold} opacity="0.7" />
  </svg>
);
