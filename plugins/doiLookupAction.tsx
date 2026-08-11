import { SearchIcon } from '@sanity/icons/Search'
import { useToast } from '@sanity/ui'
import { fetchCrossrefWork } from 'lib/crossref'
import { isValidDoi, normalizeDoiInput } from 'lib/doi'
import { useCallback, useState } from 'react'
import {
  type DocumentActionComponent,
  type DocumentActionProps,
  type DocumentActionsResolver,
  useDocumentOperation,
} from 'sanity'

interface PublicationPatch {
  title: string
  author: string
  journal: string
  volume: number | null
  issue: number | null
  pages: string | null
  date: string
  abstract: string | null
}

const DoiLookupAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const { id, type, draft, published, onComplete } = props
  const { patch } = useDocumentOperation(id, type)
  const toast = useToast()

  const [loading, setLoading] = useState(false)
  const [pendingPatch, setPendingPatch] = useState<PublicationPatch | null>(null)

  const doc = draft ?? published
  const doiValue = typeof doc?.doi === 'string' ? doc.doi : undefined
  const normalizedDoi = doiValue ? normalizeDoiInput(doiValue) : undefined
  const isLookupable = Boolean(normalizedDoi && isValidDoi(normalizedDoi))

  const runLookup = useCallback(async () => {
    if (!normalizedDoi) return
    setLoading(true)
    try {
      const work = await fetchCrossrefWork(normalizedDoi)
      setPendingPatch(work)
    } catch (err) {
      toast.push({
        status: 'error',
        title: 'Crossref lookup failed',
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoading(false)
    }
  }, [normalizedDoi, toast])

  const applyPatch = useCallback(() => {
    if (!pendingPatch) return

    // `patch.disabled` is `false | ErrorStrings | 'NOT_READY'` (see
    // OperationsAPI['patch'] in the sanity package) -- the document-operations
    // store can be unready or refuse the patch for a documented reason. Don't
    // call execute() blindly; surface that reason and bail out instead.
    if (patch.disabled) {
      toast.push({
        status: 'error',
        title: "Can't apply changes",
        description: `The document isn't ready to edit right now (${patch.disabled}). Try again in a moment.`,
      })
      setPendingPatch(null)
      return
    }

    // Sanity patches don't take `null` for "no value" -- unset those fields
    // instead of setting them to null (e.g. Crossref returning no abstract).
    const setFields: Record<string, string | number> = {}
    const unsetFields: string[] = []
    for (const [key, value] of Object.entries(pendingPatch)) {
      if (value === null) {
        unsetFields.push(key)
      } else {
        setFields[key] = value
      }
    }

    const patches = []
    if (Object.keys(setFields).length > 0) patches.push({ set: setFields })
    if (unsetFields.length > 0) patches.push({ unset: unsetFields })
    patch.execute(patches)

    setPendingPatch(null)
    toast.push({ status: 'success', title: 'Publication fields updated from Crossref' })
    onComplete()
  }, [pendingPatch, patch, onComplete, toast])

  const cancelPatch = useCallback(() => {
    setPendingPatch(null)
  }, [])

  return {
    label: loading ? 'Fetching from Crossref…' : 'Fetch from DOI',
    icon: SearchIcon,
    disabled: !isLookupable || loading,
    title: isLookupable ? undefined : 'Set a valid DOI above first, e.g. 10.1038/s41420-025-02362-7',
    onHandle: runLookup,
    dialog: pendingPatch && {
      type: 'confirm',
      message: `Overwrite Title, Author, Journal, Volume, Issue, Pages, Date, and Abstract with Crossref data for ${normalizedDoi}?\n\nTitle: ${pendingPatch.title}\nAuthor: ${pendingPatch.author}`,
      onConfirm: applyPatch,
      onCancel: cancelPatch,
    },
  }
}

export const doiLookupPlugin = () => ({
  name: 'doiLookupPlugin',
  document: {
    actions: ((prev, { schemaType }) => {
      if (schemaType !== 'publication') return prev
      return [...prev, DoiLookupAction]
    }) satisfies DocumentActionsResolver,
  },
})
