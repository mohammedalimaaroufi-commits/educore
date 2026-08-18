import React, { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import StudentAvatar from './StudentAvatar.jsx';
import { resizeImageFile } from '../utils/image.js';

const EMPTY_FORM = { full_name: '', student_number: '', guardian_name: '', guardian_phone: '', guardian_email: '', health_notes: '', private_notes: '', photo_url: '' };

export default function StudentsTab({ classId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const fileRef = useRef(null);
  const photoInputRef = useRef(null);
  const [importMsg, setImportMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/students', { params: { class_id: classId } });
    setStudents(data.students);
    setLoading(false);
  };

  useEffect(() => { load(); }, [classId]);

  const startAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const startEdit = (s) => {
    setForm({ full_name: s.full_name, student_number: s.student_number || '', guardian_name: s.guardian_name || '',
      guardian_phone: s.guardian_phone || '', guardian_email: s.guardian_email || '', health_notes: s.health_notes || '',
      private_notes: s.private_notes || '', photo_url: s.photo_url || '' });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await resizeImageFile(file);
    setForm((f) => ({ ...f, photo_url: dataUrl }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.patch(`/students/${editingId}`, form);
    } else {
      await api.post('/students', { class_id: classId, ...form });
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
    load();
  };

  const removeStudent = async (id) => {
    if (!confirm('هل تريد أرشفة هذا الطالب؟ يمكن استعادته لاحقًا من قاعدة البيانات.')) return;
    await api.delete(`/students/${id}`);
    load();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('class_id', classId);
    const { data } = await api.post('/students/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setImportMsg(`تم استيراد ${data.imported} طالب بنجاح.`);
    fileRef.current.value = '';
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold">قائمة الطلاب ({students.length})</h3>
        <div className="flex gap-2">
          <a href="/students_import_template.csv" download className="btn-secondary text-sm">تنزيل قالب CSV</a>
          <label className="btn-secondary text-sm cursor-pointer">
            استيراد من ملف
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <button className="btn-primary text-sm" onClick={startAdd}>+ إضافة طالب</button>
        </div>
      </div>

      {importMsg && <p className="text-primary text-sm mb-3">{importMsg}</p>}

      {showForm && (
        <form onSubmit={submit} className="card p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex items-center gap-4">
            <StudentAvatar name={form.full_name || '?'} photoUrl={form.photo_url} size={64} />
            <label className="btn-secondary text-sm cursor-pointer">
              {form.photo_url ? 'تغيير الصورة' : 'إضافة صورة (اختياري)'}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
            {form.photo_url && (
              <button type="button" className="text-danger text-xs" onClick={() => setForm((f) => ({ ...f, photo_url: '' }))}>إزالة الصورة</button>
            )}
          </div>
          <div>
            <label className="label">اسم الطالب الكامل</label>
            <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">رقم القيد</label>
            <input className="input" value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} />
          </div>
          <div>
            <label className="label">اسم ولي الأمر</label>
            <input className="input" value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
          </div>
          <div>
            <label className="label">هاتف ولي الأمر</label>
            <input className="input" value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
          </div>
          <div>
            <label className="label">ملاحظات صحية</label>
            <input className="input" value={form.health_notes} onChange={(e) => setForm({ ...form, health_notes: e.target.value })} />
          </div>
          <div>
            <label className="label">ملاحظات خاصة</label>
            <input className="input" value={form.private_notes} onChange={(e) => setForm({ ...form, private_notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit">{editingId ? 'حفظ التعديلات' : 'إضافة الطالب'}</button>
            <button className="btn-secondary" type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>إلغاء</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-ink/50">جارِ التحميل...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-ink/60">
              <tr>
                <th className="text-right px-4 py-3">الطالب</th>
                <th className="text-right px-4 py-3">رقم القيد</th>
                <th className="text-right px-4 py-3">ولي الأمر</th>
                <th className="text-right px-4 py-3">الهاتف</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <StudentAvatar name={s.full_name} photoUrl={s.photo_url} size={32} />
                      {s.full_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{s.student_number || '—'}</td>
                  <td className="px-4 py-3 text-ink/60">{s.guardian_name || '—'}</td>
                  <td className="px-4 py-3 text-ink/60">{s.guardian_phone || '—'}</td>
                  <td className="px-4 py-3 text-left whitespace-nowrap">
                    <button className="text-primary text-xs ml-3" onClick={() => startEdit(s)}>تعديل</button>
                    <button className="text-danger text-xs" onClick={() => removeStudent(s.id)}>أرشفة</button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/50">لا يوجد طلاب بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
