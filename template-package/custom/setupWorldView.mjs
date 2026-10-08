const WORKFLOW_NAME = 'FetchSpaceCatalog'
const WORKFLOW_USER_TYPE = 'world_view_space'
const SCRIPT_USER_TYPE = 'workflow-script'
const SCRIPT_NAME = 'fetchSpaceCatalog'
const RUN_INTERVAL = '0 5 0/2 * * ? *'

function asList(result) {
  if (Array.isArray(result)) return result
  return result?._list ?? []
}

function log(callback, message) {
  if (typeof callback === 'function') callback(message)
}

function namespaceOf(project) {
  return project?._namespaces?.[0] ?? null
}

function workflowDef(namespace) {
  return {
    _name: WORKFLOW_NAME,
    _description: 'Fetch CelesTrak stations GP data into the Space Catalog every 2 hours at :05 UTC',
    _userType: WORKFLOW_USER_TYPE,
    _namespaces: [namespace],
    _timeoutSeconds: 120,
    _taskDefs: [
      {
        _name: 'fetch_space_catalog',
        _type: 'SCRIPT_EXECUTION',
        _sequenceno: 1,
        _inputParams: {
          _userType: SCRIPT_USER_TYPE,
          _scriptName: SCRIPT_NAME
        }
      }
    ]
  }
}

export async function setup(input, libraries, ctx, callback) {
  const { PlatformApi } = libraries
  const { IafWorkflowSvc } = PlatformApi
  const project = input?.project
  const namespace = namespaceOf(project)

  if (!namespace) {
    throw new Error('Project namespace is required to deploy the space catalog workflow')
  }

  if (!IafWorkflowSvc?.createWorkflowDef) {
    throw new Error('IafWorkflowSvc is unavailable in this deploy environment')
  }

  log(callback, 'INFO: Deploying FetchSpaceCatalog workflow')

  const existing = asList(await IafWorkflowSvc.getWorkflowDefs(
    { _name: WORKFLOW_NAME },
    ctx,
    { _count: 20, _offset: 0 }
  ))
  const defBody = workflowDef(namespace)
  let def = existing[0] ?? null

  if (def?._id) {
    def = await IafWorkflowSvc.updateWorkflowDef(def._id, {
      ...defBody,
      _id: def._id
    }, ctx)
    log(callback, `INFO: Updated workflow ${WORKFLOW_NAME}`)
  } else {
    def = await IafWorkflowSvc.createWorkflowDef(defBody, ctx)
    log(callback, `INFO: Created workflow ${WORKFLOW_NAME}`)
  }

  let schedules = []
  try {
    schedules = asList(await IafWorkflowSvc.getWorkflowSchedules(
      def._id,
      ctx,
      { _pageSize: 20, _offset: 0 }
    ))
  } catch (err) {
    const status = err?.errorResult?.status ?? err?.status
    const message = String(err?.message || err?.errorResult?.error || '')
    if (status !== 404 && !/no schedule found/i.test(message)) {
      throw err
    }
  }
  if (schedules.length === 0) {
    await IafWorkflowSvc.createWorkflowSchedule(def._id, {
      _namespaces: [namespace],
      _schedule: {
        _type: 'TIME_BASED',
        _runInterval: RUN_INTERVAL,
        _timeZone: 'UTC'
      }
    }, ctx)
    log(callback, 'INFO: Created schedule 0 5 0/2 * * ? * (UTC)')
  } else {
    log(callback, 'INFO: Space catalog schedule already exists')
  }

  try {
    await IafWorkflowSvc.runWorkflow(def._id, { _workflowDefId: def._id }, ctx)
    log(callback, 'INFO: Seeded Space Catalog from CelesTrak')
  } catch (err) {
    log(callback, `WARN: Initial CelesTrak fetch failed: ${err?.message || err}`)
  }
}
