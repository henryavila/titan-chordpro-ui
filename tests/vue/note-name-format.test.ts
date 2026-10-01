import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { memoryStore } from '../../src/core'
import { TitanChordpro } from '../../src/vue'
import ChartBody from '../../src/vue/chart/ChartBody.vue'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

describe('consumer note name format', () => {
  it('defaults to letter notation and forwards live consumer changes to the chart', async () => {
    const viewer = mount(TitanChordpro, {
      props: { source: loadFixture(JESUS_1), storage: memoryStore(), surfaceGuard: false },
    })
    expect(viewer.getComponent(ChartBody).props('noteNameFormat')).toBe('letter')
    await viewer.setProps({ noteNameFormat: 'solfege' })
    expect(viewer.getComponent(ChartBody).props('noteNameFormat')).toBe('solfege')
    viewer.unmount()
  })
})
