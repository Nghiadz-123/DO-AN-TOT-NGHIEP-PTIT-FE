import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Archive, BadgeCheck, CircleX, Lock, LockOpen, Play, Search, SearchX, TriangleAlert } from 'lucide-react'
import adminApi from '@/api/adminApi'
import ActiveFilters from '@/components/common/ActiveFilters'
import Badge, { JobStatusBadge } from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { SkeletonLines } from '@/components/common/Skeleton'
import useFetch from '@/hooks/useFetch'
import { JOB_LEVELS, JOB_STATUS, JOB_TYPES, ROLE_LABELS, ROLES, VERIFICATION_STATUS } from '@/utils/constants'
import { formatDate, getErrorMessage, labelOf } from '@/utils/formatters'

const toOptions = (map) => Object.entries(map).map(([value, meta]) => ({ value, label: meta.label ?? meta }))

// filter: tham số lọc backend nhận (accounts/views.py: users lọc theo role, companies / jobs lọc theo status)
const CONFIG = {
  users: {
    title: 'Người dùng',
    description: 'Quản lý tài khoản và quyền truy cập trên nền tảng.',
    search: 'Tìm theo tên, email hoặc số điện thoại',
    columns: ['Tài khoản', 'Vai trò', 'Ngày tham gia', 'Trạng thái'],
    filter: { param: 'role', label: 'Vai trò', all: 'Tất cả vai trò', options: toOptions(ROLE_LABELS) },
    fetch: adminApi.getUsers,
    update: adminApi.updateUser,
  },
  companies: {
    title: 'Doanh nghiệp',
    description: 'Xem và xác minh hồ sơ doanh nghiệp tham gia nền tảng.',
    search: 'Tìm theo tên doanh nghiệp',
    columns: ['Doanh nghiệp', 'Mã số thuế', 'Ngày tạo', 'Xác minh'],
    filter: { param: 'status', label: 'Trạng thái xác minh', all: 'Tất cả trạng thái', options: toOptions(VERIFICATION_STATUS) },
    fetch: adminApi.getCompanies,
    update: adminApi.updateCompany,
  },
  jobs: {
    title: 'Tin tuyển dụng',
    description: 'Theo dõi và kiểm soát tin tuyển dụng trên hệ thống.',
    search: 'Tìm theo tiêu đề công việc',
    columns: ['Vị trí tuyển dụng', 'Doanh nghiệp', 'Ngày tạo', 'Trạng thái'],
    filter: { param: 'status', label: 'Trạng thái tin', all: 'Tất cả trạng thái', options: toOptions(JOB_STATUS) },
    fetch: adminApi.getJobs,
    update: adminApi.updateJob,
  },
}

// Thao tác theo từng dòng; confirm: thao tác làm mất quyền truy cập / ngừng hiển thị thì hỏi lại trước
const actionsOf = (type, row) => {
  if (type === 'users') {
    if (row.role === ROLES.ADMIN) return []
    return row.is_active
      ? [
          {
            label: 'Khóa',
            icon: Lock,
            danger: true,
            payload: { is_active: false },
            confirm: {
              title: 'Khóa tài khoản?',
              message: `Tài khoản ${row.email} sẽ không đăng nhập được cho tới khi được mở khóa.`,
              confirmLabel: 'Khóa tài khoản',
            },
          },
        ]
      : [{ label: 'Mở khóa', icon: LockOpen, payload: { is_active: true } }]
  }
  if (type === 'companies') {
    if (row.verification_status !== 'pending') return []
    return [
      { label: 'Xác minh', icon: BadgeCheck, primary: true, payload: { verification_status: 'verified' } },
      {
        label: 'Từ chối',
        icon: CircleX,
        danger: true,
        payload: { verification_status: 'rejected' },
        confirm: {
          title: 'Từ chối xác minh?',
          message: `Doanh nghiệp "${row.name}" sẽ chuyển sang trạng thái "Xác minh bị từ chối".`,
          confirmLabel: 'Từ chối xác minh',
        },
      },
    ]
  }
  if (row.status === 'published') {
    return [
      {
        label: 'Đóng tin',
        icon: Archive,
        danger: true,
        payload: { status: 'closed' },
        confirm: {
          title: 'Đóng tin tuyển dụng?',
          message: `Tin "${row.title}" sẽ ngừng hiển thị và ngừng nhận hồ sơ.`,
          confirmLabel: 'Đóng tin',
        },
      },
    ]
  }
  if (row.status === 'paused') return [{ label: 'Mở lại', icon: Play, payload: { status: 'published' } }]
  return []
}

