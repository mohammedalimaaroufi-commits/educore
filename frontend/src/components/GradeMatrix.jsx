import React, { useEffect, useState } from 'react';
import api from '../api/client';
import CommentPicker from './CommentPicker.jsx';

const CATEGORY_COLORS = ['#2E7D6B', '#3F6FB0', '#7A5CA1', '#C1553D', '#B98A2E', '#3F9C86'];

function downloadCSV(filename, rows, headers) {
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function gradeColor(grade) {
  if (grade === null) return 'text-ink/30';
  if (grade >= 90) return 'text-primary';
  if (grade >= 70) return 'text-primary/80';
  if (grade >= 60) return 'text-accent';
  return 'text-danger';
}

export default function GradeMatrix({ classId, className }) {
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [openComment, setOpenComment] = useState(null); // `${assessmentId}:${studentId}`
  const [newAssessment, setNewAssessment] = useState(null); // category_id currently adding to
  const [assessmentForm, setAssessmentForm] = useState({ title: '', max_score: 100, date: '' });
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/grades/matrix', { params: { class_id: classId } });
    setStudents(data.students);
    setCategories(data.categories);
    setGrades(data.grades);
    setLoading(false);
  };

  useEffect(() => { load(); }, [classId]);

  const cellKey = (assessmentId, studentId) => `${assessmentId}:${studentId}`;
  const categoryColor = (index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

  const setCell = (assessmentId, studentId, field, value) => {
    setGrades((g) => ({ ...g, [cellKey(assessmentId, studentId)]: { ...g[cellKey(assessmentId, studentId)], [field]: value } }));
  };

  const saveCell = async (assessmentId, studentId) => {
    const key = cellKey(assessmentId, studentId);
    const cell = grades[key] || {};
    setSavingKey(key);
    await api.post('/grades/matrix', {
      entries: [{ assessment_id: assessmentId, student_id: studentId, score_numeric: cell.score_numeric === '' || cell.score_numeric == null ? null : Number(cell.score_numeric), comment: cell.comment || null }],
    });
    setSavingKey(null);
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1000);
  };

  const addAssessment = async (e) => {
    e.preventDefault();
    await api.post('/grades/assessments', { category_id: newAssessment, ...assessmentForm });
    setAssessmentForm({ title: '', max_score: 100, date: '' });
    setNewAssessment(null);
    load();
  };

  const deleteAssessment = async (id) => {
    if (!confirm('حذف هذا التقييم وكل الدرجات المرتبطة به؟')) return;
    await api.delete(`/grades/assessments/${id}`);
    load();
  };

  const finalGrade = (studentId) => {
    let weightedTotal = 0, weightUsed = 0;
    categories.forEach((cat) => {
      let earned = 0, possible = 0;
      cat.assessments.forEach((a) => {
        const cell = grades[cellKey(a.id, studentId)];
        if (cell && cell.score_numeric !== null && cell.score_numeric !== undefined && cell.score_numeric !== '') {
          earned += Number(cell.score_numeric);
          possible += a.max_score;
        }
      });
      if (possible > 0) { weightedTotal += (earned / possible) * 100 * (cat.weight_percent / 100); weightUsed += cat.weight_percent; }
    });
    return weightUsed > 0 ? Number(((weightedTotal / weightUsed) * 100).toFixed(1)) : null;
  };

  const exportCSV = () => {
    const headers = ['الاسم', ...categories.flatMap((c) => c.assessments.map((a) => `${c.name} - ${a.title}`)), 'الدرجة النهائية %'];
    const rows = students.map((s) => {
      const row = { الاسم: s.full_name };
      categories.forEach((c) => c.assessments.forEach((a) => {
        const cell = grades[cellKey(a.id, s.id)];
        row[`${c.name} - ${a.title}`] = cell?.score_numeric ?? '';
      }));
      row['الدرجة النهائية %'] = finalGrade(s.id) ?? '';
      return row;
    });
    downloadCSV(`درجات_${className || 'الصف'}.csv`, rows, headers);
  };

  if (loading) return <p className="text-ink/50">جارِ التحميل...</p>;

  if (categories.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-ink/60 mb-1">لا توجد فئات تقييم لهذا الصف بعد.</p>
        <p className="text-ink/40 text-sm">افتح تبويب "فئات التقييم" لإضافة فئة، أو "مخططات جاهزة" لاعتماد مخطط محفوظ مسبقًا.</p>
      </div>
    );
  }

  if (students.length === 0) {
    return <div className="card p-10 text-center text-ink/60">أضف طلابًا من تبويب "الطلاب" أولًا لتتمكن من تسجيل درجاتهم هنا.</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
        <div>
          <h3 className="font-bold">جدول الدرجات الكامل</h3>
          <p className="text-xs text-ink/50">اضغط داخل أي خانة لإدخال الدرجة — يُحفظ تلقائيًا عند الانتقال للخانة التالية.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={exportCSV}>تنزيل CSV</button>
          <button className="btn-primary text-sm" onClick={() => window.print()}>تنزيل PDF (طباعة)</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="sticky right-0 bg-white text-right px-3 py-2 border-b-2 border-line min-w-[150px] z-10">الطالب</th>
              {categories.map((c, i) => (
                <th key={c.id} colSpan={c.assessments.length + 1} className="text-center px-2 py-2 border-b-2 text-white font-bold"
                  style={{ background: categoryColor(i), borderColor: categoryColor(i) }}>
                  {c.name} <span className="opacity-80 font-normal">({c.weight_percent}%)</span>
                </th>
              ))}
              <th className="text-center px-3 py-2 border-b-2 border-ink min-w-[90px] bg-ink text-white">النهائية</th>
            </tr>
            <tr>
              <th className="sticky right-0 bg-surface"></th>
              {categories.map((c, i) => (
                <React.Fragment key={c.id}>
                  {c.assessments.map((a) => (
                    <th key={a.id} className="px-2 py-1.5 border-b border-line font-normal min-w-[85px]"
                      style={{ background: `${categoryColor(i)}14` }}>
                      <div className="flex items-center justify-center gap-1">
                        <span>{a.title} <span className="text-ink/40">/{a.max_score}</span></span>
                        <button className="text-danger print:hidden hover:scale-110 transition-transform" title="حذف التقييم" onClick={() => deleteAssessment(a.id)}>×</button>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-1.5 border-b border-line print:hidden" style={{ background: `${categoryColor(i)}14` }}>
                    {newAssessment === c.id ? (
                      <form onSubmit={addAssessment} className="flex flex-col gap-1 p-1">
                        <input className="input text-xs py-0.5" placeholder="عنوان" required autoFocus
                          value={assessmentForm.title} onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })} />
                        <input className="input text-xs py-0.5" type="number" placeholder="من"
                          value={assessmentForm.max_score} onChange={(e) => setAssessmentForm({ ...assessmentForm, max_score: Number(e.target.value) })} />
                        <div className="flex gap-1">
                          <button className="btn-primary text-xs px-2 py-0.5" type="submit">إضافة</button>
                          <button className="btn-secondary text-xs px-2 py-0.5" type="button" onClick={() => setNewAssessment(null)}>إلغاء</button>
                        </div>
                      </form>
                    ) : (
                      <button className="font-medium hover:underline" style={{ color: categoryColor(i) }} onClick={() => setNewAssessment(c.id)}>+ تقييم</button>
                    )}
                  </th>
                </React.Fragment>
              ))}
              <th className="bg-surface"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, rowIndex) => (
              <tr key={s.id} className={`border-t border-line ${rowIndex % 2 === 1 ? 'bg-surface/40' : ''} hover:bg-primary/5`}>
                <td className="sticky right-0 bg-inherit px-3 py-2 font-medium">{s.full_name}</td>
                {categories.map((c, ci) => (
                  <React.Fragment key={c.id}>
                    {c.assessments.map((a) => {
                      const key = cellKey(a.id, s.id);
                      const cell = grades[key] || {};
                      return (
                        <td key={a.id} className="px-1 py-1 border-r border-line" style={{ background: `${categoryColor(ci)}08` }}>
                          <div className="flex flex-col gap-0.5 items-center">
                            <div className="relative">
                              <input type="number" className="input text-xs py-1.5 text-center w-16 font-medium"
                                value={cell.score_numeric ?? ''}
                                onChange={(e) => setCell(a.id, s.id, 'score_numeric', e.target.value)}
                                onBlur={() => saveCell(a.id, s.id)} />
                              {savingKey === key && <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-[10px] text-ink/30">⋯</span>}
                              {savedKey === key && <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-[10px] text-primary">✓</span>}
                            </div>
                            <button className="text-[10px] text-ink/40 print:hidden hover:text-primary" onClick={() => setOpenComment(openComment === key ? null : key)}>
                              {cell.comment ? '📝 ملاحظة' : '+ ملاحظة'}
                            </button>
                            {openComment === key && (
                              <div className="w-40">
                                <CommentPicker value={cell.comment} onChange={(v) => { setCell(a.id, s.id, 'comment', v); }} category="grade" />
                                <button className="text-[10px] text-primary mt-0.5" onClick={() => { saveCell(a.id, s.id); setOpenComment(null); }}>حفظ</button>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td></td>
                  </React.Fragment>
                ))}
                <td className={`px-3 py-2 text-center font-bold ${gradeColor(finalGrade(s.id))}`}>{finalGrade(s.id) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
