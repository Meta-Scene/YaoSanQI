<template>
  <div v-if="visible" class="modal-mask" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">仿真进程</div>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>

      <div class="steps">
        <div class="step" :class="{active: step===0}" @click="step=0">1 目标参数</div>
        <div class="step" :class="{active: step===1}" @click="step=1">2 样机参数</div>
        <div class="step" :class="{active: step===2}" @click="step=2">3 其他参数</div>
      </div>

      <div class="modal-body">
        <!-- ========== 1) 目标参数输入 ========== -->
        <div v-show="step===0" class="page">
          <div class="form-grid">
            <div class="form-item">
              <label class="form-label">目标类型</label>
              <select class="form-select" v-model="form.target.type">
                <option value="" disabled>请选择目标类型</option>
                <option v-for="o in options.targetType" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="form-item two-col">
              <label class="form-label">发射点位置</label>
              <div class="inline">
                <span class="mini">经度</span>
                <input class="form-input" type="number" v-model.number="form.target.launchLon" placeholder="-180~180" />
                <span class="mini">纬度</span>
                <input class="form-input" type="number" v-model.number="form.target.launchLat" placeholder="-90~90" />
                <button class="mini-btn" @click="$emit('pickLaunch')">三维拾取</button>
              </div>
              <div class="hint">经度限制：-180～180；纬度限制：-90～90</div>
            </div>

            <div class="form-item two-col">
              <label class="form-label">落点位置</label>
              <div class="inline">
                <span class="mini">经度</span>
                <input class="form-input" type="number" v-model.number="form.target.impactLon" placeholder="-180~180" />
                <span class="mini">纬度</span>
                <input class="form-input" type="number" v-model.number="form.target.impactLat" placeholder="-90~90" />
                <button class="mini-btn" @click="$emit('pickImpact')">三维拾取</button>
              </div>
              <div class="hint">经度限制：-180～180；纬度限制：-90～90</div>
            </div>

            <div class="form-item two-col">
              <label class="form-label">示意图</label>
              <div class="inline">
                <input class="file" type="file" accept="image/*" @change="onTargetImage" />
                <span class="file-name">{{ targetImageName || '未选择' }}</span>
              </div>
              <div v-if="targetImageUrl" class="image-box">
                <img :src="targetImageUrl" alt="示意图" />
              </div>
            </div>

            <div class="form-item two-col">
              <label class="form-label">可选性提示</label>
              <div class="info">
                用于说明：可通过鼠标左键在地球上拾取坐标；拾取完成后会自动写入发射点/落点输入框。
              </div>
            </div>
          </div>
        </div>

        <!-- ========== 2) 样机参数输入 ========== -->
        <div v-show="step===1" class="page">
          <div class="form-grid">
            <div class="form-item">
              <label class="form-label">轨道高度 (km)</label>
              <input class="form-input" type="number" v-model.number="form.prototype.orbitHeightKm" @blur="validateOrbitHeight" />
              <div v-if="orbitHeightError" class="error">{{ orbitHeightError }}</div>
              <div class="hint">数值型输入，超出范围提示“请输入 400-600km 内的数值”；组网模式下所有样机统一高度。</div>
            </div>

            <div class="form-item two-col">
              <label class="form-label">滤光片参数</label>
              <div class="stack">
                <div class="inline">
                  <select class="form-select" v-model="form.prototype.filterBuiltin">
                    <option value="default_filter.csv">默认透过率曲线文件（default_filter.csv）</option>
                    <option value="filter_alt.csv">内置曲线（filter_alt.csv）</option>
                  </select>
                  <input class="file" type="file" accept=".csv,.txt" @change="onFilterFile" />
                </div>
                <div class="hint">支持 CSV/TXT，需包含“波长（nm）- 透过率”两列数据。</div>
                <div class="file-name">自定义文件：{{ filterFileName || '未上传' }}</div>
              </div>
            </div>

            <div class="form-item two-col">
              <label class="form-label">光机系统</label>
              <details open class="collapse">
                <summary>展开/收起</summary>
                <div class="collapse-body">
                  <div class="subgrid">
                    <div class="subitem">
                      <span class="mini">焦距 (mm)</span>
                      <input class="form-input" type="number" v-model.number="form.prototype.optics.focalMm" @input="recalcFNumber" />
                      <div class="hint">50～500mm</div>
                    </div>
                    <div class="subitem">
                      <span class="mini">口径 (mm)</span>
                      <input class="form-input" type="number" v-model.number="form.prototype.optics.apertureMm" @input="recalcFNumber" />
                      <div class="hint">100～500mm</div>
                    </div>
                    <div class="subitem">
                      <span class="mini">F 数</span>
                      <input class="form-input" type="number" v-model.number="form.prototype.optics.fNumber" disabled />
                      <div class="hint">自动计算：F = 焦距 / 口径</div>
                    </div>
                    <div class="subitem">
                      <span class="mini">系统光学效率</span>
                      <input class="form-input" type="number" step="0.01" v-model.number="form.prototype.optics.efficiency" />
                      <div class="hint">0.6～0.95</div>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <div class="form-item two-col">
              <label class="form-label">探测器型号</label>
              <details open class="collapse">
                <summary>展开/收起</summary>
                <div class="collapse-body">
                  <div class="inline">
                    <span class="mini">预设型号</span>
                    <select class="form-select" v-model="form.prototype.detectorPreset" @change="applyDetectorPreset">
                      <option value="preset_a">预设A</option>
                      <option value="preset_b">预设B</option>
                      <option value="custom">自定义</option>
                    </select>
                  </div>
                  <div class="subgrid">
                    <div class="subitem">
                      <span class="mini">规模 (像素)</span>
                      <input class="form-input" v-model="form.prototype.detector.scale" placeholder="512x512" />
                      <div class="hint">128×128～2048×2048</div>
                    </div>
                    <div class="subitem">
                      <span class="mini">像元尺寸 (μm)</span>
                      <input class="form-input" type="number" v-model.number="form.prototype.detector.pixelUm" />
                      <div class="hint">5～20μm</div>
                    </div>
                    <div class="subitem">
                      <span class="mini">QE</span>
                      <input class="form-input" type="number" step="0.01" v-model.number="form.prototype.detector.qe" />
                      <div class="hint">0.6～0.9</div>
                    </div>
                    <div class="subitem">
                      <span class="mini">读出噪声 (DN)</span>
                      <input class="form-input" type="number" v-model.number="form.prototype.detector.readNoiseDn" />
                      <div class="hint">1～20 DN</div>
                    </div>
                  </div>
                  <div class="hint">量子效率表征光子-电信号转换能力；读出噪声影响探测信噪比。</div>
                </div>
              </details>
            </div>

            <div class="form-item">
              <label class="form-label">光机温度 (℃)</label>
              <input class="form-input" type="number" step="0.1" v-model.number="form.prototype.opticsTempC" @blur="validateOpticsTemp" />
              <div v-if="opticsTempWarn" class="warn">{{ opticsTempWarn }}</div>
              <div class="hint">-10℃～50℃；保留 1 位小数。</div>
            </div>

            <div class="form-item">
              <label class="form-label">积分时间 (ms)</label>
              <input class="form-input" type="number" step="1" v-model.number="form.prototype.integrationMs" @blur="validateIntegration" />
              <div v-if="integrationError" class="error">{{ integrationError }}</div>
              <div class="hint">仅支持整数输入，范围 1～100ms。</div>
            </div>

            <div class="form-item two-col">
              <label class="form-label">参数联动预览</label>
              <div class="preview">
                <pre>{{ JSON.stringify(form.prototype, null, 2) }}</pre>
              </div>
            </div>

            <div class="form-item two-col">
              <label class="form-label">保存 / 加载配置</label>
              <div class="inline">
                <button class="action-button ghost" @click="savePrototypeConfig">保存为 JSON</button>
                <input class="file" type="file" accept="application/json" @change="loadPrototypeConfig" />
              </div>
            </div>
          </div>
        </div>

        <!-- ========== 3) 其他参数输入 ========== -->
        <div v-show="step===2" class="page">
          <div class="form-grid">
            <div class="form-item">
              <label class="form-label">目标轨迹</label>
              <select class="form-select" v-model="form.other.trajectory">
                <option value="" disabled>请选择目标轨迹</option>
                <option v-for="o in options.trajectory" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="form-item">
              <label class="form-label">样机类型</label>
              <select class="form-select" v-model="form.other.prototypeType">
                <option value="" disabled>请选择样机类型</option>
                <option v-for="o in options.prototypeType" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="form-item">
              <label class="form-label">大气轮廓线</label>
              <select class="form-select" v-model="form.other.atmosphere">
                <option value="" disabled>请选择大气轮廓线</option>
                <option v-for="o in options.atmosphere" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="form-item">
              <label class="form-label">气溶胶模型</label>
              <select class="form-select" v-model="form.other.aerosol">
                <option value="" disabled>请选择气溶胶模型</option>
                <option v-for="o in options.aerosol" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <div class="form-item two-col">
              <label class="form-label">说明</label>
              <div class="info">
                其他参数可在此扩展（例如观测波段、序列长度、噪声模型等）。当前保留原先的 4 项参数。
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="action-button ghost" @click="doClear">清空</button>

        <div class="spacer"></div>

        <button class="action-button ghost" :disabled="step===0" @click="step=Math.max(0,step-1)">上一步</button>
        <button class="action-button ghost" v-if="step<2" @click="step=Math.min(2,step+1)">下一步</button>
        <button class="action-button" v-else @click="$emit('run')">执行</button>

        <button class="action-button" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  form: { type: Object, required: true },
  options: { type: Object, required: true }
})

