/**
 * Dev-only flow timing utility (Web Performance API).
 *
 * Measures multi-step "flows" that may span components, the Redux layer, the
 * React Query mutation layer, and client-side route transitions. Each flow is
 * keyed by name; marks are recorded with `performance.mark`, spans emitted with
 * `performance.measure` (visible in the DevTools Performance panel), and a
 * collapsed table (step / duration / cumulative) is logged on `endFlow`.
 *
 * No-op in production. Gate manually in any environment with localStorage:
 *   localStorage.setItem('bfit-perf', '1')  // force-enable
 *   localStorage.setItem('bfit-perf', '0')  // force-disable
 *
 * Usage:
 *   startFlow('session-start')
 *   mark('session-start', 'startSession dispatched')
 *   ...
 *   endFlow('session-start')
 *
 * All calls are safe no-ops when a flow does not exist, so partial flows (e.g.
 * a hard refresh mid-flow) never throw.
 */

export type FlowName = 'session-start' | 'session-complete' | 'plan-progress' | 'offline-sync'

type FlowStep = { step: string; at: number }

type Flow = {
  name: string
  runId: number
  t0: number
  steps: FlowStep[]
}

const flows = new Map<string, Flow>()
let runCounter = 0

function isEnabled(): boolean {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return false
  try {
    const flag = window.localStorage.getItem('bfit-perf')
    if (flag === '1') return true
    if (flag === '0') return false
  } catch {
    // localStorage may be unavailable (SSR/private mode) — fall through
  }
  return process.env.NODE_ENV !== 'production'
}

function markName(flow: Flow, step: string): string {
  return `bfit:${flow.name}#${flow.runId}:${step}`
}

/**
 * Begin (or restart) a named flow. Returns the flow name for convenience so
 * callers can `const f = startFlow('x')` and pass it around if desired.
 */
export function startFlow(name: FlowName | string): string {
  if (!isEnabled()) return name
  const flow: Flow = {
    name,
    runId: ++runCounter,
    t0: performance.now(),
    steps: [],
  }
  flows.set(name, flow)
  flow.steps.push({ step: 'start', at: flow.t0 })
  try {
    performance.mark(markName(flow, 'start'))
  } catch {
    // ignore mark failures
  }
  return name
}

/** Record a step against an in-flight flow. Silent no-op if the flow is absent. */
export function mark(name: FlowName | string, step: string): void {
  if (!isEnabled()) return
  const flow = flows.get(name)
  if (!flow) return
  const at = performance.now()
  flow.steps.push({ step, at })
  try {
    const thisMark = markName(flow, step)
    performance.mark(thisMark)
    const prev = flow.steps[flow.steps.length - 2]
    if (prev) {
      performance.measure(`${flow.name} ▸ ${step}`, {
        start: markName(flow, prev.step),
        end: thisMark,
      })
    }
  } catch {
    // ignore mark/measure failures (e.g. duplicate mark names)
  }
}

/**
 * Finish a flow: optionally record a final step, emit a total `measure`, log a
 * collapsed table, and drop the flow. Silent no-op if the flow is absent.
 */
export function endFlow(name: FlowName | string, finalStep?: string): void {
  if (!isEnabled()) return
  const flow = flows.get(name)
  if (!flow) return
  if (finalStep) mark(name, finalStep)

  const end = performance.now()
  const total = end - flow.t0
  const lastStep = flow.steps[flow.steps.length - 1]

  try {
    if (lastStep) {
      performance.measure(`${flow.name} ▸ TOTAL`, {
        start: markName(flow, 'start'),
        end: markName(flow, lastStep.step),
      })
    }
  } catch {
    // ignore
  }

  const rows = flow.steps.map((s, i) => {
    const prev = i > 0 ? (flow.steps[i - 1] ?? s) : s
    return {
      step: s.step,
      'duration (ms)': round(s.at - prev.at),
      'cumulative (ms)': round(s.at - flow.t0),
    }
  })

  /* eslint-disable no-console */
  console.groupCollapsed(`⏱ ${flow.name} — total ${round(total)}ms`)
  console.table(rows)
  console.groupEnd()
  /* eslint-enable no-console */

  flows.delete(name)
}

/** Whether a flow with this name is currently in flight. */
export function hasFlow(name: FlowName | string): boolean {
  return flows.has(name)
}

/**
 * Measure a single awaited async operation as a standalone span and return its
 * result. Records a `<name> ▸ <label>` measure and, if `flow` is provided, also
 * marks start/end against that flow.
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
  flow?: FlowName | string
): Promise<T> {
  if (!isEnabled()) return fn()
  if (flow) mark(flow, `${label} started`)
  const start = performance.now()
  try {
    return await fn()
  } finally {
    const dur = performance.now() - start
    if (flow) mark(flow, `${label} completed`)
    // console.info (not debug) so it shows at the default console log level.
    /* eslint-disable no-console */
    console.info(`⏱ ${label}: ${round(dur)}ms`)
    /* eslint-enable no-console */
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