const initialOf = (text) => (text || '?').charAt(0).toUpperCase()

function RowCells({ type, row }) {
  if (type === 'users') {
    return (
      <>
        <td className="table-cell-main">
          <div className="person">
            <span className="avatar" aria-hidden="true">
              {initialOf(row.full_name || row.email)}
            </span>
            <div className="person-text">
              <strong>{row.full_name || 'Chưa cập nhật tên'}</strong>
              <small>{[row.email, row.phone].filter(Boolean).join(' · ')}</small>
            </div>
          </div>
        </td>
        <td data-label="Vai trò">{ROLE_LABELS[row.role] ?? row.role}</td>
        <td data-label="Ngày tham gia" className="nowrap tabular-nums">
          {formatDate(row.created_at)}
        </td>
        <td data-label="Trạng thái">
          <Badge tone={row.is_active ? 'success' : 'neutral'}>
            {row.is_active ? <LockOpen /> : <Lock />}
            {row.is_active ? 'Đang hoạt động' : 'Đã khóa'}
          </Badge>
        </td>
      </>
    )
  }
  if (type === 'companies') {
    const status = VERIFICATION_STATUS[row.verification_status]
    return (
      <>
        <td className="table-cell-main">
          <div className="person">
            <span className="company-logo company-logo-sm" aria-hidden="true">
              {initialOf(row.name)}
            </span>
            <div className="person-text">
              <strong>{row.name}</strong>
              <small>{row.email || row.website || row.phone || 'Chưa có thông tin liên hệ'}</small>
            </div>
          </div>
        </td>
        <td data-label="Mã số thuế" className="tabular-nums">
          {row.tax_code || <span className="text-muted">Chưa có</span>}
        </td>
        <td data-label="Ngày tạo" className="nowrap tabular-nums">
          {formatDate(row.created_at)}
        </td>
        <td data-label="Xác minh">
          <Badge tone={status?.tone}>{status?.label ?? row.verification_status}</Badge>
        </td>
      </>
    )
  }
  return (
    <>
      <td className="table-cell-main">
        {/* Trang tin công khai chỉ mở được khi tin đang tuyển */}
        {row.status === 'published' ? (
          <Link to={`/jobs/${row.id}`} className="table-title">
            {row.title}
          </Link>
        ) : (
          <strong className="table-title">{row.title}</strong>
        )}
        <span className="table-sub">
          {[labelOf(JOB_TYPES, row.job_type), labelOf(JOB_LEVELS, row.level)].filter(Boolean).join(' · ')}
        </span>
      </td>
      <td data-label="Doanh nghiệp">{row.company_name || <span className="text-muted">Chưa rõ</span>}</td>
      <td data-label="Ngày tạo" className="nowrap tabular-nums">
        {formatDate(row.created_at)}
      </td>
      <td data-label="Trạng thái">
        <JobStatusBadge status={row.status} />
      </td>
    </>
  )
}

// Ba route dùng chung trang này: key theo loại để chuyển mục là làm mới toàn bộ trạng thái (ô tìm kiếm, hộp xác nhận)
export default function AdminManagePage({ type }) {
  return <ManageList key={type} type={type} />
}

