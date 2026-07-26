'use client';

import React from 'react';

export interface TopicScoreItem {
  topic: string;
  average_score: number;
  current_level: number;
  total_questions_answered: number;
}

interface SkillRadarChartProps {
  scores: TopicScoreItem[];
}

export default function SkillRadarChart({ scores }: SkillRadarChartProps) {
  // Use scores or fallback mock metrics if few items exist
  const displayItems = scores.length >= 3 
    ? scores.slice(0, 6) 
    : [
        ...scores,
        { topic: 'Conceptual Depth', average_score: 75, current_level: 4, total_questions_answered: 5 },
        { topic: 'Problem Solving', average_score: 82, current_level: 5, total_questions_answered: 8 },
        { topic: 'Accuracy & Speed', average_score: 68, current_level: 3, total_questions_answered: 4 },
        { topic: 'Domain Knowledge', average_score: 90, current_level: 6, total_questions_answered: 10 },
      ].slice(0, 6);

  const numAxes = displayItems.length;
  const radius = 110;
  const centerX = 160;
  const centerY = 150;

  // Compute axis points
  const getCoordinates = (index: number, valPercent: number) => {
    const angle = (Math.PI * 2 / numAxes) * index - Math.PI / 2;
    const r = (valPercent / 100) * radius;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Build grid rings (20%, 40%, 60%, 80%, 100%)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridRingsPoints = rings.map(ringRatio => {
    return displayItems.map((_, i) => {
      const { x, y } = getCoordinates(i, ringRatio * 100);
      return `${x},${y}`;
    }).join(' ');
  });

  // Build user data polygon points
  const dataPoints = displayItems.map((item, i) => {
    const scoreVal = Math.max(15, Math.min(100, item.average_score));
    const { x, y } = getCoordinates(i, scoreVal);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '16px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }}></span>
          Topic Mastery & Skill Radar
        </h4>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af', background: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
          Real-Time Analytics
        </span>
      </div>

      <svg width="320" height="300" viewBox="0 0 320 300" style={{ overflow: 'visible' }}>
        {/* Background Grid Rings */}
        {gridRingsPoints.map((points, idx) => (
          <polygon
            key={idx}
            points={points}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeDasharray={idx === rings.length - 1 ? 'none' : '3 3'}
            strokeWidth="1"
          />
        ))}

        {/* Axes Lines */}
        {displayItems.map((item, i) => {
          const { x, y, angle } = getCoordinates(i, 100);
          const labelDist = radius + 22;
          const labelX = centerX + labelDist * Math.cos(angle);
          const labelY = centerY + labelDist * Math.sin(angle);

          // Truncate long topic names
          const truncatedTopic = item.topic.length > 14 ? item.topic.substring(0, 12) + '...' : item.topic;

          return (
            <g key={i}>
              <line
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
              <text
                x={labelX}
                y={labelY}
                fill="#cbd5e1"
                fontSize="10"
                fontWeight="500"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {truncatedTopic}
              </text>
            </g>
          );
        })}

        {/* User Data Polygon */}
        <polygon
          points={dataPoints}
          fill="rgba(99, 102, 241, 0.35)"
          stroke="#6366f1"
          strokeWidth="2.5"
          filter="drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))"
        />

        {/* Data Vertices */}
        {displayItems.map((item, i) => {
          const scoreVal = Math.max(15, Math.min(100, item.average_score));
          const { x, y } = getCoordinates(i, scoreVal);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4.5"
              fill="#818cf8"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
}
