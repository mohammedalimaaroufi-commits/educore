const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function assertClassOwnership(classId, teacherId) {
  return db.prepare('SELECT id FROM classes WHERE id = ? AND teacher_id = ?').get(classId, teacherId);
}

// GET /api/reports/grade-distribution?class_id=...  -> histogram buckets for Bell Curve / Bar chart
router.get('/grade-distribution', (req, res) => {
  const { class_id } = req.query;
  if (!assertClassOwnership(class_id, req.teacherId)) return res.status(404).json({ error: 'الصف غير موجود' });

  const students = db.prepare('SELECT id, full_name FROM students WHERE class_id = ? AND archived = 0').all(class_id);
  const categories = db.prepare('SELECT * FROM grade_categories WHERE class_id = ?').all(class_id);

  const buckets = { '0-59': 0, '60-69': 0, '70-79': 0, '80-89': 0, '90-100': 0 };
  const finals = [];

  students.forEach((student) => {
    let weightedTotal = 0, weightUsed = 0;
    categories.forEach((cat) => {
      const assessments = db.prepare('SELECT * FROM assessments WHERE category_id = ?').all(cat.id);
      let earned = 0, possible = 0;
      assessments.forEach((a) => {
        const g = db.prepare('SELECT * FROM grades WHERE assessment_id = ? AND student_id = ?').get(a.id, student.id);
        if (g && g.score_numeric !== null) { earned += g.score_numeric; possible += a.max_score; }
      });
      if (possible > 0) { weightedTotal += (earned / possible) * 100 * (cat.weight_percent / 100); weightUsed += cat.weight_percent; }
    });
    if (weightUsed > 0) {
      const finalGrade = (weightedTotal / weightUsed) * 100;
      finals.push({ student_id: student.id, full_name: student.full_name, finalGrade: Number(finalGrade.toFixed(2)) });
      if (finalGrade < 60) buckets['0-59']++;
      else if (finalGrade < 70) buckets['60-69']++;
      else if (finalGrade < 80) buckets['70-79']++;
      else if (finalGrade < 90) buckets['80-89']++;
      else buckets['90-100']++;
    }
  });

  res.json({ buckets, finals });
});

// GET /api/reports/category-averages?class_id=...  -> average % per grading category, class-wide
// (separate from the per-student weighted final grade — shows which *category* the class is
// strong/weak in, e.g. "الاختبارات القصيرة" averaging 62% vs "المشاركة" at 91%).
router.get('/category-averages', (req, res) => {
  const { class_id } = req.query;
  if (!assertClassOwnership(class_id, req.teacherId)) return res.status(404).json({ error: 'الصف غير موجود' });

  const studentCount = db.prepare('SELECT COUNT(*) as c FROM students WHERE class_id = ? AND archived = 0').get(class_id).c;
  const categories = db.prepare('SELECT * FROM grade_categories WHERE class_id = ? ORDER BY sort_order').all(class_id);

  const result = categories.map((cat) => {
    const rows = db.prepare(`
      SELECT g.score_numeric, a.max_score FROM grades g
      JOIN assessments a ON g.assessment_id = a.id
      JOIN students s ON g.student_id = s.id
      WHERE a.category_id = ? AND s.archived = 0 AND g.score_numeric IS NOT NULL
    `).all(cat.id);
    const enteredCount = rows.length;
    const averagePercent = enteredCount > 0
      ? Number((rows.reduce((sum, r) => sum + (r.score_numeric / r.max_score) * 100, 0) / enteredCount).toFixed(1))
      : null;
    return { category: cat.name, weight_percent: cat.weight_percent, averagePercent, enteredCount, studentCount };
  });

  res.json({ categories: result });
});

// GET /api/reports/growth?student_id=...  -> time series of assessment scores (%) for line chart
router.get('/growth', (req, res) => {
  const { student_id } = req.query;
  const student = db.prepare('SELECT s.* FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = ? AND c.teacher_id = ?').get(student_id, req.teacherId);
  if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });

  const rows = db.prepare(`SELECT a.title, a.date, a.max_score, g.score_numeric, gc.name as category_name
                            FROM grades g JOIN assessments a ON g.assessment_id = a.id
                            JOIN grade_categories gc ON a.category_id = gc.id
                            WHERE g.student_id = ? AND g.score_numeric IS NOT NULL
                            ORDER BY a.date ASC, a.created_at ASC`).all(student_id);

  const series = rows.map((r) => ({
    title: r.title, date: r.date, category: r.category_name,
    percent: Number(((r.score_numeric / r.max_score) * 100).toFixed(2)),
  }));

  res.json({ series });
});

