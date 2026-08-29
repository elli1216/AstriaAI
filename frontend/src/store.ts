import { create } from 'zustand'

export type Framework = 'pytest' | 'vitest'

interface DashboardState {
  // The currently selected analysis ID shown in the main panel
  selectedId: string | null
  setSelectedId: (id: string | null) => void

  // Whether a new analysis submission is in flight
  isSubmitting: boolean
  setIsSubmitting: (v: boolean) => void

  // Form fields — kept in the store so they survive sidebar re-renders
  prTitle: string
  diff: string
  openapiSpec: string
  dbSchema: string
  framework: Framework

  setPrTitle: (v: string) => void
  setDiff: (v: string) => void
  setOpenapiSpec: (v: string) => void
  setDbSchema: (v: string) => void
  setFramework: (v: Framework) => void

  // Load the demo scenario values into the form
  loadDemo: () => void
}

const DEMO_DIFF = `--- a/demo_target/models/user.py
+++ b/demo_target/models/user.py
@@ -8,7 +8,7 @@ class UserModel(BaseModel):
     id: int
     email: str
     name: str
-    billing_address: Optional[str] = None
+    billing_address: str
     created_at: datetime`

const DEMO_OPENAPI = `openapi: 3.0.0
paths:
  /users/{id}:
    get:
      summary: Get user by ID
  /billing/charge:
    post:
      summary: Charge billing — billing_address now required
  /notifications/send:
    post:
      summary: Send notification`

const DEMO_SCHEMA = `model User {
  id             Int      @id
  email          String   @unique
  billing_address String?
}`

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

  isSubmitting: false,
  setIsSubmitting: (v) => set({ isSubmitting: v }),

  prTitle: 'feat: make billing_address required on User model',
  diff: DEMO_DIFF,
  openapiSpec: DEMO_OPENAPI,
  dbSchema: DEMO_SCHEMA,
  framework: 'pytest',

  setPrTitle: (v) => set({ prTitle: v }),
  setDiff: (v) => set({ diff: v }),
  setOpenapiSpec: (v) => set({ openapiSpec: v }),
  setDbSchema: (v) => set({ dbSchema: v }),
  setFramework: (v) => set({ framework: v }),

  loadDemo: () =>
    set({
      prTitle: 'feat: make billing_address required on User model',
      diff: DEMO_DIFF,
      openapiSpec: DEMO_OPENAPI,
      dbSchema: DEMO_SCHEMA,
      framework: 'pytest',
    }),
}))
