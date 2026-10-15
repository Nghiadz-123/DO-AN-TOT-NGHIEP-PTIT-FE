import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import adminApi from '@/api/adminApi'
import Loading from '@/components/common/Loading'
import useFetch from '@/hooks/useFetch'
import { formatDate, getErrorMessage } from '@/utils/formatters'

const CONFIG = {
  users: { title: 'Người dùng', description: 'Quản lý tài khoản và quyền truy cập trên nền tảng.', search: 'Tìm theo tên, email hoặc số điện thoại', columns: ['Tài khoản', 'Vai trò', 'Ngày tham gia', 'Trạng thái', 'Thao tác'] },
  companies: { title: 'Doanh nghiệp', description: 'Xem và xác minh hồ sơ doanh nghiệp tham gia nền tảng.', search: 'Tìm tên doanh nghiệp', columns: ['Doanh nghiệp', 'Mã số thuế', 'Ngày tạo', 'Trạng thái xác minh', 'Thao tác'] },
  jobs: { title: 'Tin tuyển dụng', description: 'Theo dõi và kiểm soát tin tuyển dụng trên hệ thống.', search: 'Tìm theo tiêu đề công việc', columns: ['Vị trí tuyển dụng', 'Doanh nghiệp', 'Ngày đăng', 'Trạng thái', 'Thao tác'] },
}

const fetchers = { users: adminApi.getUsers, companies: adminApi.getCompanies, jobs: adminApi.getJobs }
const statusText = { pending: 'Chờ xác minh', verified: 'Đã xác minh', rejected: 'Từ chối', published: 'Đang tuyển', paused: 'Tạm dừng', closed: 'Đã đóng', expired: 'Hết hạn', draft: 'Bản nháp' }
const statusTone = { pending: 'warning', verified: 'success', rejected: 'danger', published: 'success', paused: 'warning', closed: 'neutral', expired: 'neutral', draft: 'neutral' }
const roleText = { admin: 'Quản trị viên', employer: 'Nhà tuyển dụng', candidate: 'Ứng viên' }

export default function AdminManagePage({ type }) {
  const config = CONFIG[type]
  const location = useLocation()
  const initialStatus = new URLSearchParams(location.search).get('status') || ''
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [query, setQuery] = useState({ q: '', status: initialStatus })
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const { data, loading, error, reload } = useFetch(() => fetchers[type](query), [type, query])

  useEffect(() => { setStatus(initialStatus); setQuery({ q: '', status: initialStatus }) }, [type, initialStatus])

  const submitSearch = (event) => { event.preventDefault(); setQuery({ q: search.trim(), status }) }
  const applyAction = async (row, payload) => {
    setBusy(row.id); setActionError('')
    try {
      if (type === 'users') await adminApi.updateUser(row.id, payload)
      if (type === 'companies') await adminApi.updateCompany(row.id, payload)
      if (type === 'jobs') await adminApi.updateJob(row.id, payload)
      reload()
    } catch (err) { setActionError(getErrorMessage(err)) } finally { setBusy('') }
  }

  if (loading) return <Loading />
  const rows = data?.results ?? []
  const stateOf = (row) => type === 'users' ? (row.is_active ? 'active' : 'inactive') : type === 'companies' ? row.verification_status : row.status

  return <>
    <div className="admin-page-heading"><div><span className="admin-eyebrow">QUẢN LÝ HỆ THỐNG</span><h1>{config.title}</h1><p>{config.description}</p></div><span className="admin-count-chip">{data?.count ?? rows.length} mục</span></div>
    {error && <div className="alert alert-error">Không tải được danh sách: {error}</div>}
    {actionError && <div className="alert alert-error">Không thể cập nhật: {actionError}</div>}
    <form className="card admin-filter-bar" onSubmit={submitSearch}>
      <input className="input admin-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={config.search} aria-label={config.search} />
      <select className="input admin-status-filter" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Lọc trạng thái">
        <option value="">Tất cả trạng thái</option>
        {type === 'companies' && <><option value="pending">Chờ xác minh</option><option value="verified">Đã xác minh</option><option value="rejected">Từ chối</option></>}
        {type === 'jobs' && <><option value="published">Đang tuyển</option><option value="paused">Tạm dừng</option><option value="closed">Đã đóng</option><option value="draft">Bản nháp</option></>}
      </select>
      <button className="btn btn-primary" type="submit">Tìm kiếm</button>
    </form>
    <section className="card admin-table-card"><div className="table-wrap"><table className="table admin-table"><thead><tr>{config.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>
      {rows.map((row) => {
        const state = stateOf(row)
        return <tr key={row.id}>
          <td><div className="admin-person"><span className="admin-avatar">{(row.full_name || row.name || row.title || row.email || '•').charAt(0).toUpperCase()}</span><div><strong>{type === 'users' ? row.full_name || 'Chưa cập nhật' : type === 'companies' ? row.name : row.title}</strong><small>{type === 'users' ? row.email : type === 'companies' ? row.email || row.website || 'Chưa có thông tin liên hệ' : row.job_type || 'Tin tuyển dụng'}</small></div></div></td>
          {type === 'users' && <td><span className="admin-role">{roleText[row.role] || row.role}</span></td>}
          {type === 'companies' && <td>{row.tax_code || '—'}</td>}
          {type === 'jobs' && <td>{row.company_name || '—'}</td>}
          <td>{formatDate(row.created_at)}</td>
          <td>{type === 'users' ? <span className={`badge ${row.is_active ? 'badge-success' : 'badge-neutral'}`}>{row.is_active ? 'Đang hoạt động' : 'Đã khóa'}</span> : <span className={`badge badge-${statusTone[state] || 'neutral'}`}>{statusText[state] || state}</span>}</td>
          <td><div className="actions admin-row-actions">
            {type === 'users' && <button className={`btn btn-sm ${row.is_active ? 'btn-ghost text-danger' : 'btn-outline'}`} disabled={busy === row.id || row.role === 'admin'} onClick={() => applyAction(row, { is_active: !row.is_active })}>{row.is_active ? 'Khóa' : 'Mở khóa'}</button>}
            {type === 'companies' && state === 'pending' && <><button className="btn btn-primary btn-sm" disabled={busy === row.id} onClick={() => applyAction(row, { verification_status: 'verified' })}>Xác minh</button><button className="btn btn-ghost btn-sm text-danger" disabled={busy === row.id} onClick={() => applyAction(row, { verification_status: 'rejected' })}>Từ chối</button></>}
            {type === 'jobs' && state === 'published' && <button className="btn btn-ghost btn-sm text-danger" disabled={busy === row.id} onClick={() => applyAction(row, { status: 'closed' })}>Đóng tin</button>}
            {type === 'jobs' && state === 'paused' && <button className="btn btn-outline btn-sm" disabled={busy === row.id} onClick={() => applyAction(row, { status: 'published' })}>Mở lại</button>}
            {(type === 'companies' && state !== 'pending' || type === 'jobs' && !['published', 'paused'].includes(state) || type === 'users' && row.role === 'admin') && <span className="text-muted small">—</span>}
          </div></td>
        </tr>
      })}
      {!rows.length && <tr><td colSpan="5"><div className="admin-empty"><span>⌕</span><strong>Không tìm thấy dữ liệu</strong><small>Hãy thử thay đổi từ khóa hoặc bộ lọc.</small></div></td></tr>}
    </tbody></table></div></section>
  </>
}
