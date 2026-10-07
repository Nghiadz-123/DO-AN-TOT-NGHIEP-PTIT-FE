import { delay, getDb, httpError, requireRecruiter, saveDb } from '../db'

const TAX_CODE = /^\d{10}(-\d{3})?$/

const companyView = (company) => ({ ...company })

function profileView(user) {
  const { fullName, email, phone = '', position = '', companyRole, joinedAt } = user
  return { fullName, email, phone, position, companyRole, joinedAt }
}

function requireCompanyAdmin() {
  const ctx = requireRecruiter()
  if (!['owner', 'admin'].includes(ctx.user.companyRole)) {
    throw httpError(403, 'Chỉ chủ sở hữu hoặc quản trị viên công ty được chỉnh sửa hồ sơ công ty.')
  }
  return ctx
}

const employerMock = {
  async getCompany() {
    await delay()
    return companyView(requireRecruiter().company)
  },

  async updateCompany(form) {
    await delay()
    const { company } = requireCompanyAdmin()
    const name = form.name.trim()
    const taxCode = form.taxCode.trim()
    if (!name) throw httpError(400, 'Tên công ty không được để trống.')
    if (taxCode && !TAX_CODE.test(taxCode)) {
      throw httpError(400, 'Mã số thuế gồm 10 chữ số (chi nhánh: 10 số + "-" + 3 số).')
    }
    if (taxCode && getDb().companies.some((c) => c.id !== company.id && c.taxCode === taxCode)) {
      throw httpError(400, 'Mã số thuế đã được đăng ký bởi công ty khác.')
    }
    // Đổi tên / MST sau khi đã xác minh thì phải xác minh lại (giống backend)
    if (company.verificationStatus === 'verified' && (name !== company.name || taxCode !== company.taxCode)) {
      company.verificationStatus = 'pending'
    }
    Object.assign(company, form, { name, taxCode })
    saveDb()
    return companyView(company)
  },

  async uploadLogo(file) {
    await delay()
    const { company } = requireCompanyAdmin()
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw httpError(400, 'Logo phải là ảnh JPG, PNG hoặc WEBP.')
    if (file.size > 2 * 1024 * 1024) throw httpError(400, 'File vượt quá dung lượng cho phép (2 MB).')
    company.logoUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    saveDb()
    return companyView(company)
  },

  async removeLogo() {
    await delay()
    const { company } = requireCompanyAdmin()
    company.logoUrl = null
    saveDb()
    return companyView(company)
  },

  async getProfile() {
    await delay()
    return profileView(requireRecruiter().user)
  },

  async updateProfile({ fullName, phone, position }) {
    await delay()
    const { user } = requireRecruiter()
    if (!fullName.trim()) throw httpError(400, 'Họ tên không được để trống.')
    Object.assign(user, { fullName: fullName.trim(), phone: phone.trim(), position: position.trim() })
    saveDb()
    return profileView(user)
  },
}

export default employerMock
