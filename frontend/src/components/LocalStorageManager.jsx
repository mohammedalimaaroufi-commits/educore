import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatBytes, getTeacherLocalStats } from '../utils/localCache.js';

export default function LocalStorageManager() {
  const { teacher, clearLocalCache } = useAuth();
  const [stats, setStats] = useState({ entries: 0, bytes: 0 });
  const [message, setMessage] = useState('');

  const refreshStats = () => {
    if (teacher?.id) setStats(getTeacherLocalStats(teacher.id));
  };

  useEffect(() => {
    refreshStats();
  }, [teacher?.id]);

  const clearCache = () => {
    if (!confirm('سيتم حذف النسخ المؤقتة المحفوظة على هذا الجهاز فقط، ولن تُحذف بياناتك من الخادم. هل تريد المتابعة؟')) return;
    clearLocalCache();
    refreshStats();
    setMessage('تم حذف النسخ المحلية المؤقتة من هذا الجهاز');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="card p-5 mt-4">
      <h3 className="font-bold text-lg mb-1">بيانات الجهاز المحلية</h3>
      <p className="text-xs text-ink/60 mb-3">
        يحتفظ التطبيق بنسخة محلية من الملف الشخصي وبعض بيانات القراءة لتظل ظاهرة عند ضعف الاتصال. هذه النسخ لا تُغني عن النسخة الاحتياطية القابلة للتنزيل.
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-ink/60">{stats.entries} نسخة مؤقتة، بحجم {formatBytes(stats.bytes)}</span>
        <button className="btn-secondary text-xs" type="button" onClick={clearCache}>مسح النسخ المحلية</button>
      </div>
      {message && <p className="text-primary text-sm mt-3">{message}</p>}
    </div>
  );
}