function ManageList({ type }) {
  const config = CONFIG[type]
  const { param } = config.filter
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('q') ?? ''
  const filter = searchParams.get(param) ?? ''
  const [search, setSearch] = useState(keyword)
  const [busyId, setBusyId] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirming, setConfirming] = useState(null) // { row, action }

  const { data, loading, error, reload } = useFetch(
    () => config.fetch({ q: keyword, [param]: filter }),
    [type, keyword, filter],
  )

  const setParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    setSearchParams(next)
  }

  const apply = async (row, action) => {
    setBusyId(row.id)
    setActionError('')
    try {
      await config.update(row.id, action.payload)
      reload()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusyId('')
    }
  }

  const runAction = (row, action) => (action.confirm ? setConfirming({ row, action }) : apply(row, action))

  const confirmAction = () => {
    const { row, action } = confirming
    setConfirming(null)
    apply(row, action)
  }

  const rows = data?.results ?? []
  const count = data?.count ?? rows.length
  const filterLabel = config.filter.options.find((o) => o.value === filter)?.label
  const activeFilters = [
    keyword && { key: 'q', label: 'Từ khóa', value: keyword },
    filter && { key: param, label: config.filter.label, value: filterLabel ?? filter },
  ].filter(Boolean)

  const clearFilters = () => {
    setSearch('')
    setParams({ q: '', [param]: '' })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{config.title}</h1>
          <p className="text-muted">{config.description}</p>
        </div>
      </div>

      <div className="card toolbar">
        <div className="toolbar-row">
          <form
            className="toolbar-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              setParams({ q: search.trim() })
            }}
          >
            <label className="input-icon">
              <Search />
              <span className="visually-hidden">{config.search}</span>
              <input
                type="search"
                className="input"
                placeholder={`${config.search}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-primary">
              Tìm
            </button>
          </form>
          <div className="form-group">
            <label htmlFor={`admin-filter-${type}`}>{config.filter.label}</label>
            <select
              id={`admin-filter-${type}`}
              className="input"
              value={filter}
              onChange={(e) => setParams({ [param]: e.target.value })}
            >
              <option value="">{config.filter.all}</option>
              {config.filter.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ActiveFilters
        items={activeFilters}
        onRemove={(key) => {
          if (key === 'q') setSearch('')
          setParams({ [key]: '' })
        }}
        onClear={clearFilters}
      />

      {actionError && (
        <div className="alert alert-error" role="alert">
          <TriangleAlert />
          <div className="alert-content">Không thể cập nhật: {actionError}</div>
        </div>
      )}
      {loading && !data && (
        <div className="card">
          <SkeletonLines lines={5} label={`Đang tải danh sách ${config.title.toLowerCase()}`} />
        </div>
      )}
      {error && <ErrorState title="Không tải được danh sách" message={error} onRetry={reload} />}

      {data &&
        (rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Không tìm thấy dữ liệu"
            description={activeFilters.length ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc.' : 'Chưa có dữ liệu nào.'}
            action={
              activeFilters.length > 0 && (
                <button type="button" className="btn btn-outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </button>
              )
            }
          />
        ) : (
          <>
            <p className="results-count text-muted small" aria-live="polite">
              {rows.length < count
                ? `Hiển thị ${rows.length} mục mới nhất trên tổng ${count}. Tìm kiếm hoặc lọc để thu hẹp danh sách.`
                : `${count} mục`}
            </p>
            <div className={`card table-card ${loading ? 'is-refreshing' : ''}`}>
              <div className="table-wrap">
                <table className="table table-stack">
                  <thead>
                    <tr>
                      {config.columns.map((column) => (
                        <th key={column} scope="col">
                          {column}
                        </th>
                      ))}
                      <th scope="col" className="table-cell-actions">
                        <span className="visually-hidden">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const busy = busyId === row.id
                      const actions = actionsOf(type, row)
                      return (
                        <tr key={row.id} className={busy ? 'row-busy' : ''} aria-busy={busy}>
                          <RowCells type={type} row={row} />
                          <td className="table-cell-actions">
                            {actions.length ? (
                              <div className="row-actions">
                                {actions.map((action) => (
                                  <button
                                    key={action.label}
                                    type="button"
                                    className={`btn btn-sm ${
                                      action.primary ? 'btn-primary' : action.danger ? 'btn-ghost text-danger' : 'btn-outline'
                                    }`}
                                    disabled={busy}
                                    onClick={() => runAction(row, action)}
                                  >
                                    <action.icon />
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              type === 'users' &&
                              row.role === ROLES.ADMIN && <span className="text-muted small">Tài khoản quản trị</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ))}

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming?.action.confirm.title}
        message={confirming?.action.confirm.message}
        confirmLabel={confirming?.action.confirm.confirmLabel}
        onConfirm={confirmAction}
        onCancel={() => setConfirming(null)}
      />
    </>
  )
}
