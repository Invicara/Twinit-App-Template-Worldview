import { marked } from 'marked'

import architectureMd from '../../../docs/base-template/developer guide/world-view-architecture.md?raw'

marked.use({ gfm: true })

export const ARCHITECTURE_HTML = marked.parse(architectureMd, { async: false })
