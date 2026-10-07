import { useRef, useState } from 'react'
import employerApi from '@/api/employerApi'
import Badge from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import Loading from '@/components/common/Loading'
import useAuth from '@/hooks/useAuth'
import { useIndustries, useLocations } from '@/hooks/useCatalog'
import useFetch from '@/hooks/useFetch'
import { COMPANY_SIZES, LOGO_ACCEPT, LOGO_MAX_SIZE, VERIFICATION_STATUS } from '@/utils/constants'
import { getErrorMessage } from '@/utils/formatters'

const FIELDS = [
  'name', 'taxCode', 'website', 'email', 'phone', 'address', 'locationId', 'industryId', 'companySize', 'foundedYear',
  'description',
]
const CURRENT_YEAR = new Date().getFullYear()
const toForm = (company) => Object.fromEntries(FIELDS.map((f) => [f, company[f] ?? '']))

function CompanyForm({ company, canEdit, onSaved }) {
  const locations = useLocations()
  const industries = useIndustries()
  const [form, setForm] = useState(() => toForm(company))
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      onSaved(await employerApi.updateCompany(form))
      setMessage({ type: 'success', text: 'Đã lưu hồ sơ công ty.' })
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      <fieldset className="plain-fieldset" disabled={!canEdit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Tên công ty *</label>
            <input id="name" className="input" required maxLength={255} value={form.name} onChange={set('name')} />
          </div>
          <div className="form-group">
            <label htmlFor="taxCode">Mã số thuế</label>
            <input
              id="taxCode"
              className="input"
              placeholder="10 chữ số, VD: 0101234567"
              pattern="\d{10}(-\d{3})?"
              title="10 chữ số, chi nhánh thêm -XXX"
              value={form.taxCode}
              onChange={set('taxCode')}
            />
          </div>
        </div>
        <div className="form-row form-row-3">
          <div className="form-group">
            <label htmlFor="website">Website</label>
            <input id="website" type="url" className="input" placeholder="https://" value={form.website} onChange={set('website')} />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email liên hệ</label>
            <input id="email" type="email" className="input" value={form.email} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Điện thoại</label>
            <input id="phone" className="input" value={form.phone} onChange={set('phone')} />
          </div>
        </div>
        <div className="form-row form-row-3">
          <div className="form-group">
            <label htmlFor="locationId">Tỉnh/thành phố</label>
            <select id="locationId" className="input" value={form.locationId} onChange={set('locationId')}>
              <option value="">Chọn địa điểm</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="industryId">Ngành nghề</label>
            <select id="industryId" className="input" value={form.industryId} onChange={set('industryId')}>
              <option value="">Chọn ngành nghề</option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="companySize">Quy mô</label>
            <select id="companySize" className="input" value={form.companySize} onChange={set('companySize')}>
              <option value="">Chọn quy mô</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="address">Địa chỉ</label>
            <input id="address" className="input" maxLength={255} value={form.address} onChange={set('address')} />
          </div>
          <div className="form-group">
            <label htmlFor="foundedYear">Năm thành lập</label>
            <input
              id="foundedYear"
              type="number"
              min="1800"
              max={CURRENT_YEAR}
              className="input"
              value={form.foundedYear}
              onChange={set('foundedYear')}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="description">Giới thiệu công ty</label>
          <textarea id="description" className="input" rows={5} value={form.description} onChange={set('description')} />
        </div>
        {canEdit && (
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu hồ sơ công ty'}
          </button>
        )}
      </fieldset>
    </form>
  )
}

export default function CompanyProfilePage() {
  const { user, updateUser } = useAuth()
  const { data: company, loading, error, setData: setCompany } = useFetch(() => employerApi.getCompany(), [])
  const [logoError, setLogoError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const canEdit = ['owner', 'admin'].includes(user.companyRole)

  if (loading) return <Loading />
  if (error) return <div className="alert alert-error">{error}</div>

  const applyCompany = (updated) => {
    setCompany(updated)
    updateUser({ ...user, companyName: updated.name, companyLogo: updated.logoUrl })
  }

  const changeLogo = async (task) => {
    setUploading(true)
    setLogoError('')
    try {
      applyCompany(await task())
    } catch (err) {
      setLogoError(getErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const handleFile = (file) => {
    if (!file) return
    if (file.size > LOGO_MAX_SIZE) return setLogoError('Logo tối đa 2 MB.')
    changeLogo(() => employerApi.uploadLogo(file))
  }

  const verification = VERIFICATION_STATUS[company.verificationStatus]

  return (
    <div className="narrow">
      <div className="page-header">
        <div>
          <h1>Hồ sơ công ty</h1>
          <p className="text-muted">Thông tin hiển thị cùng các tin tuyển dụng của công ty</p>
        </div>
        {verification && <Badge tone={verification.tone}>{verification.label}</Badge>}
      </div>

      {company.verificationStatus !== 'verified' && (
        <div className="alert alert-info">
          Công ty đang chờ quản trị viên xác minh (dựa trên mã số thuế). Đổi tên hoặc mã số thuế sau khi đã xác minh sẽ
          cần xác minh lại.
        </div>
      )}
      {!canEdit && (
        <div className="alert alert-info">Chỉ chủ sở hữu hoặc quản trị viên công ty được chỉnh sửa hồ sơ này.</div>
      )}

      <div className="card logo-uploader">
        <CompanyLogo name={company.name} src={company.logoUrl} large />
        <div>
          <strong>Logo công ty</strong>
          <p className="text-muted small">JPG, PNG hoặc WEBP, tối đa 2 MB.</p>
          {canEdit && (
            <div className="actions">
              <input
                ref={fileRef}
                type="file"
                accept={LOGO_ACCEPT}
                hidden
                onChange={(e) => {
                  handleFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <button className="btn btn-outline btn-sm" disabled={uploading} onClick={() => fileRef.current.click()}>
                {uploading ? 'Đang tải lên...' : company.logoUrl ? 'Đổi logo' : 'Tải logo lên'}
              </button>
              {company.logoUrl && (
                <button
                  className="btn btn-ghost btn-sm text-danger"
                  disabled={uploading}
                  onClick={() => changeLogo(() => employerApi.removeLogo())}
                >
                  Xóa logo
                </button>
              )}
            </div>
          )}
          {logoError && <div className="alert alert-error">{logoError}</div>}
        </div>
      </div>

      <CompanyForm company={company} canEdit={canEdit} onSaved={applyCompany} />
    </div>
  )
}
