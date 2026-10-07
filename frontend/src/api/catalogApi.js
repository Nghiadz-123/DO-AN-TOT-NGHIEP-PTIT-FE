import catalogMock from '@/mocks/api/catalogMock'
import { USE_MOCK } from '@/utils/constants'
import axiosClient from './axiosClient'

// Danh mục dùng chung: tỉnh/thành, ngành nghề, gợi ý kỹ năng
const catalogApi = {
  getLocations: () => axiosClient.get('/catalog/locations/'),
  getIndustries: () => axiosClient.get('/catalog/industries/'),
  searchSkills: (search) => axiosClient.get('/catalog/skills/', { params: { search } }),
}

export default USE_MOCK ? catalogMock : catalogApi
