'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface KpiTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  type: 'quantitative' | 'qualitative';
  period: 'monthly' | 'quarterly' | 'annual';
  unit: string;
  targetExample: string;
  tags: string[];
  color: string;
}

const TEMPLATES: KpiTemplate[] = [
  {
    id: 't1', category: 'Revenue', name: 'Revenue Growth Rate', description: 'Measures percentage increase in total revenue over a defined period. Core financial health indicator.',
    type: 'quantitative', period: 'quarterly', unit: '%', targetExample: '15%', tags: ['Finance', 'Growth'], color: '#1a7a4a',
  },
  {
    id: 't2', category: 'Customer', name: 'Customer Satisfaction (CSAT)', description: 'Tracks customer satisfaction scores from surveys and feedback forms. Key CX metric.',
    type: 'quantitative', period: 'monthly', unit: 'score', targetExample: '4.5/5', tags: ['CX', 'NPS'], color: '#1854a8',
  },
  {
    id: 't3', category: 'Operations', name: 'Operational Efficiency Index', description: 'Composite score of process throughput, defect rate, and cycle time. Used by ops leadership.',
    type: 'quantitative', period: 'monthly', unit: '%', targetExample: '92%', tags: ['Ops', 'Efficiency'], color: '#b45309',
  },
  {
    id: 't4', category: 'HR', name: 'Employee Engagement Score', description: 'Quarterly pulse survey result tracking workforce motivation, belonging, and satisfaction.',
    type: 'quantitative', period: 'quarterly', unit: '%', targetExample: '80%', tags: ['HR', 'Culture'], color: '#7c3aed',
  },
  {
    id: 't5', category: 'Revenue', name: 'Net Revenue Retention (NRR)', description: 'Measures revenue retained from existing customers including expansions and churns.',
    type: 'quantitative', period: 'monthly', unit: '%', targetExample: '110%', tags: ['Finance', 'SaaS'], color: '#1a7a4a',
  },
  {
    id: 't6', category: 'Customer', name: 'Customer Churn Rate', description: 'Percentage of customers who cancelled or didn\'t renew in a given period.',
    type: 'quantitative', period: 'monthly', unit: '%', targetExample: '<3%', tags: ['CX', 'Retention'], color: '#b91c1c',
  },
  {
    id: 't7', category: 'Operations', name: 'On-Time Delivery Rate', description: 'Tracks the percentage of deliveries or releases completed within the committed timeline.',
    type: 'quantitative', period: 'monthly', unit: '%', targetExample: '95%', tags: ['Ops', 'Delivery'], color: '#b45309',
  },
  {
    id: 't8', category: 'HR', name: 'Time to Hire', description: 'Average number of days from job opening to accepted offer. Tracks recruitment efficiency.',
    type: 'quantitative', period: 'quarterly', unit: 'days', targetExample: '30', tags: ['HR', 'Recruiting'], color: '#0e7490',
  },
  {
    id: 't9', category: 'Revenue', name: 'Average Contract Value (ACV)', description: 'Average annualized revenue per contract. Useful for tracking deal quality over time.',
    type: 'quantitative', period: 'quarterly', unit: 'USD', targetExample: '$50,000', tags: ['Finance', 'Sales'], color: '#1a7a4a',
  },
];

const CATEGORIES = ['All', 'Revenue', 'Customer', 'Operations', 'HR'];

