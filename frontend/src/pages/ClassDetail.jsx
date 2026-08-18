import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import TrialBanner from '../components/TrialBanner.jsx';
import StudentsTab from '../components/StudentsTab.jsx';
import GradebookTab from '../components/GradebookTab.jsx';
import BehaviorTab from '../components/BehaviorTab.jsx';
import AttendanceTab from '../components/AttendanceTab.jsx';
import AnalyticsTab from '../components/AnalyticsTab.jsx';
import ReportsTab from '../components/ReportsTab.jsx';

const TABS = [
  { id: 'students', label: 'الطلاب' },
  { id: 'gradebook', label: 'دفتر الدرجات' },
  { id: 'behavior', label: 'السلوك' },
  { id: 'attendance', label: 'الحضور' },
  { id: 'analytics', label: 'التحليلات' },
  { id: 'reports', label: 'التقارير' },
];

export default function ClassDetail() {
  const { id } = useParams();
  const [cls, setCls] = useState(null);
  const [tab, setTab] = useState('students');

  useEffect(() => {
    api.get(`/classes/${id}`).then(({ data }) => setCls(data.class));
  }, [id]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/" className="text-primary text-sm">→ العودة للوحة التحكم</Link>

      {cls && (
        <div className="flex items-center gap-3 mt-3 mb-4">
          <div className="w-10 h-10 rounded-lg" style={{ background: cls.color }} />
          <div>
            <h1 className="text-2xl font-bold">{cls.name}</h1>
            <p className="text-ink/60 text-sm">{cls.subject} {cls.academic_year ? `• ${cls.academic_year}` : ''}</p>
          </div>
        </div>
      )}

      <TrialBanner />

      <div className="flex gap-2 border-b border-line mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-ink/60 hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'students' && <StudentsTab classId={id} />}
      {tab === 'gradebook' && cls && <GradebookTab classId={id} className={cls.name} />}
      {tab === 'behavior' && <BehaviorTab classId={id} />}
      {tab === 'attendance' && <AttendanceTab classId={id} />}
      {tab === 'analytics' && <AnalyticsTab classId={id} />}
      {tab === 'reports' && cls && <ReportsTab classId={id} className={cls.name} />}
    </div>
  );
}
