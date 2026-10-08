import { currentUser, delay, genId, getDb, httpError, publicUser, saveDb } from '../db'

const session = (user) => ({ access: `mock-token-${user.id}`, user: publicUser(user) })

const authMock = {
  async login({ email, password }) {
    await delay()
    const user = getDb().users.find((u) => u.email === email.trim().toLowerCase())
    if (!user || user.password !== password) throw httpError(401, 'Email hoặc mật khẩu không đúng.')
    return session(user)
  },

  async register({ fullName, email, password, role, companyName }) {
    await delay()
    // Khong cho phep dang ky role admin tu form
    if (role === 'admin') throw httpError(403, 'Không thể đăng ký tài khoản admin.')
    const db = getDb()
    const normalizedEmail = email.trim().toLowerCase()
    if (db.users.some((u) => u.email === normalizedEmail)) throw httpError(400, 'Email đã được sử dụng.')
    const user = { id: genId('u'), fullName, email: normalizedEmail, password, role }
    if (role === 'employer') {
      const company = {
        id: genId('co'),
        name: companyName.trim(),
        taxCode: '',
        logoUrl: null,
        website: '',
        email: '',
        phone: '',
        address: '',
        locationId: '',
        industryId: '',
        companySize: '',
        foundedYear: '',
        description: '',
        verificationStatus: 'pending',
      }
      db.companies.push(company)
      Object.assign(user, { companyId: company.id, companyRole: 'owner', position: '', joinedAt: new Date().toISOString() })
    }
    db.users.push(user)
    saveDb()
    return session(user)
  },

  async getMe() {
    await delay(150)
    return publicUser(currentUser())
  },

  async updateProfile(data) {
    await delay()
    const user = currentUser()
    Object.assign(user, data)
    saveDb()
    return publicUser(user)
  },

  async changePassword({ currentPassword, newPassword }) {
    await delay()
    const user = currentUser()
    if (user.password !== currentPassword) throw httpError(400, 'Mật khẩu hiện tại không đúng.')
    user.password = newPassword
    saveDb()
    return { access: `mock-token-${user.id}` }
  },

  async logout() {},
}

export default authMock
