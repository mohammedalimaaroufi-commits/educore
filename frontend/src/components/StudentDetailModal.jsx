import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Icon from './Icon.jsx';
import StudentAvatar from './StudentAvatar.jsx';
import { ATTENDANCE_STATUS } from '../constants.js';

const TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'grades', label: 'الدرجات' },
  { id: 'behavior', label: 'السلوك' },
  { id: 'attendance', label: 'الحضور' },
];

export default function StudentDetailModal({ studentId, onClose }) {
  const [tab, setTab] = useState('overview');
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    api.get(`/reports/student/${studentId}`).then(({ data }) => setReport(data));
  }, [studentId]);

  if (!studentId) return null;

  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl2 max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {!report ? (
          <div className="p-8 text-center text-ink/50">جارِ التحميل...</div>
        ) : (
          <>
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StudentAvatar name={report.student.full_name} photoUrl={report.student.photo_url} size={48} />
                <div>
                  <h3 className="font-bold text-lg">{report.student.full_name}</h3>
                  <p className="text-xs text-ink/50">{report.class?.name}</p>
                </div>
              </div>
              <button className="text-ink/50 text-xl" onClick={onClose}>×</button>
            </div>

            <div className="flex gap-2 px-5 pt-3">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border ${tab === t.id ? 'bg-primary text-white border-primary' : 'border-line'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'overview' && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="card p-3 text-center">
                    <p className="text-xs text-ink/50 mb-1">الدرجة النهائية</p>
                    <p className="text-2xl font-bold text-primary">{report.finalGrade !== null ? `${report.finalGrade}%` : '—'}</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xs text-ink/50 mb-1">نقاط السلوك</p>
                    <p className={`text-2xl font-bold ${report.behaviorScore >= 0 ? 'text-primary' : 'text-danger'}`}>{report.behaviorScore}</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xs text-ink/50 mb-1">نسبة الحضور</p>
                    <p className="text-2xl font-bold text-primary">
                      {report.attendance.length > 0 ? `${Math.round(((report.attendanceTotals.present || 0) / report.attendance.length) * 100)}%` : '—'}
                    </p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xs text-ink/50 mb-1">السجلات السلوكية</p>
                    <p className="text-2xl font-bold text-ink">{report.behaviorLogs.length}</p>
                  </div>
                  {report.autoRecommendation && (
                    <div className="col-span-4 bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                      <span className="font-bold text-primary">توصية تلقائية: </span>{report.autoRecommendation}
                    </div>
                  )}
                  {(report.student.health_notes || report.student.private_notes) && (
                    <div className="col-span-4 card p-3 text-sm space-y-1">
                      {report.student.health_notes && <p><span className="font-medium">ملاحظات صحية:</span> {report.student.health_notes}</p>}
                      {report.student.private_notes && <p><span className="font-medium">ملاحظات خاصة:</span> {report.student.private_notes}</p>}
                    </div>
                  )}
                </div>
              )}

              {tab === 'grades' && (
                <div className="space-y-3">
                  {report.gradesByCategory.map((c) => (
                    <div key={c.category} className="border border-line rounded-lg p-3">
                      <p className="font-medium text-sm mb-2">{c.category} ({c.weight_percent}%)</p>
                      {c.items.length === 0 ? (
                        <p className="text-xs text-ink/40">لا توجد تقييمات بعد</p>
                      ) : (
                        <div className="space-y-1">
                          {c.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span>{it.title}</span>
                              <span className="font-medium">{it.score !== null ? `${it.score}/${it.max_score}` : '—'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'behavior' && (
                <div className="space-y-2">
                  {report.behaviorLogs.length === 0 && <p className="text-ink/50 text-sm">لا توجد سجلات سلوكية بعد.</p>}
                  {report.behaviorLogs.map((l, i) => (
                    <div key={i} className={`flex items-center gap-2 text-sm border-b border-line pb-2 ${l.polarity === 'positive' ? 'text-primary' : 'text-danger'}`}>
                      <Icon name="star" className="w-4 h-4 shrink-0" />
                      <span className="font-medium">{l.label}</span>
                      <span className="text-ink/40 text-xs">({l.points > 0 ? '+' : ''}{l.points})</span>
                      {l.note_text && <span className="text-ink/60 text-xs">— {l.note_text}</span>}
                      <span className="text-ink/30 text-xs mr-auto">{new Date(l.occurred_at).toLocaleDateString('ar')}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'attendance' && (
                <div className="space-y-2">
                  {report.attendance.length === 0 && <p className="text-ink/50 text-sm">لا توجد سجلات حضور بعد.</p>}
                  {report.attendance.map((a, i) => {
                    const st = ATTENDANCE_STATUS[a.status] || ATTENDANCE_STATUS.present;
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm border-b border-line pb-2">
                        <Icon name={st.icon} className={`w-4 h-4 ${st.color}`} />
                        <span>{a.session_date}</span>
                        <span className={`text-xs mr-auto px-2 py-0.5 rounded-full ${st.bg}`}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
