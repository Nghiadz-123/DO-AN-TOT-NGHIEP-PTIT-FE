import { normalize } from '@/utils/text'
import { INDUSTRIES, LOCATIONS, SKILLS } from '../catalogData'
import { delay } from '../db'

const catalogMock = {
  async getLocations() {
    await delay(100)
    return LOCATIONS
  },

  async getIndustries() {
    await delay(100)
    return INDUSTRIES
  },

  async searchSkills(search = '') {
    await delay(100)
    const keyword = normalize(search)
    return SKILLS.filter((name) => normalize(name).includes(keyword))
      .slice(0, 20)
      .map((name, i) => ({ id: i + 1, name }))
  },
}

export default catalogMock
