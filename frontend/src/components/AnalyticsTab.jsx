import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Cell } from 'recharts';
import api from '../api/client';
import StudentAvatar from './StudentAvatar.jsx';
import StudentDetailModal from './StudentDetailModal.jsx';

const SORT_OPTIONS = {
  name: (a, b) => a.full_name.localeCompare(b.full_name, 'ar'),
  grade: (a, b) => (b.finalGrade ?? -1) - (a.finalGrade ?? -1),
  behavior: (a, b) => b.behaviorScore - a.behaviorScore,
  attendance: (a, b) => (b.attendanceRate ?? -1) - (a.attendanceRate ?? -1),
};

export default function AnalyticsTab({ classId }) {
  const [distribution, setDistribution] = useState([]);
  const [categoryAverages, setCategoryAverages] = useState([]);
  const [roster, setRoster] = useState([]);
  const [sortBy, setSortBy] = useState('grade');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [growth, setGrowth] = useState([]);
  const [detailStudentId, setDetailStudentId] = useState(null);

  useEffect(() => {
    (async () => {
      const [dist, s, catAvg, classReport] = await Promise.all([
        api.get('/reports/grade-distribution', { params: { class_id: classId } }),
        api.get('/students', { params: { class_id: classId } }),
        api.get('/reports/category-averages', { params: { class_id: classId } }),
        api.get(`/reports/class/${classId}`),
      ]);
      const buckets = dist.data.buckets;
      setDistribution(Object.entries(buckets).map(([range, count]) => ({ range, count })));
      setStudents(s.data.students);
      setCategoryAverages(catAvg.data.categories);
      setRoster(classReport.data.roster);
    })();
  }, [classId]);

  const loadGrowth = async (studentId) => {
    setSelectedStudent(studentId);
    const { data } = await api.get('/reports/growth', { params: { student_id: studentId } });
    setGrowth(data.series.map((s, i) => ({ name: s.title, percent: s.percent, index: i + 1 })));
  };

  const sortedRoster = [...roster].sort(SORT_OPTIONS[sortBy]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-4">
        <h3 className="font-bold mb-3">توزيع درجات الفصل</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#2E7D6B" radius={[6, 6, 0, 0]} name="عدد الطلاب" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-4">
        <h3 className="font-bold mb-1">متوسط الأداء حسب فئة التقييم</h3>
        <p className="text-xs text-ink/50 mb-3">يوضح أي فئات التقييم يتفوق فيها الفصل ككل وأيها تحتاج تركيزًا أكبر.</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={categoryAverages} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v, n, p) => [v === null ? 'لا توجد درجات بعد' : `${v}%`, `متوسط ${p.payload.category}`]} />
            <Bar dataKey="averagePercent" radius={[0, 6, 6, 0]} name="المتوسط %">
              {categoryAverages.map((c, i) => (
                <Cell key={i} fill={c.averagePercent === null ? '#E4E1D8' : c.averagePercent >= 70 ? '#2E7D6B' : c.averagePercent >= 50 ? '#E0A548' : '#C1553D'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">النمو الأكاديمي للطالب</h3>
          <select className="input text-sm w-48" value={selectedStudent} onChange={(e) => loadGrowth(e.target.value)}>
            <option value="">اختر طالبًا</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        {growth.length === 0 ? (
          <p className="text-ink/50 text-sm">اختر طالبًا لعرض تطور درجاته عبر الفصل الدراسي.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" />
              <XAxis dataKey="index" tick={{ fontSize: 12 }} label={{ value: 'التقييمات', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, n, p) => [`${v}%`, p.payload.name]} />
              <Legend />
              <Line type="monotone" dataKey="percent" stroke="#E0A548" strokeWidth={3} dot={{ r: 4 }} name="النسبة %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold">ملخص شامل للفصل</h3>
          <select className="input text-xs w-40" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="grade">ترتيب حسب الدرجة</option>
            <option value="behavior">ترتيب حسب السلوك</option>
            <option value="attendance">ترتيب حسب الحضور</option>
            <option value="name">ترتيب أبجدي</option>
          </select>
        </div>
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface sticky top-0"><tr>
              <th className="text-right px-3 py-2">الطالب</th>
              <th className="text-right px-3 py-2">الدرجة النهائية</th>
              <th className="text-right px-3 py-2">نقاط السلوك</th>
              <th className="text-right px-3 py-2">نسبة الحضور</th>
            </tr></thead>
            <tbody>
              {sortedRoster.map((r) => (
                <tr key={r.student_id} className="border-t border-line cursor-pointer hover:bg-surface" onClick={() => setDetailStudentId(r.student_id)}>
                  <td className="px-3 py-2">{r.full_name}</td>
                  <td className="px-3 py-2 font-medium">{r.finalGrade === null ? '—' : `${r.finalGrade}%`}</td>
                  <td className={`px-3 py-2 font-medium ${r.behaviorScore >= 0 ? 'text-primary' : 'text-danger'}`}>{r.behaviorScore}</td>
                  <td className="px-3 py-2">{r.attendanceRate === null ? '—' : `${r.attendanceRate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 lg:col-span-2">
        <h3 className="font-bold mb-3">تفاصيل شاملة لكل طالب</h3>
        <p className="text-xs text-ink/50 mb-3">اضغط على أي طالب لعرض درجاته وسلوكه وحضوره في مكان واحد.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {students.map((s) => (
            <button key={s.id} onClick={() => setDetailStudentId(s.id)}
              className="flex items-center gap-2 p-2 rounded-lg border border-line hover:bg-surface text-right">
              <StudentAvatar name={s.full_name} photoUrl={s.photo_url} size={28} />
              <span className="text-sm truncate">{s.full_name}</span>
            </button>
          ))}
        </div>
      </div>

      <StudentDetailModal studentId={detailStudentId} onClose={() => setDetailStudentId(null)} />
    </div>
  );
}
