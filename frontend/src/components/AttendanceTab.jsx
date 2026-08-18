import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Icon from './Icon.jsx';
import StudentDetailModal from './StudentDetailModal.jsx';
import { ATTENDANCE_STATUS } from '../constants.js';

export default function AttendanceTab({ classId }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [stats, setStats] = useState([]);
  const [detailStudentId, setDetailStudentId] = useState(null);

  const loadSession = async (d) => {
    const { data } = await api.get('/attendance/session', { params: { class_id: classId, date: d } });
    setSession(data.session);
    setRoster(data.roster);
  };
  const loadStats = async () => {
    const { data } = await api.get('/attendance/stats', { params: { class_id: classId } });
    setStats(data.stats);
  };

  useEffect(() => { loadSession(date); loadStats(); }, [classId]);

  const setStatus = (studentId, status) => {
    setRoster((r) => r.map((s) => (s.student_id === studentId ? { ...s, status } : s)));
  };

  const save = async () => {
    await api.post('/attendance/session', { session_id: session.id, records: roster.map((r) => ({ student_id: r.student_id, status: r.status })) });
    loadStats();
    alert('تم حفظ الحضور');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card p-4 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">تسجيل الحضور</h3>
          <input type="date" className="input text-sm w-40" value={date}
            onChange={(e) => { setDate(e.target.value); loadSession(e.target.value); }} />
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {roster.map((s) => (
            <div key={s.student_id} className="flex items-center justify-between border-b border-line pb-2">
              <span className="text-sm font-medium">{s.full_name}</span>
              <div className="flex gap-1">
                {Object.entries(ATTENDANCE_STATUS).map(([key, st]) => (
                  <button key={key} onClick={() => setStatus(s.student_id, key)}
                    className={`px-2 py-1 rounded-md text-xs border flex items-center gap-1 ${s.status === key ? st.bg : 'border-line text-ink/60 hover:bg-surface'}`}>
                    <Icon name={st.icon} className="w-3 h-3" />
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn-primary text-sm mt-4" onClick={save}>حفظ الحضور لهذا اليوم</button>
      </div>

      <div className="card p-4">
        <h3 className="font-bold mb-3">إحصائيات الحضور</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {stats.map((s) => {
            const rate = s.total_sessions > 0 ? Math.round((s.present_count / s.total_sessions) * 100) : null;
            return (
              <div key={s.student_id}>
                <div className="flex justify-between text-xs mb-1">
                  <button className="text-ink hover:text-primary" onClick={() => setDetailStudentId(s.student_id)}>{s.full_name}</button>
                  <span className="text-ink/60">{rate !== null ? `${rate}%` : '—'}</span>
                </div>
                <div className="w-full h-2 bg-line rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${rate ?? 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <StudentDetailModal studentId={detailStudentId} onClose={() => setDetailStudentId(null)} />
    </div>
  );
}
