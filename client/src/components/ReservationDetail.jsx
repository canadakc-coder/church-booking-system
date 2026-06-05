import React, { useState } from 'react';
import { approveReservation, rejectReservation, deleteReservation } from '../api';

export default function ReservationDetail({ reservation, onClose, isAdmin, adminEmail, onAction, onEdit, onDuplicate }) {
  const r = reservation;
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusMap = {
    pending: { label: '대기중', className: 'pending' },
    approved: { label: '승인됨', className: 'approved' },
    rejected: { label: '거절됨', className: 'rejected' },
  };

  const recurrenceMap = {
    none: '반복 없음',
    daily: `매일 반복 (종료: ${r.recurrence_end_date || '1개월'})`,
    weekly: `매주 반복 (종료: ${r.recurrence_end_date || '1년'})`,
    monthly: `매월 반복 (종료: ${r.recurrence_end_date || '1년'})`,
  };

  const status = statusMap[r.status] || statusMap.pending;

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await approveReservation(r.id, adminEmail);
      onAction('승인되었습니다.');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading('');
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    try {
      await rejectReservation(r.id, rejectReason, adminEmail);
      onAction('거절되었습니다.');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading('');
    }
  };

  const handleDelete = async (deleteGroup) => {
    setLoading('delete');
    try {
      const result = await deleteReservation(r.id, adminEmail, deleteGroup);
      onAction(result.message);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2>일정 상세</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <table className="detail-table">
            <tbody>
              <tr>
                <td>상태</td>
                <td><span className={`status-badge ${status.className}`}>{status.label}</span></td>
              </tr>
              <tr>
                <td>장소</td>
                <td>{r.building_name} {r.floor || ''} - {r.room_name}</td>
              </tr>
              <tr>
                <td>날짜</td>
                <td>{r.date}</td>
              </tr>
              <tr>
                <td>시간</td>
                <td>{r.start_time} ~ {r.end_time}</td>
              </tr>
              <tr>
                <td>신청자</td>
                <td>{r.applicant_name}</td>
              </tr>
              <tr>
                <td>소속</td>
                <td>{r.department}</td>
              </tr>
              <tr>
                <td>용도</td>
                <td>{r.purpose}</td>
              </tr>
              <tr>
                <td>전화번호</td>
                <td>{r.contact}</td>
              </tr>
              {r.applicant_email && (
                <tr>
                  <td>이메일</td>
                  <td>{r.applicant_email}</td>
                </tr>
              )}
              <tr>
                <td>반복</td>
                <td>{recurrenceMap[r.recurrence_type] || '반복 없음'}</td>
              </tr>
              {r.notes && (
                <tr>
                  <td>비고</td>
                  <td>{r.notes}</td>
                </tr>
              )}
              {r.rejection_reason && (
                <tr>
                  <td>거절 사유</td>
                  <td style={{ color: '#e53e3e' }}>{r.rejection_reason}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 관리자 거절 사유 입력 폼 */}
          {showRejectForm && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#fff5f5', borderRadius: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#9b2c2c' }}>거절 사유</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="거절 사유를 입력해주세요"
                style={{ width: '100%', padding: '10px', border: '1px solid #feb2b2', borderRadius: '6px', fontSize: '0.85rem', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => setShowRejectForm(false)}>취소</button>
                <button className="btn" style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#e53e3e', color: 'white' }} onClick={handleReject} disabled={loading === 'reject'}>
                  {loading === 'reject' ? '처리 중...' : '거절 확인'}
                </button>
              </div>
            </div>
          )}

          {/* 관리자 삭제 확인 */}
          {confirmDelete && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#fff5f5', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.85rem', color: '#9b2c2c', fontWeight: '500', margin: '0 0 10px' }}>정말 삭제하시겠습니까?</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => setConfirmDelete(false)}>취소</button>
                {r.recurrence_group_id && (
                  <button className="btn" style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#c53030', color: 'white' }} onClick={() => handleDelete(true)} disabled={loading === 'delete'}>
                    {r.recurrence_type && r.recurrence_type !== 'none' ? '반복 전체 삭제' : '묶음 전체 삭제'}
                  </button>
                )}
                <button className="btn" style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#e53e3e', color: 'white' }} onClick={() => handleDelete(false)} disabled={loading === 'delete'}>
                  {loading === 'delete' ? '삭제 중...' : '이 일정만 삭제'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
          {isAdmin && (
            <>
              {r.status === 'pending' && (
                <>
                  <button className="btn" style={{ background: '#38a169', color: 'white' }} onClick={handleApprove} disabled={!!loading}>
                    {loading === 'approve' ? '처리 중...' : '승인'}
                  </button>
                  <button className="btn" style={{ background: '#e53e3e', color: 'white' }} onClick={() => { setShowRejectForm(true); setConfirmDelete(false); }} disabled={!!loading}>
                    거절
                  </button>
                </>
              )}
              <button className="btn" style={{ background: '#3182ce', color: 'white' }} onClick={() => onEdit(r)}>
                수정
              </button>
              <button className="btn" style={{ background: '#805ad5', color: 'white' }} onClick={() => onDuplicate(r)} title="이 일정을 새 날짜로 복제합니다">
                복제
              </button>
              <button className="btn" style={{ background: '#718096', color: 'white' }} onClick={() => { setConfirmDelete(true); setShowRejectForm(false); }}>
                삭제
              </button>
            </>
          )}
          {!isAdmin && onDuplicate && (
            <button className="btn" style={{ background: '#805ad5', color: 'white' }} onClick={() => onDuplicate(r)} title="이 일정을 새 날짜로 복제하여 신청합니다">
              복제 신청
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
