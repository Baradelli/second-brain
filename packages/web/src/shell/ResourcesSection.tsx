import type { ResourceResponse } from '@cerebro/shared';
import { createResource, listResources } from '@cerebro/shared/client';
import { EmptyState } from '@cerebro/ui';
import {
  BookOpen,
  FileText,
  GraduationCap,
  type LucideIcon,
  Mic,
  Plus,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resourceLabel } from '../resources/resource-display.js';
import { useTabs } from '../tabs/tabs-context.js';

/** Ícone por tipo de recurso — mesmo mapa do mobile (LibraryPage). */
const TYPE_ICON: Record<ResourceResponse['type'], LucideIcon> = {
  book: BookOpen,
  course: GraduationCap,
  video: Video,
  article: FileText,
  podcast: Mic,
  other: BookOpen,
};

/**
 * Lista de recursos dentro da seção "Recursos" do explorador. Busca os recursos
 * ativos, mostra título + dica de tipo/stage, abre o recurso numa aba ao clicar
 * e oferece "Novo recurso" (cria um recurso com o default do mobile — tipo
 * `book` — e abre a aba). Espelha `NotesSection`.
 */
export function ResourcesSection() {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const [resources, setResources] = useState<ResourceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listResources({ status: 'ACTIVE' })
      .then((data) => {
        if (!cancelled) setResources(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleNewResource() {
    if (creating) return;
    setCreating(true);
    try {
      // Default do mobile (ResourceForm): tipo `book`, título placeholder.
      const resource = await createResource({
        title: t('library.create.title'),
        type: 'book',
      });
      setResources((prev) => [resource, ...prev]);
      openTab({
        kind: 'resource',
        id: resource.id,
        title: resourceLabel(resource, t('library.untitled')),
      });
    } catch {
      setError(true);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => void handleNewResource()}
        disabled={creating}
        className="mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-accent transition-colors hover:bg-card disabled:opacity-50"
      >
        <Plus size={15} strokeWidth={2} />
        <span className="truncate">{t('library.new')}</span>
      </button>

      {loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
      )}

      {error && !loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('library.error')}</p>
      )}

      {!loading && !error && resources.length === 0 && (
        <EmptyState title={t('library.empty')} className="py-6" />
      )}

      {!loading && !error && resources.length > 0 && (
        <ul className="flex flex-col">
          {resources.map((resource) => {
            const Icon = TYPE_ICON[resource.type] ?? BookOpen;
            return (
              <li key={resource.id}>
                <button
                  type="button"
                  onClick={() =>
                    openTab({
                      kind: 'resource',
                      id: resource.id,
                      title: resourceLabel(resource, t('library.untitled')),
                    })
                  }
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card"
                >
                  <Icon
                    size={15}
                    strokeWidth={1.75}
                    className="shrink-0 text-muted"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-fg">
                      {resourceLabel(resource, t('library.untitled'))}
                    </span>
                    <span className="block truncate text-[0.625rem] uppercase tracking-[0.12em] text-faint">
                      {t(`resource.type.${resource.type}`)} ·{' '}
                      {t(`resource.stage.${resource.stage}`)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
