import { useRef, useState } from 'react'
import { BadgeCheck, Building, CircleX, Clock, FileText, ImagePlus, Info, Lock, Phone, Save, Trash, TriangleAlert } from 'lucide-react'
import employerApi from '@/api/employerApi'
import Badge from '@/components/common/Badge'
import CompanyLogo from '@/components/common/CompanyLogo'
import ErrorState from '@/components/common/ErrorState'
import FormStatus from '@/components/common/FormStatus'
import { SkeletonLines } from '@/components/common/Skeleton'
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
const VERIFICATION_ICONS = { pending: Clock, verified: BadgeCheck, rejected: CircleX }
const toForm = (company) => Object.fromEntries(FIELDS.map((f) => [f, company[f] ?? '']))

function Select({ id, label, value, onChange, options, placeholder }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function CompanyForm({ company, canEdit, onSaved }) {
  const locations = useLocations()
  const industries = useIndustries()
  const [form, setForm] = useState(() => toForm(company))
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)
  // Đã xác minh mà đổi tên / mã số thuế thì backend đưa công ty về chờ xác minh lại
  const reverifyHint = company.verificationStatus === 'verified' ? 'company-reverify-hint' : undefined

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
      <fieldset className="form-sections" disabled={!canEdit}>
        <fieldset className="form-section">
          <legend>
            <Building />
            Thông tin doanh nghiệp
          </legend>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">
                Tên công ty
                <span className="required-mark" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="name"
                className="input"
                required
                maxLength={255}
                aria-describedby={reverifyHint}
                value={form.name}
                onChange={set('name')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="taxCode">Mã số thuế</label>
              <input
                id="taxCode"
                className="input"
                inputMode="numeric"
                placeholder="10 chữ số, VD: 0101234567"
                pattern="\d{10}(-\d{3})?"
                title="10 chữ số, chi nhánh thêm -XXX"
                aria-describedby={reverifyHint}
                value={form.taxCode}
                onChange={set('taxCode')}
              />
            </div>
          </div>
          {reverifyHint && (
            <p id={reverifyHint} className="field-hint form-section-hint">
              Đổi tên hoặc mã số thuế sau khi đã xác minh sẽ cần quản trị viên xác minh lại.
            </p>
          )}
          <div className="form-row form-row-3">
            <Select
              id="industryId"
              label="Ngành nghề"
              placeholder="Chọn ngành nghề"
              value={form.industryId}
              onChange={set('industryId')}
              options={industries.map((i) => ({ value: i.id, label: i.name }))}
            />
            <Select
              id="companySize"
              label="Quy mô"
              placeholder="Chọn quy mô"
              value={form.companySize}
              onChange={set('companySize')}
              options={COMPANY_SIZES}
            />
            <div className="form-group">
              <label htmlFor="foundedYear">Năm thành lập</label>
              <input
                id="foundedYear"
                type="number"
                inputMode="numeric"
                min="1800"
                max={CURRENT_YEAR}
                className="input"
                value={form.foundedYear}
                onChange={set('foundedYear')}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>
            <Phone />
            Liên hệ và địa chỉ
          </legend>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="url"
                inputMode="url"
                className="input"
                placeholder="https://"
                value={form.website}
                onChange={set('website')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email liên hệ</label>
              <input id="email" type="email" className="input" autoComplete="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Điện thoại</label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                className="input"
                autoComplete="tel"
                value={form.phone}
                onChange={set('phone')}
              />
            </div>
          </div>
          <div className="form-row">
            <Select
              id="locationId"
              label="Tỉnh/thành phố"
              placeholder="Chọn địa điểm"
              value={form.locationId}
              onChange={set('locationId')}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
            />
            <div className="form-group">
              <label htmlFor="address">Địa chỉ</label>
              <input id="address" className="input" maxLength={255} value={form.address} onChange={set('address')} />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>
            <FileText />
            Giới thiệu
          </legend>
          <div className="form-group">
            <label htmlFor="description">Giới thiệu công ty</label>
            <textarea
              id="description"
              className="input"
              rows={6}
              aria-describedby="description-hint"
              value={form.description}
              onChange={set('description')}
            />
            <small id="description-hint" className="field-hint">
              Hiển thị ở trang công ty và cạnh các tin tuyển dụng.
            </small>
          </div>
        </fieldset>
      </fieldset>

      {canEdit && (
        <div className="form-footer">
          <FormStatus message={message} />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" aria-hidden="true" /> : <Save />}
            {saving ? 'Đang lưu...' : 'Lưu hồ sơ công ty'}
          </button>
        </div>
      )}
    </form>
  )
}

export default function CompanyProfilePage() {
  const { user, updateUser } = useAuth()
  const { data: company, loading, error, setData: setCompany, reload } = useFetch(() => employerApi.getCompany(), [])
  const [logoError, setLogoError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const canEdit = ['owner', 'admin'].includes(user.companyRole)

  const header = (verification) => (
    <div className="page-header">
      <div>
        <h1>Hồ sơ công ty</h1>
        <p className="text-muted">Thông tin hiển thị cùng các tin tuyển dụng của công ty</p>
      </div>
      {verification}
    </div>
  )

  if (loading) {
    return (
      <div className="narrow stack">
        {header()}
        <div className="card">
          <SkeletonLines lines={6} label="Đang tải hồ sơ công ty" />
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="narrow stack">
        {header()}
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }

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
  const VerificationIcon = VERIFICATION_ICONS[company.verificationStatus]

  return (
    <div className="narrow stack">
      {header(
        verification && (
          <Badge tone={verification.tone}>
            {VerificationIcon && <VerificationIcon />}
            {verification.label}
          </Badge>
        ),
      )}

      {company.verificationStatus === 'pending' && (
        <div className="alert alert-info">
          <Info />
          <div className="alert-content">Công ty đang chờ quản trị viên xác minh (dựa trên mã số thuế).</div>
        </div>
      )}
      {company.verificationStatus === 'rejected' && (
        <div className="alert alert-warning">
          <TriangleAlert />
          <div className="alert-content">
            Quản trị viên chưa xác minh được công ty. Kiểm tra lại tên công ty và mã số thuế.
          </div>
        </div>
      )}
      {!canEdit && (
        <div className="alert alert-info">
          <Lock />
          <div className="alert-content">Chỉ chủ sở hữu hoặc quản trị viên công ty được chỉnh sửa hồ sơ này.</div>
        </div>
      )}

      <section className="card logo-uploader" aria-labelledby="logo-title">
        <CompanyLogo name={company.name} src={company.logoUrl} large />
        <div className="logo-uploader-body">
          <h2 id="logo-title" className="logo-uploader-title">
            Logo công ty
          </h2>
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
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={uploading}
                onClick={() => fileRef.current.click()}
              >
                {uploading ? <span className="spinner" aria-hidden="true" /> : <ImagePlus />}
                {uploading ? 'Đang tải lên...' : company.logoUrl ? 'Đổi logo' : 'Tải logo lên'}
              </button>
              {company.logoUrl && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-danger"
                  disabled={uploading}
                  onClick={() => changeLogo(() => employerApi.removeLogo())}
                >
                  <Trash />
                  Xóa logo
                </button>
              )}
            </div>
          )}
          {logoError && (
            <p className="field-error" role="alert">
              <TriangleAlert />
              {logoError}
            </p>
          )}
        </div>
      </section>

      <CompanyForm company={company} canEdit={canEdit} onSaved={applyCompany} />
    </div>
  )
}
