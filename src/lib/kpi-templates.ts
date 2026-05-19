export type FieldType = 'text' | 'number' | 'dropdown' | 'currency' | 'percentage' | 'date' | 'textarea';

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  opts?: string[];
}

export interface KpiTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  fields: TemplateField[];
  usedIn: number;
}

export const SEED_TEMPLATES: KpiTemplate[] = [
  {
    id: 'kt1', name: 'Revenue Growth', category: 'Sales', icon: '💰', usedIn: 4,
    fields: [
      { id: 'f1', label: 'KPI Name',              type: 'text',       required: true  },
      { id: 'f2', label: 'Country / Region',       type: 'dropdown',   required: true,  opts: ['India', 'China', 'SEA', 'APAC'] },
      { id: 'f3', label: 'KPI Type',               type: 'dropdown',   required: true,  opts: ['Quantitative', 'Qualitative'] },
      { id: 'f4', label: 'Target Value',           type: 'currency',   required: true  },
      { id: 'f5', label: 'Financial Year',         type: 'date',       required: true  },
      { id: 'f6', label: 'Measurement Frequency',  type: 'dropdown',   required: false, opts: ['Monthly', 'Every 2 Weeks', 'Quarterly', 'Annual'] },
      { id: 'f7', label: 'Baseline Value',         type: 'currency',   required: false },
    ],
  },
  {
    id: 'kt2', name: 'Customer Satisfaction', category: 'CX', icon: '⭐', usedIn: 2,
    fields: [
      { id: 'f1', label: 'KPI Name',      type: 'text',       required: true  },
      { id: 'f2', label: 'Region',         type: 'dropdown',   required: true,  opts: ['India', 'China', 'SEA', 'APAC'] },
      { id: 'f3', label: 'KPI Type',       type: 'dropdown',   required: true,  opts: ['Quantitative', 'Qualitative'] },
      { id: 'f4', label: 'CSAT Target (%)', type: 'percentage', required: true  },
      { id: 'f5', label: 'Survey Method',  type: 'dropdown',   required: true,  opts: ['NPS', 'CSAT', 'CES'] },
    ],
  },
  {
    id: 'kt3', name: 'Operational Excellence', category: 'Ops', icon: '⚡', usedIn: 2,
    fields: [
      { id: 'f1', label: 'KPI Name',      type: 'text',       required: true  },
      { id: 'f2', label: 'Region',         type: 'dropdown',   required: true,  opts: ['India', 'China', 'SEA', 'APAC'] },
      { id: 'f3', label: 'KPI Type',       type: 'dropdown',   required: true,  opts: ['Quantitative', 'Qualitative'] },
      { id: 'f4', label: 'OTD Target (%)', type: 'percentage', required: true  },
      { id: 'f5', label: 'Scope',          type: 'dropdown',   required: true,  opts: ['Projects', 'Shipments', 'Tickets'] },
    ],
  },
  {
    id: 'kt4', name: 'HR Engagement', category: 'HR', icon: '🤝', usedIn: 1,
    fields: [
      { id: 'f1', label: 'KPI Name',                type: 'text',       required: true  },
      { id: 'f2', label: 'Region',                   type: 'dropdown',   required: true,  opts: ['India', 'China', 'SEA', 'APAC'] },
      { id: 'f3', label: 'KPI Type',                 type: 'dropdown',   required: true,  opts: ['Quantitative', 'Qualitative'] },
      { id: 'f4', label: 'Engagement Score Target',  type: 'percentage', required: true  },
      { id: 'f5', label: 'Survey Frequency',         type: 'dropdown',   required: false, opts: ['Monthly', 'Quarterly', 'Annual'] },
    ],
  },
];

export const FIELD_TYPES: FieldType[] = ['text', 'number', 'currency', 'percentage', 'date', 'dropdown', 'textarea'];

export function makeField(): TemplateField {
  return { id: `f${Date.now()}`, label: '', type: 'text', required: false };
}

export function exportTemplateCsv(t: KpiTemplate): void {
  const hdrs = ['KPI No', 'Parent KPI No', ...t.fields.map((f) => f.label + (f.required ? ' *' : ''))];
  const row  = ['KPI-???', '(leave blank)', ...t.fields.map(() => '')];
  const csv  = [hdrs, row].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const a    = document.createElement('a');
  a.href     = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  a.download = `JOOLA_${t.name.replace(/\s+/g, '_')}.csv`;
  a.click();
}