defineEmits(['close','run','pickLaunch','pickImpact'])

const step = ref(0)

const orbitHeightError = ref('')
const integrationError = ref('')
const opticsTempWarn = ref('')

const targetImageUrl = ref('')
const targetImageName = ref('')
const filterFileName = ref('')

function validateOrbitHeight(){
  orbitHeightError.value = ''
  const v = Number(props.form?.prototype?.orbitHeightKm)
  if (Number.isNaN(v)) return
  if (v < 400 || v > 600) orbitHeightError.value = '请输入 400-600km 内的数值'
}

function validateIntegration(){
  integrationError.value = ''
  const v = Number(props.form?.prototype?.integrationMs)
  if (Number.isNaN(v)) return
  if (!Number.isInteger(v)) integrationError.value = '仅支持整数输入（单位 ms）'
  else if (v < 1 || v > 100) integrationError.value = '请输入 1～100ms 内的整数'
}

function validateOpticsTemp(){
  opticsTempWarn.value = ''
  const v = Number(props.form?.prototype?.opticsTempC)
  if (Number.isNaN(v)) return
  if (v < -10 || v > 50) opticsTempWarn.value = '建议在 -10℃~50℃内使用'
}

function recalcFNumber(){
  const focal = Number(props.form.prototype.optics.focalMm)
  const ap = Number(props.form.prototype.optics.apertureMm)
  if (!Number.isNaN(focal) && !Number.isNaN(ap) && ap !== 0){
    props.form.prototype.optics.fNumber = Number((focal / ap).toFixed(2))
  }
}

