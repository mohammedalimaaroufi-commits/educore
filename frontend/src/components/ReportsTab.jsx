import React, { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import api from '../api/client';

function downloadCSV(filename, rows, headers) {
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const PIE_COLORS = ['#2E7D6B', '#C1553D', '#E0A548', '#7A5CA1'];

function ClassReport({ classId, className }) {
  const [report, setReport] = useState(null);
  useEffect(() => { api.get(`/reports/class/${classId}`).then(({ data }) => setReport(data)); }, [classId]);
  if (!report) return <p className="text-ink/50">جارِ تحميل التقرير...</p>;

  const exportCSV = () => {
    downloadCSV(`تقرير_${className}.csv`, report.roster.map((r) => ({
      الاسم: r.full_name, الدرجة_النهائية: r.finalGrade ?? '', نقاط_السلوك: r.behaviorScore, نسبة_الحضور: r.attendanceRate ?? '',
    })), ['الاسم', 'الدرجة_النهائية', 'نقاط_السلوك', 'نسبة_الحضور']);
  };

  const gradeChart = report.roster.filter((r) => r.finalGrade !== null).map((r) => ({ name: r.full_name, grade: r.finalGrade }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h3 className="text-lg font-bold">تقرير الفصل الشامل</h3>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={exportCSV}>تصدير Excel/CSV</button>
          <button className="btn-primary text-sm" onClick={() => window.print()}>تصدير PDF (طباعة)</button>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-xl font-bold mb-1">{report.class.name}</h2>
        <p className="text-ink/60 text-sm mb-4">تاريخ الإنشاء: {new Date(report.generated_at).toLocaleDateString('ar')}</p>
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="text-right px-4 py-2">الطالب</th>
              <th className="text-right px-4 py-2">الدرجة النهائية</th>
              <th className="text-right px-4 py-2">نقاط السلوك</th>
              <th className="text-right px-4 py-2">نسبة الحضور</th>
            </tr>
          </thead>
          <tbody>
            {report.roster.map((r) => (
              <tr key={r.student_id} className="border-t border-line">
                <td className="px-4 py-2">{r.full_name}</td>
                <td className="px-4 py-2 font-bold text-primary">{r.finalGrade !== null ? `${r.finalGrade}%` : '—'}</td>
                <td className={`px-4 py-2 ${r.behaviorScore >= 0 ? 'text-primary' : 'text-danger'}`}>{r.behaviorScore}</td>
                <td className="px-4 py-2">{r.attendanceRate !== null ? `${r.attendanceRate}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gradeChart.length > 0 && (
        <div className="card p-4">
          <h3 className="font-bold mb-3">مقارنة الدرجات النهائية بين الطلاب</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, gradeChart.length * 34)}>
            <BarChart data={gradeChart} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="grade" fill="#2E7D6B" radius={[0, 6, 6, 0]} name="الدرجة %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StudentReport({ studentId, students }) {
  const [report, setReport] = useState(null);
  const [growth, setGrowth] = useState([]);

  useEffect(() => {
    if (!studentId) return;
    api.get(`/reports/student/${studentId}`).then(({ data }) => setReport(data));
    api.get('/reports/growth', { params: { student_id: studentId } }).then(({ data }) =>
      setGrowth(data.series.map((s, i) => ({ index: i + 1, name: s.title, percent: s.percent }))));
  }, [studentId]);

  if (!studentId) return <p className="text-ink/50">اختر طالبًا من القائمة أعلاه لعرض تقريره الموحّد.</p>;
  if (!report) return <p className="text-ink/50">جارِ تحميل التقرير...</p>;

  const behaviorPie = [
    { name: 'إيجابي', value: report.behaviorLogs.filter((l) => l.polarity === 'positive').length },
    { name: 'سلبي', value: report.behaviorLogs.filter((l) => l.polarity === 'negative').length },
  ].filter((d) => d.value > 0);

  const attendancePie = Object.entries(report.attendanceTotals).map(([status, count]) => ({ name: status, value: count })).filter((d) => d.value > 0);

  const categoryBars = report.gradesByCategory.map((c) => {
    const scored = c.items.filter((it) => it.score !== null);
    const avg = scored.length > 0 ? scored.reduce((sum, it) => sum + (it.score / it.max_score) * 100, 0) / scored.length : null;
    return { name: c.category, percent: avg !== null ? Number(avg.toFixed(1)) : 0 };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h3 className="text-lg font-bold">تقرير الطالب الموحّد</h3>
        <button className="btn-primary text-sm" onClick={() => window.print()}>تصدير PDF (طباعة)</button>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-xl font-bold mb-1">{report.student.full_name}</h2>
        <p className="text-ink/60 text-sm mb-4">{report.class?.name} — {new Date(report.generated_at).toLocaleDateString('ar')}</p>
        <div className="grid grid-cols-4 gap-3 mb-2">
          <div className="text-center"><p className="text-xs text-ink/50">الدرجة النهائية</p><p className="text-2xl font-bold text-primary">{report.finalGrade !== null ? `${report.finalGrade}%` : '—'}</p></div>
          <div className="text-center"><p className="text-xs text-ink/50">نقاط السلوك</p><p className="text-2xl font-bold text-primary">{report.behaviorScore}</p></div>
          <div className="text-center"><p className="text-xs text-ink/50">عدد سجلات الحضور</p><p className="text-2xl font-bold text-ink">{report.attendance.length}</p></div>
          <div className="text-center"><p className="text-xs text-ink/50">فئات التقييم</p><p className="text-2xl font-bold text-ink">{report.gradesByCategory.length}</p></div>
        </div>
        {report.autoRecommendation && (
          <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
            <span className="font-bold text-primary">توصية المعلم التلقائية: </span>
            {report.autoRecommendation}
            <span className="text-ink/40 text-xs"> (مُولّدة تلقائيًا بناءً على الدرجة النهائية — يمكن تعديل عتبات هذه العبارات من الإعدادات)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <h4 className="font-bold text-sm mb-3">متوسط الدرجات حسب الفئة</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryBars}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="percent" fill="#2E7D6B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {growth.length > 0 && (
          <div className="card p-4">
            <h4 className="font-bold text-sm mb-3">النمو الأكاديمي عبر الزمن</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" />
                <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, n, p) => [`${v}%`, p.payload.name]} />
                <Line type="monotone" dataKey="percent" stroke="#E0A548" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {behaviorPie.length > 0 && (
          <div className="card p-4">
            <h4 className="font-bold text-sm mb-3">توزيع السلوك</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={behaviorPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {behaviorPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {attendancePie.length > 0 && (
          <div className="card p-4">
            <h4 className="font-bold text-sm mb-3">توزيع الحضور</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={attendancePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {attendancePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsTab({ classId, className }) {
  const [mode, setMode] = useState('class');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => { api.get('/students', { params: { class_id: classId } }).then(({ data }) => setStudents(data.students)); }, [classId]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5 print:hidden">
        <button onClick={() => setMode('class')} className={`px-3 py-1.5 rounded-full text-sm border ${mode === 'class' ? 'bg-primary text-white border-primary' : 'border-line'}`}>تقرير الصف</button>
        <button onClick={() => setMode('student')} className={`px-3 py-1.5 rounded-full text-sm border ${mode === 'student' ? 'bg-primary text-white border-primary' : 'border-line'}`}>تقرير طالب محدد</button>
        {mode === 'student' && (
          <select className="input text-sm w-56" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
            <option value="">اختر طالبًا</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        )}
      </div>

      {mode === 'class' ? <ClassReport classId={classId} className={className} /> : <StudentReport studentId={selectedStudent} students={students} />}
    </div>
  );
}
