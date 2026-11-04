import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Combobox,
  ComboboxCollection,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { InputGroupAddon } from '@/components/ui/input-group'
import { normalize } from '@/features/products/catalog'
import { useCatalog } from '@/features/products/hooks/use-catalog'
import { ProductImage } from '@/features/products/components/product-image'
import { useCategories } from '@/features/products/hooks/use-categories'
import { salePriceCents } from '@ays/validators'
import { productSearchSchema } from '@/features/products/schemas'
import { normalizeSearch } from '@/features/products/search-state'
import {
  getSuggestions,
  MIN_SUGGESTION_CHARS,
  type Suggestions,
} from '@/features/products/suggestions'
import { FocusPanel } from '@/features/search/components/focus-panel'
import { useSearchStore } from '@/features/search/store'
import { formatMoney, type Language } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

type Option =
  | { key: string; kind: 'product'; product: Suggestions['products'][number] }
  | { key: string; kind: 'category'; category: Suggestions['categories'][number] }
  | { key: string; kind: 'search'; text: string }

interface OptionGroup {
  value: 'products' | 'categories' | 'search'
  items: Option[]
}

/** The matched part of a suggestion in bold. Skipped when lowercasing changes the length (e.g. "İ"). */
function Highlight({ text, query, language }: { text: string; query: string; language: Language }) {
  const needle = normalize(query.trim(), language)
  const haystack = normalize(text, language)
  const at = haystack.length === text.length && needle ? haystack.indexOf(needle) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-semibold">{text.slice(at, at + needle.length)}</strong>
      {text.slice(at + needle.length)}
    </>
  )
}

/**
 * The shop search in the header: a suggestions dropdown (products, categories, "search for …") built
 * on base-ui's Combobox. On `/products` the list is also filtered live as you type; on any other page
 * nothing navigates until you press Enter or pick a suggestion.
 */
