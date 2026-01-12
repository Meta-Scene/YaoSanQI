import { reactive } from 'vue'

export function useSimForm() {
  const options = {
    targetType: [
      { label: 'A型', value: 'A' },
      { label: 'B型', value: 'B' },
    ],
    trajectory: [
      { label: '轨迹A（示例）', value: 'traj_a' },
      { label: '轨迹B（示例）', value: 'traj_b' },
    ],
    prototypeType: [
      { label: '样机-01（示例）', value: 'proto_01' },
      { label: '样机-02（示例）', value: 'proto_02' },
    ],
    atmosphere: [
      { label: '标准大气（示例）', value: 'atm_std' },
      { label: '热带大气（示例）', value: 'atm_tropical' },
    ],
    aerosol: [
      { label: '城市气溶胶（示例）', value: 'aero_urban' },
      { label: '海洋气溶胶（示例）', value: 'aero_ocean' },
    ],
  }

  const simForm = reactive({
    target: {
      type: '',
      launchLon: '',
      launchLat: '',
      impactLon: '',
      impactLat: '',
    },
    prototype: {
      orbitHeightKm: 500,
      filterBuiltin: 'default_filter.csv',
      filterCustomFileName: '',
      optics: { focalMm: 200, apertureMm: 200, fNumber: 1.0, efficiency: 0.85 },
      detectorPreset: 'preset_a',
      detector: { scale: '512x512', pixelUm: 10, qe: 0.75, readNoiseDn: 5 },
      opticsTempC: 25,
      integrationMs: 20,
    },
    other: {
      trajectory: '',
      prototypeType: '',
      atmosphere: '',
      aerosol: '',
    },
  })

  return { options, simForm }
}