function onTargetImage(e){
  const file = e.target.files && e.target.files[0]
  if(!file) return
  targetImageName.value = file.name
  const reader = new FileReader()
  reader.onload = () => { targetImageUrl.value = String(reader.result || '') }
  reader.readAsDataURL(file)
}

function onFilterFile(e){
  const file = e.target.files && e.target.files[0]
  if(!file) return
  filterFileName.value = file.name
  props.form.prototype.filterCustomFileName = file.name
}

function savePrototypeConfig(){
  const data = JSON.stringify(props.form.prototype, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'prototype_config.json'
  a.click()
  URL.revokeObjectURL(url)
}

function loadPrototypeConfig(e){
  const file = e.target.files && e.target.files[0]
  if(!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try{
      const obj = JSON.parse(String(reader.result || '{}'))
      Object.assign(props.form.prototype, obj)
      recalcFNumber()
    }catch(err){
      alert('配置文件解析失败：请确认是有效 JSON')
    }
  }
  reader.readAsText(file)
}

function applyDetectorPreset(){
  const preset = props.form.prototype.detectorPreset
  if(preset === 'preset_a'){
    Object.assign(props.form.prototype.detector, { scale:'512x512', pixelUm:10, qe:0.75, readNoiseDn:5 })
  } else if(preset === 'preset_b'){
    Object.assign(props.form.prototype.detector, { scale:'1024x1024', pixelUm:15, qe:0.8, readNoiseDn:8 })
  }
}

function doClear(){
  props.form.target.type = ''
  props.form.target.launchLon = ''
  props.form.target.launchLat = ''
  props.form.target.impactLon = ''
  props.form.target.impactLat = ''
  targetImageUrl.value = ''
  targetImageName.value = ''

  props.form.prototype.orbitHeightKm = 500
  props.form.prototype.filterBuiltin = 'default_filter.csv'
  props.form.prototype.filterCustomFileName = ''
  filterFileName.value = ''
  Object.assign(props.form.prototype.optics, { focalMm:200, apertureMm:200, fNumber:1.0, efficiency:0.85 })
  props.form.prototype.detectorPreset = 'preset_a'
  Object.assign(props.form.prototype.detector, { scale:'512x512', pixelUm:10, qe:0.75, readNoiseDn:5 })
  props.form.prototype.opticsTempC = 25
  props.form.prototype.integrationMs = 20

  props.form.other.trajectory = ''
  props.form.other.prototypeType = ''
  props.form.other.atmosphere = ''
  props.form.other.aerosol = ''

  orbitHeightError.value = ''
  integrationError.value = ''
  opticsTempWarn.value = ''
}

</script>

<style scoped>
.modal-mask{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal{
  width: 860px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 40px);
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
  display: flex;
  flex-direction: column;
}
.modal-header{
  padding: 12px 16px;
  display:flex;
  align-items:center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}
.modal-title{ font-weight: 600; }
.modal-close{
  border: none;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
}

.steps{
  display:flex;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f1f1;
  background: #fafafa;
}
.step{
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #e6e6e6;
  background: #fff;
  font-size: 13px;
}
.step.active{
  border-color: #409eff;
  color:#409eff;
}

.modal-body{
  padding: 14px 16px;
  overflow: auto;
}
.page{ padding-bottom: 4px; }

.form-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 14px;
}
.form-item{
  display:flex;
  flex-direction: column;
  gap: 6px;
}
.form-item.two-col{
  grid-column: 1 / span 2;
}
.form-label{ font-size: 14px; color:#333; }
.form-input,.form-select{
  height: 34px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0 10px;
  outline: none;
}
.form-input:focus,.form-select:focus{ border-color: #409eff; }
.inline{ display:flex; gap: 8px; align-items:center; flex-wrap: wrap; }
.stack{ display:flex; flex-direction: column; gap: 8px; }
.mini{ font-size: 12px; color:#666; }
.mini-btn{
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}
.file{ height: 34px; }
.file-name{ font-size: 12px; color:#555; }
.hint{ font-size: 12px; color:#888; }
.info{
  font-size: 13px;
  color:#444;
  background: #f7f8fa;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px 12px;
}
.error{ color:#d93025; font-size: 12px; }
.warn{ color:#b26a00; font-size: 12px; }

.image-box{
  border: 1px dashed #ddd;
  border-radius: 8px;
  padding: 8px;
  max-height: 260px;
  overflow: auto;
}
.image-box img{ max-width: 100%; display:block; }

.collapse{
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}
.collapse summary{ cursor: pointer; font-size: 13px; color:#333; }
.collapse-body{ margin-top: 10px; }
.subgrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
}
.subitem{ display:flex; flex-direction: column; gap: 6px; }

.preview{
  border: 1px solid #eee;
  border-radius: 8px;
  background: #0b1020;
  color: #e8eefc;
  padding: 10px 12px;
  overflow: auto;
  max-height: 220px;
}
.preview pre{
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

.modal-footer{
  padding: 12px 16px;
  display:flex;
  gap: 10px;
  align-items:center;
  border-top: 1px solid #eee;
}
.spacer{ flex: 1; }

.action-button{
  height: 34px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid #409eff;
  background: #409eff;
  color:#fff;
  cursor:pointer;
}
.action-button.ghost{
  border-color: #ddd;
  background: #fff;
  color:#333;
}
.action-button:disabled{
  opacity: .55;
  cursor:not-allowed;
}
</style>
