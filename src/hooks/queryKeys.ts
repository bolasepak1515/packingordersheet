export const queryKeys = {
  jobOrders: {
    all: ['jobOrders'] as const,
  },
  plantCodes: {
    all: ['plantCodes'] as const,
  },
  sizes: {
    all: ['sizes'] as const,
  },
  packingTrans: {
    all: ['packingTrans'] as const,
    byJob: (jobNum: string, part: string) => ['packingTrans', 'byJob', { jobNum, part }] as const,
  },
  packingMaterials: {
    byPlants: (plants: string[]) => ['packingMaterials', { plants }] as const,
  },
  loginUsers: {
    all: ['loginUsers'] as const,
  },
  templates: {
    tag: ['tagTemplate'] as const,
    packingSheet: ['packingSheetTemplate'] as const,
  },
} as const
