export const queryKeys = {
  jobOrders: {
    all: ['jobOrders'] as const,
    list: (search: string, top: number | null) => ['jobOrders', { search, top }] as const,
  },
  plantCodes: {
    all: ['plantCodes'] as const,
    lookup: ['plantCodes', 'lookup'] as const,
  },
  sizes: {
    all: ['sizes'] as const,
    lookup: ['sizes', 'lookup'] as const,
  },
  packingTrans: {
    all: ['packingTrans'] as const,
    byJob: (jobNum: string, part: string) => ['packingTrans', 'byJob', { jobNum, part }] as const,
  },
  loginUsers: {
    all: ['loginUsers'] as const,
  },
  templates: {
    tag: ['tagTemplate'] as const,
    packingSheet: ['packingSheetTemplate'] as const,
  },
} as const