// GET /api/reports/student/:id  -> unified student report data (grades + behavior + attendance)
router.get('/student/:id', (req, res) => {
  const student = db.prepare('SELECT s.* FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = ? AND c.teacher_id = ?').get(req.params.id, req.teacherId);
  if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });

  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(student.class_id);
  const categories = db.prepare('SELECT * FROM grade_categories WHERE class_id = ?').all(student.class_id);

  const gradesByCategory = categories.map((cat) => {
    const assessments = db.prepare('SELECT * FROM assessments WHERE category_id = ?').all(cat.id);
    const items = assessments.map((a) => {
      const g = db.prepare('SELECT * FROM grades WHERE assessment_id = ? AND student_id = ?').get(a.id, student.id);
      return { title: a.title, max_score: a.max_score, score: g ? g.score_numeric : null, comment: g ? g.comment : null };
    });
    return { category: cat.name, weight_percent: cat.weight_percent, items };
  });

  const behaviorLogs = db.prepare(`SELECT bl.occurred_at, bt.label, bt.polarity, bt.points, bl.note_text FROM behavior_logs bl
                                    JOIN behavior_types bt ON bl.behavior_type_id = bt.id WHERE bl.student_id = ?
                                    ORDER BY bl.occurred_at DESC`).all(student.id);
  const behaviorScore = behaviorLogs.reduce((sum, l) => sum + l.points, 0);

  const attendance = db.prepare(`SELECT ats.session_date, ar.status FROM attendance_records ar
                                  JOIN attendance_sessions ats ON ar.session_id = ats.id
                                  WHERE ar.student_id = ? ORDER BY ats.session_date DESC`).all(student.id);
  const attendanceTotals = attendance.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  // Weighted final grade (same formula used across the app) + a matching auto-recommendation phrase
  let weightedTotal = 0, weightUsed = 0;
  gradesByCategory.forEach((c) => {
    const scored = c.items.filter((it) => it.score !== null);
    if (scored.length === 0) return;
    const earned = scored.reduce((sum, it) => sum + it.score, 0);
    const possible = scored.reduce((sum, it) => sum + it.max_score, 0);
    if (possible > 0) { weightedTotal += (earned / possible) * 100 * (c.weight_percent / 100); weightUsed += c.weight_percent; }
  });
  const finalGrade = weightUsed > 0 ? Number(((weightedTotal / weightUsed) * 100).toFixed(2)) : null;

  let autoRecommendation = null;
  if (finalGrade !== null) {
    const rules = db.prepare('SELECT * FROM grade_recommendation_rules WHERE teacher_id = ? ORDER BY sort_order').all(req.teacherId);
    const match = rules.find((r) => finalGrade >= r.min_score && finalGrade <= r.max_score);
    autoRecommendation = match ? match.text : null;
  }

  res.json({
    student, class: cls, gradesByCategory, behaviorLogs, behaviorScore, attendance, attendanceTotals,
    finalGrade, autoRecommendation,
    generated_at: new Date().toISOString(),
  });
});

// GET /api/reports/class/:id  -> comprehensive class report for administration/parents
router.get('/class/:id', (req, res) => {
  if (!assertClassOwnership(req.params.id, req.teacherId)) return res.status(404).json({ error: 'الصف غير موجود' });
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  const students = db.prepare('SELECT * FROM students WHERE class_id = ? AND archived = 0').all(req.params.id);
  const categories = db.prepare('SELECT * FROM grade_categories WHERE class_id = ?').all(req.params.id);

  const roster = students.map((student) => {
    let weightedTotal = 0, weightUsed = 0;
    categories.forEach((cat) => {
      const assessments = db.prepare('SELECT * FROM assessments WHERE category_id = ?').all(cat.id);
      let earned = 0, possible = 0;
      assessments.forEach((a) => {
        const g = db.prepare('SELECT * FROM grades WHERE assessment_id = ? AND student_id = ?').get(a.id, student.id);
        if (g && g.score_numeric !== null) { earned += g.score_numeric; possible += a.max_score; }
      });
      if (possible > 0) { weightedTotal += (earned / possible) * 100 * (cat.weight_percent / 100); weightUsed += cat.weight_percent; }
    });
    const finalGrade = weightUsed > 0 ? Number(((weightedTotal / weightUsed) * 100).toFixed(2)) : null;

    const behaviorScore = db.prepare(`SELECT COALESCE(SUM(bt.points),0) as score FROM behavior_logs bl
                                       JOIN behavior_types bt ON bl.behavior_type_id = bt.id WHERE bl.student_id = ?`).get(student.id).score;
    const attendanceRow = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present
                                       FROM attendance_records WHERE student_id = ?`).get(student.id);
    const attendanceRate = attendanceRow.total > 0 ? Number(((attendanceRow.present / attendanceRow.total) * 100).toFixed(1)) : null;

    return { student_id: student.id, full_name: student.full_name, finalGrade, behaviorScore, attendanceRate };
  });

  res.json({ class: cls, roster, generated_at: new Date().toISOString() });
});

module.exports = router;