export function HeaderSearch({ className }: { className?: string }) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const navigate = useNavigate()
  const onProducts = useRouterState({ select: (s) => s.location.pathname === '/products' })
  const rawSearch = useRouterState({ select: (s) => s.location.search })
  const current = onProducts ? productSearchSchema.parse(rawSearch) : {}
  const urlQuery = current.q ?? ''
  // the callbacks below must stay stable, so they read the latest search from a ref
  const latest = useRef(current)
  useEffect(() => {
    latest.current = current
  })

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [draft, setDraft] = useState(urlQuery)
  // open for the page it was opened on, so any route change closes it
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = useCallback((value: boolean) => setOpenOn(value ? pathname : null), [pathname])
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const highlighted = useRef<Option | undefined>(undefined)

  const search = useCallback(
    (value: string, replace: boolean) => {
      void navigate({
        to: '/products',
        search: normalizeSearch({
          ...latest.current,
          q: value.trim() || undefined,
          page: undefined,
        }),
        replace,
      })
    },
    [navigate],
  )

  const committed = useRef(urlQuery)

  /** A committed search (Enter, the "Search for" row, a chip): remembered unless it came from a suggestion. */
  const run = (value: string, remember: boolean) => {
    if (remember) useSearchStore.getState().record(value)
    search(value, onProducts)
    finish()
  }

  // draft → URL (live filtering on /products only); URL → draft when it changed from elsewhere
  const debouncedDraft = useDebouncedValue(draft, 300)
  useEffect(() => {
    if (onProducts && debouncedDraft !== committed.current) {
      committed.current = debouncedDraft
      search(debouncedDraft, true)
    }
  }, [debouncedDraft, onProducts, search])
  useEffect(() => {
    if (urlQuery !== committed.current) {
      committed.current = urlQuery
      setDraft(urlQuery)
    }
  }, [urlQuery])

  const { products } = useCatalog()
  const { categories } = useCategories()
  const suggestionQuery = useDebouncedValue(draft, 150)
  const suggestions = useMemo(
    () => getSuggestions(products ?? [], categories ?? [], suggestionQuery, language),
    [products, categories, suggestionQuery, language],
  )

  const text = suggestionQuery.trim()
  const enough = text.length >= MIN_SUGGESTION_CHARS
  const groups = useMemo<OptionGroup[]>(() => {
    if (!enough) return []
    const result: OptionGroup[] = []
    if (suggestions.products.length > 0)
      result.push({
        value: 'products',
        items: suggestions.products.map((product) => ({
          key: `p${product.id}`,
          kind: 'product',
          product,
        })),
      })
    if (suggestions.categories.length > 0)
      result.push({
        value: 'categories',
        items: suggestions.categories.map((category) => ({
          key: `c${category.slug}`,
          kind: 'category',
          category,
        })),
      })
    result.push({ value: 'search', items: [{ key: 'search', kind: 'search', text }] })
    return result
  }, [enough, suggestions, text])

  // inline lists have no popup of their own, so a press outside the box closes the list here
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [setOpen])

  const finish = () => {
    setOpen(false)
    inputRef.current?.blur()
  }

  const choose = (option: Option) => {
    if (option.kind === 'search') {
      run(option.text, true)
      return
    }
    setDraft('')
    committed.current = ''
    if (option.kind === 'product') {
      void navigate({
        to: '/products/$productId',
        params: { productId: String(option.product.id) },
      })
    } else {
      void navigate({ to: '/products', search: { category: option.category.slug } })
    }
    finish()
  }

  const noMatches = enough && suggestions.products.length === 0
  const showPanel = open && !draft.trim()
  const showList = open && enough
  const layerOpen = showPanel || showList

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative min-w-0 flex-1 sm:max-w-xs',
        // phones: the open search is a full-screen layer with the box on top
        layerOpen &&
          'max-md:fixed max-md:inset-0 max-md:z-50 max-md:overflow-y-auto max-md:bg-background max-md:p-3 max-md:sm:max-w-none',
        className,
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <Combobox<Option>
        items={groups}
        filter={null}
        value={null}
        inputValue={draft}
        inline
        open={showList}
        onOpenChange={(next) => {
          // opening is ours (focus, click, typing, ArrowDown); the combobox may only close it
          if (!next) setOpen(false)
        }}
        onInputValueChange={(value, details) => {
          // picking an item or pressing Escape would replace the box content; the typed text stays instead
          if (
            details.reason === 'item-press' ||
            details.reason === 'input-clear' ||
            details.reason === 'escape-key'
          )
            return
          setDraft(value)
          setOpen(true)
        }}
        onValueChange={(option) => {
          if (option) choose(option)
        }}
        onItemHighlighted={(option) => {
          highlighted.current = option
        }}
        itemToStringValue={(option) => option.key}
        isItemEqualToValue={(a, b) => a.key === b.key}
      >
        <div className="flex items-center gap-2">
          <ComboboxInput
            ref={inputRef}
            aria-label={t('products.search.label')}
            placeholder={t('products.search.headerPlaceholder')}
            showTrigger={false}
            showClear={draft.length > 0}
            className="w-full flex-1"
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDownCapture={(event) => {
              // base-ui handles Escape on an unmounted popup itself, so this has to run first
              if (event.key === 'Escape') setOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                setOpen(true)
                if (!draft.trim()) {
                  event.preventDefault()
                  panelRef.current?.querySelector<HTMLElement>('a, button')?.focus()
                }
              }
              if (event.key === 'Enter' && !highlighted.current && draft.trim()) {
                event.preventDefault()
                run(draft, true)
              }
            }}
          >
            <InputGroupAddon align="inline-start">
              <Search aria-hidden="true" />
            </InputGroupAddon>
          </ComboboxInput>
          {layerOpen ? (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t('search.close')}
              onClick={finish}
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite">
          {showList
            ? t('search.count', { n: suggestions.products.length + suggestions.categories.length })
            : ''}
        </p>
        {showPanel ? (
          <div
            ref={panelRef}
            className="absolute top-full right-0 left-0 z-50 mt-1.5 min-w-72 overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-md:static max-md:mt-3 max-md:shadow-none max-md:ring-0 md:max-h-[min(70vh,520px)]"
          >
            <FocusPanel onSearch={run} onNavigate={finish} />
          </div>
        ) : null}
        {/* always mounted (hidden when closed) so the input's aria-controls has a target */}
        <div
          hidden={!showList}
          className="absolute top-full right-0 left-0 z-50 mt-1.5 min-w-72 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-md:static max-md:mt-3 max-md:shadow-none max-md:ring-0"
        >
          <ComboboxList>
            {(group: OptionGroup) => (
              <ComboboxGroup key={group.value} items={group.items}>
                {group.value === 'search' ? (
                  noMatches ? (
                    <ComboboxLabel>{t('search.noProducts', { text })}</ComboboxLabel>
                  ) : null
                ) : (
                  <ComboboxLabel>{t(`search.${group.value}`)}</ComboboxLabel>
                )}
                <ComboboxCollection>
                  {(option: Option) => (
                    <ComboboxItem key={option.key} value={option} className="py-1.5 pr-2">
                      {option.kind === 'product' ? (
                        <>
                          <ProductImage
                            src={option.product.thumbnail}
                            alt=""
                            className="size-9 shrink-0 rounded-md"
                          />
                          <span className="min-w-0">
                            <span className="block truncate">
                              <Highlight
                                text={option.product.title}
                                query={text}
                                language={language}
                              />
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {option.product.brand ? `${option.product.brand} · ` : ''}
                              {formatMoney(salePriceCents(option.product), language)}
                            </span>
                          </span>
                        </>
                      ) : option.kind === 'category' ? (
                        <>
                          <span className="min-w-0 truncate">{option.category.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {option.category.count}
                          </span>
                        </>
                      ) : (
                        <>
                          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 truncate">
                            {t('search.searchFor', { text: option.text })}
                          </span>
                        </>
                      )}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </div>
      </Combobox>
    </div>
  )
}