export default function TemplatesPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = TEMPLATES.filter((t) => {
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()) || t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const categoryCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === 'All' ? TEMPLATES.length : TEMPLATES.filter((t) => t.category === cat).length;
    return acc;
  }, {});

  return (
    <div style={{ padding: '22px 26px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px', marginBottom: 3, color: '#111110' }}>KPI Templates</div>
          <div style={{ fontSize: 12, color: '#8a8580' }}>Pre-built templates across Revenue, Customer, Operations, and HR. Customize after applying.</div>
        </div>
        <button
          onClick={() => router.push('/kpis/new')}
          style={{ padding: '9px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: '#000', color: '#fff', border: '1px solid #000', fontFamily: 'inherit' }}>
          + Create Custom KPI
        </button>
      </div>

      {/* Search + Category filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#111110', fontFamily: 'inherit', outline: 'none', width: 240 }}
          onFocus={(e) => (e.target.style.borderColor = '#000')}
          onBlur={(e) => (e.target.style.borderColor = '#e2dfd8')}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{ padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: activeCategory === cat ? 700 : 500, cursor: 'pointer', background: activeCategory === cat ? '#000' : '#fff', color: activeCategory === cat ? '#fff' : '#4a4640', border: `1.5px solid ${activeCategory === cat ? '#000' : '#e2dfd8'}`, fontFamily: 'inherit', transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 5 }}>
              {cat}
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: activeCategory === cat ? 'rgba(255,255,255,.25)' : '#f0efec', color: activeCategory === cat ? '#fff' : '#8a8580' }}>{categoryCounts[cat]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div style={{ border: '2px dashed #e2dfd8', borderRadius: 14, padding: '48px 20px', textAlign: 'center', background: '#f8f7f5' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#4a4640', marginBottom: 4 }}>No templates found</p>
          <p style={{ fontSize: 12, color: '#8a8580' }}>Try a different search or category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map((tmpl) => (
            <div
              key={tmpl.id}
              onMouseEnter={() => setHovered(tmpl.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ background: '#fff', border: '1.5px solid #e2dfd8', borderTop: `3px solid ${tmpl.color}`, borderRadius: 12, padding: '16px 18px', boxShadow: hovered === tmpl.id ? '0 4px 16px rgba(0,0,0,.1)' : '0 1px 3px rgba(0,0,0,.06)', transition: 'box-shadow .15s, transform .15s', transform: hovered === tmpl.id ? 'translateY(-2px)' : 'none', cursor: 'default' }}>
              {/* Category + type badges */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2.5px 7px', borderRadius: 4, background: `${tmpl.color}18`, color: tmpl.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>{tmpl.category}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2.5px 7px', borderRadius: 4, background: '#f0efec', color: '#8a8580', textTransform: 'capitalize' }}>{tmpl.period}</span>
              </div>

              {/* Name */}
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111110', marginBottom: 6, letterSpacing: '-.1px', lineHeight: 1.3 }}>{tmpl.name}</div>
              <p style={{ fontSize: 12, color: '#8a8580', lineHeight: 1.5, margin: '0 0 12px', minHeight: 48 }}>{tmpl.description}</p>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1, background: '#f8f7f5', borderRadius: 6, padding: '6px 10px' }}>
                  <div style={{ fontSize: 9.5, color: '#8a8580', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Unit</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111110' }}>{tmpl.unit}</div>
                </div>
                <div style={{ flex: 1, background: '#f8f7f5', borderRadius: 6, padding: '6px 10px' }}>
                  <div style={{ fontSize: 9.5, color: '#8a8580', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Example Target</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111110' }}>{tmpl.targetExample}</div>
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                {tmpl.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#f0efec', color: '#4a4640' }}>{tag}</span>
                ))}
              </div>

              {/* Use template button */}
              <button
                onClick={() => router.push(`/kpis/new?template=${tmpl.id}`)}
                style={{ width: '100%', padding: '8px 0', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: hovered === tmpl.id ? '#000' : '#f0efec', color: hovered === tmpl.id ? '#fff' : '#111110', border: `1px solid ${hovered === tmpl.id ? '#000' : '#e2dfd8'}`, fontFamily: 'inherit', transition: 'all .14s' }}>
                Use Template →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <div style={{ marginTop: 20, padding: '12px 16px', background: '#f8f7f5', border: '1px solid #e2dfd8', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#8a8580' }}>💡</span>
        <span style={{ fontSize: 12, color: '#8a8580' }}>Templates are starting points. After applying, you can customize the name, target, frequency, and assign it to a specific team member.</span>
      </div>
    </div>
  );
}
