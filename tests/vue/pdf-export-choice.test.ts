import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ExportSheet from '../../src/vue/sheets/ExportSheet.vue'

describe('PDF notation confirmation', () => {
  it.each(['tab', 'score', 'none'] as const)('waits for confirmation and sends %s', async mode => {
    const w = mount(ExportSheet, { props: { exportKeyNote: 'G', pdfBusy: false, hasNotation: true } })
    await w.get('[data-export="pdf"]').trigger('click')
    expect(w.emitted('pdf')).toBeUndefined()
    await w.get(`input[value="${mode}"]`).setValue(true)
    await w.get('[data-pdf-download]').trigger('click')
    expect(w.emitted('pdf')).toEqual([[mode]])
    await w.setProps({ pdfBusy: true })
    expect(w.get('[data-pdf-download]').attributes('disabled')).toBeDefined()
    w.unmount()
  })
})
