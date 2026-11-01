import type { EditHeadModel } from './dock-model'

type ChartRow = EditHeadModel['charts'][number]

/** The Versão part of the edit head: the file's charts, the open one, and whether the editor manages them. */
export function editHeadCharts(
  charts: ChartRow[],
  chartId: string,
  versions: boolean,
): Pick<EditHeadModel, 'charts' | 'chartId' | 'chartLabel' | 'versions'> {
  return { charts, chartId, chartLabel: charts.find((c) => c.id === chartId)?.label || '', versions }
}
