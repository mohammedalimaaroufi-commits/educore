import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import Icon from './Icon.jsx';
import StudentAvatar from './StudentAvatar.jsx';
import StudentDetailModal from './StudentDetailModal.jsx';
import { POSITIVE_BEHAVIOR_ICONS, NEGATIVE_BEHAVIOR_ICONS } from '../constants.js';

export default function BehaviorTab({ classId }) {
  const [students, setStudents] = useState([]);
  const [types, setTypes] = useState([]);
  const [query, setQuery] = useState('');
  const [openStudent, setOpenStudent] = useState(null); // id of the student whose note list is expanded
  const [noteDrafts, setNoteDrafts] = useState({}); // { [studentId]: text }
  const [summary, setSummary] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [newType, setNewType] = useState({ label: '', polarity: 'positive', points: 1, icon: 'star' });
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [detailStudentId, setDetailStudentId] = useState(null);

  const load = async () => {
    const [s, t, sum] = await Promise.all([
      api.get('/students', { params: { class_id: classId } }),
      api.get('/behavior/types', { params: { class_id: classId } }),
      api.get('/behavior/class-summary', { params: { class_id: classId } }),
    ]);
    setStudents(s.data.students);
    setTypes(t.data.types);
    setSummary(sum.data.summary);
  };

  useEffect(() => { load(); }, [classId]);

  const filteredStudents = useMemo(() => {
    const q = query.trim();
    if (!q) return students;
    return students.filter((s) => s.full_name.includes(q) || s.full_name.toLowerCase().includes(q.toLowerCase()));
  }, [students, query]);

  const toggleStudent = (id) => setOpenStudent((current) => (current === id ? null : id));

  // One tap on a stored behavior note logs it immediately for the student whose row is open —
  // no separate "select student, then pick behavior in another panel" step.
  const logBehavior = async (studentId, behaviorTypeId) => {
    const note = noteDrafts[studentId] || '';
    await api.post('/behavior/log', { student_id: studentId, behavior_type_id: behaviorTypeId, note_text: note || null });
    setNoteDrafts((d) => ({ ...d, [studentId]: '' }));
    setFeedback('تم رصد السلوك ✓');
    setTimeout(() => setFeedback(''), 1500);
    const sum = await api.get('/behavior/class-summary', { params: { class_id: classId } });
    setSummary(sum.data.summary);
  };

  const addType = async (e) => {
    e.preventDefault();
    await api.post('/behavior/types', { class_id: classId, ...newType });
    setNewType({ label: '', polarity: 'positive', points: 1, icon: 'star' });
    setShowTypeForm(false);
    load();
  };

  const iconOptions = newType.polarity === 'positive' ? POSITIVE_BEHAVIOR_ICONS : NEGATIVE_BEHAVIOR_ICONS;

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold">رصد سلوك بنقرة واحدة</h3>
          {feedback && <span className="text-primary text-sm">{feedback}</span>}
        </div>

        <div className="relative mb-3">
          <input className="input text-sm pr-9" placeholder="بحث سريع عن طالب..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Icon name="search" className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
        </div>

        <div className="space-y-2">
          {filteredStudents.map((s) => (
            <div key={s.id} className="border border-line rounded-xl2 overflow-hidden">
              <button onClick={() => toggleStudent(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-right hover:bg-surface ${openStudent === s.id ? 'bg-surface' : ''}`}>
                <StudentAvatar name={s.full_name} photoUrl={s.photo_url} size={26} />
                <span className="flex-1">{s.full_name}</span>
                <Icon name={openStudent === s.id ? 'chevronUp' : 'chevronDown'} className="w-4 h-4 text-ink/40" />
              </button>

              {openStudent === s.id && (
                <div className="px-3 pb-3 pt-1 border-t border-line bg-surface/50">
                  <p className="text-xs text-ink/50 mb-2">اضغط على أي ملاحظة سلوكية محفوظة لرصدها فورًا لـ{s.full_name}:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {types.map((t) => (
                      <button key={t.id} onClick={() => logBehavior(s.id, t.id)}
                        className={`px-3 py-2 rounded-xl2 text-sm font-medium border flex items-center justify-center gap-2 ${t.polarity === 'positive' ? 'border-primary/40 text-primary hover:bg-primary/10' : 'border-danger/40 text-danger hover:bg-danger/10'}`}>
                        <Icon name={t.icon} className="w-4 h-4" />
                        {t.label} ({t.points > 0 ? '+' : ''}{t.points})
                      </button>
                    ))}
                    {types.length === 0 && <p className="text-ink/40 text-xs col-span-full">لا توجد ملاحظات سلوكية محفوظة بعد — أضف واحدة أدناه.</p>}
                  </div>
                  <input className="input text-xs" placeholder="ملاحظة سريعة (اختياري، تُرفق بأول سلوك تضغطه)"
                    value={noteDrafts[s.id] || ''} onChange={(e) => setNoteDrafts((d) => ({ ...d, [s.id]: e.target.value }))} />
                  <button className="text-primary text-xs mt-2" onClick={() => setDetailStudentId(s.id)}>عرض كامل السجل السلوكي لهذا الطالب</button>
                </div>
              )}
            </div>
          ))}
          {filteredStudents.length === 0 && <p className="text-ink/50 text-sm py-4 text-center">لا يوجد طالب مطابق للبحث.</p>}
        </div>

        {!showTypeForm ? (
          <button className="text-primary text-sm mt-3" onClick={() => setShowTypeForm(true)}>+ إضافة سلوك مخصص لهذا الصف</button>
        ) : (
          <form onSubmit={addType} className="space-y-2 mt-3 pt-3 border-t border-line">
            <div className="flex flex-wrap gap-2">
              <input className="input text-sm flex-1" placeholder="اسم السلوك" required value={newType.label} onChange={(e) => setNewType({ ...newType, label: e.target.value })} />
              <select className="input text-sm w-32" value={newType.polarity}
                onChange={(e) => setNewType({ ...newType, polarity: e.target.value, icon: e.target.value === 'positive' ? 'star' : 'clock' })}>
                <option value="positive">إيجابي</option>
                <option value="negative">سلبي</option>
              </select>
              <input className="input text-sm w-20" type="number" value={newType.points} onChange={(e) => setNewType({ ...newType, points: Number(e.target.value) })} />
            </div>
            <div className="flex gap-2">
              {iconOptions.map((ic) => (
                <button key={ic} type="button" onClick={() => setNewType({ ...newType, icon: ic })}
                  className={`p-2 rounded-lg border ${newType.icon === ic ? 'border-primary bg-primary/10' : 'border-line'}`}>
                  <Icon name={ic} className="w-4 h-4" />
                </button>
              ))}
              <button className="btn-secondary text-sm mr-auto" type="submit">حفظ السلوك</button>
            </div>
          </form>
        )}
      </div>

      <div className="card p-4">
        <h3 className="font-bold mb-3">مؤشر السلوك للفصل</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface"><tr>
              <th className="text-right px-4 py-2">الطالب</th>
              <th className="text-right px-4 py-2">النقاط</th>
              <th className="text-right px-4 py-2">إيجابي</th>
              <th className="text-right px-4 py-2">سلبي</th>
              <th className="px-4 py-2"></th>
            </tr></thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.student_id} className="border-t border-line">
                  <td className="px-4 py-2">{s.full_name}</td>
                  <td className={`px-4 py-2 font-bold ${s.behavior_score >= 0 ? 'text-primary' : 'text-danger'}`}>{s.behavior_score}</td>
                  <td className="px-4 py-2 text-primary flex items-center gap-1"><Icon name="thumbsUp" className="w-3.5 h-3.5" />{s.positive_count}</td>
                  <td className="px-4 py-2 text-danger flex items-center gap-1"><Icon name="thumbsDown" className="w-3.5 h-3.5" />{s.negative_count}</td>
                  <td className="px-4 py-2 text-left"><button className="text-primary text-xs" onClick={() => setDetailStudentId(s.student_id)}>التفاصيل الكاملة</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <StudentDetailModal studentId={detailStudentId} onClose={() => setDetailStudentId(null)} />
    </div>
  );
}
