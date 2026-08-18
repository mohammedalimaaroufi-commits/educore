import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import TrialBanner from '../components/TrialBanner.jsx';
import Icon from '../components/Icon.jsx';
import { APP_NAME } from '../constants.js';

const COLORS = ['#2E7D6B', '#E0A548', '#3F6FB0', '#C1553D', '#7A5CA1', '#3F9C86'];
const EMPTY_FORM = { name: '', subject: '', academic_year: '', color: COLORS[0] };

function gradingPillClasses(percent) {
  if (percent === null) return 'bg-ink/5 text-ink/40';
  if (percent >= 100) return 'bg-primary/15 text-primary';
  if (percent > 0) return 'bg-accent/15 text-accent';
  return 'bg-ink/5 text-ink/40';
}

// Compact "بطاقة الصف" stats: how much of each grading category has been recorded,
// who's leading/needs support on behavior, and whether today's attendance was taken.
function ClassQuickStats({ stats }) {
  if (!stats) return null;
  const { grading = [], behavior, attendance_marked_today } = stats;

  return (
    <div className="mt-3 pt-3 border-t border-line space-y-2 text-xs">
      {grading.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {grading.map((g) => (
            <span key={g.category_id} className={`px-2 py-0.5 rounded-full font-medium ${gradingPillClasses(g.percent)}`}>
              رصد {g.name} {g.percent === null ? '—' : `${g.percent}%`}
            </span>
          ))}
        </div>
      )}

      {behavior && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span className="text-primary font-medium">🟢 {behavior.best.full_name} ({behavior.best.points > 0 ? '+' : ''}{behavior.best.points})</span>
          {behavior.worst && (
            <span className="text-danger font-medium">🔴 {behavior.worst.full_name} ({behavior.worst.points > 0 ? '+' : ''}{behavior.worst.points})</span>
          )}
        </div>
      )}

      <div className={`flex items-center gap-1 ${attendance_marked_today ? 'text-primary' : 'text-ink/40'}`}>
        <Icon name={attendance_marked_today ? 'check' : 'clock'} className="w-3.5 h-3.5" />
        <span>{attendance_marked_today ? 'تم رصد الحضور اليوم' : 'لم يُرصد الحضور اليوم بعد'}</span>
      </div>
    </div>
  );
}

function ArchivedClassesPanel({ onClose, onRestored }) {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/classes/archived');
    setArchived(data.classes);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const restore = async (id) => {
    await api.post(`/classes/${id}/restore`);
    load();
    onRestored?.();
  };

  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl2 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-line flex items-center justify-between">
          <h3 className="font-bold text-lg">الصفوف المؤرشفة</h3>
          <button className="text-ink/50 text-xl" onClick={onClose}>×</button>
        </div>
        <div className="p-5">
          {loading ? (
            <p className="text-ink/50 text-sm">جارِ التحميل...</p>
          ) : archived.length === 0 ? (
            <p className="text-ink/50 text-sm text-center py-6">لا توجد صفوف مؤرشفة حاليًا.</p>
          ) : (
            <div className="space-y-2">
              {archived.map((c) => (
                <div key={c.id} className="flex items-center justify-between border border-line rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg" style={{ background: c.color }} />
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-ink/50">{c.student_count} طالب</p>
                    </div>
                  </div>
                  <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => restore(c.id)}>
                    <Icon name="restore" className="w-3.5 h-3.5" /> استعادة
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { teacher, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showArchived, setShowArchived] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/classes');
    setClasses(data.classes);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const startEdit = (e, c) => {
    e.preventDefault(); e.stopPropagation();
    setForm({ name: c.name, subject: c.subject || '', academic_year: c.academic_year || '', color: c.color });
    setEditingId(c.id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.patch(`/classes/${editingId}`, form);
    } else {
      await api.post('/classes', form);
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
    load();
  };

  const archiveClass = async (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('أرشفة هذا الصف؟ يمكن استعادته لاحقًا من قسم "الصفوف المؤرشفة".')) return;
    await api.delete(`/classes/${id}`);
    load();
  };

  const deleteClassPermanently = async (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('تحذير: سيتم حذف هذا الصف وكل طلابه ودرجاته وسلوكه وحضوره نهائيًا ولا يمكن التراجع. هل أنت متأكد؟')) return;
    await api.delete(`/classes/${id}?permanent=1`);
    load();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">{APP_NAME}</h1>
          <p className="text-ink/60 text-sm">أهلاً، {teacher?.full_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/settings" className="btn-secondary text-sm">الإعدادات</Link>
          <Link to="/subscription" className="btn-secondary text-sm">إدارة الاشتراك</Link>
          <button className="btn-secondary text-sm" onClick={logout}>تسجيل الخروج</button>
        </div>
      </header>

      <TrialBanner />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-bold">صفوفي الدراسية</h2>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm flex items-center gap-1" onClick={() => setShowArchived(true)}>
            <Icon name="archive" className="w-4 h-4" /> الصفوف المؤرشفة
          </button>
          <button className="btn-primary" onClick={startAdd}>+ إنشاء صف جديد</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">اسم الصف</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: الصف الثامن - أ" />
          </div>
          <div>
            <label className="label">المادة</label>
            <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">السنة الدراسية</label>
            <input className="input" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="2025-2026" />
          </div>
          <div>
            <label className="label">اللون المميز</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-ink' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit">{editingId ? 'حفظ التعديلات' : 'إنشاء'}</button>
            <button className="btn-secondary" type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>إلغاء</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-ink/50">جارِ التحميل...</p>
      ) : classes.length === 0 ? (
        <div className="card p-10 text-center text-ink/60">لا يوجد صفوف بعد. أنشئ أول صف لبدء إدارة طلابك.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
              <Link to={`/classes/${c.id}`} className="block">
                <div className="w-10 h-10 rounded-lg mb-3" style={{ background: c.color }} />
                <h3 className="font-bold text-lg mb-1">{c.name}</h3>
                <p className="text-sm text-ink/60 mb-3">{c.subject || 'بدون مادة محددة'} {c.academic_year ? `• ${c.academic_year}` : ''}</p>
                <p className="text-sm text-primary font-medium">{c.student_count} طالب</p>
              </Link>
              <ClassQuickStats stats={c.quick_stats} />
              <div className="flex gap-3 mt-3 pt-3 border-t border-line text-xs">
                <button className="text-primary" onClick={(e) => startEdit(e, c)}>تعديل</button>
                <button className="text-accent" onClick={(e) => archiveClass(e, c.id)}>أرشفة</button>
                <button className="text-danger" onClick={(e) => deleteClassPermanently(e, c.id)}>حذف نهائي</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showArchived && <ArchivedClassesPanel onClose={() => setShowArchived(false)} onRestored={load} />}
    </div>
  );
}
