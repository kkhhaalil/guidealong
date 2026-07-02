export const strings = {
  appTitle: '沿途向导',
  appSubtitle: '离线国家公园语音导览',
  tourShelfHeading: '选择行程',
  tourShelfEmpty: '暂无可用行程',
  tourDetailHeading: '行程详情',
  tourDetailOpen: '开始导览',
  tourDetailDownload: '下载离线包',
  mapScreenHeading: '导览地图',
  mapScreenPlaceholder: '地图界面（WP3）',
  demoButton: '开始探索',
  loading: '加载中…',
  back: '返回',
} as const;

export type LocaleStrings = typeof strings;
export type LocaleKey = keyof LocaleStrings;
