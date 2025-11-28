import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let fullAddress = null

export const loadFullAddress = () => {
  if (!fullAddress) {
    const filePath = path.join(__dirname, '../../public/data/full_address.json')
    const raw = fs.readFileSync(filePath, 'utf-8')
    const json = JSON.parse(raw)
    fullAddress = json.data
  }
  return fullAddress
}

export const getProvinceName = (id) => {
  if (!id) return ''
  const provinces = loadFullAddress()

  const prov = provinces.find((p) => String(p.id) === String(id))

  return prov ? prov.name : String(id)
}

export const getCommuneName = (provinceId, communeId) => {
  if (!provinceId || !communeId) return ''
  const provinces = loadFullAddress()

  // Tìm province theo ID
  const prov = provinces.find((p) => String(p.id) === String(provinceId))

  if (!prov || !prov.data2) return String(communeId)

  // Tìm commune theo ID
  const commune = prov.data2.find((c) => String(c.id) === String(communeId))

  return commune ? commune.name : String(communeId)
}
