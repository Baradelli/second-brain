import type { PublicationResponse } from '@cerebro/shared';
import {
  createNote,
  createPublication,
  editPublication,
  listPublications,
} from '@cerebro/shared/client';
import { EmptyState } from '@cerebro/ui';
import { Megaphone, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  formatLabelKey,
  publicationLabel,
  stageLabelKey,
} from '../publications/publication-display.js';
import { ArchivedToggle } from '../shared/ArchivedToggle.js';
import { useTabs } from '../tabs/tabs-context.js';

/**
 * Lista de publicações dentro da seção "Publicações" do explorador. Busca as
 * publicações ativas, mostra título + uma dica de etapa/formato, abre a
 * publicação numa aba ao clicar e oferece "Nova publicação". Espelha
 * `StudySection` reusando os mesmos endpoints do shared (sem duplicar lógica
 * vs mobile).
 *
 * Criar do zero: como toda publicação precisa de uma FONTE (o backend exige
 * `sourceId` não-vazio; vínculo polimórfico, sem FK), uma publicação avulsa
 * nasce auto-originada do seu próprio rascunho — criamos uma Note vazia e a
 * usamos como fonte (`sourceType: 'note'`) e já como rascunho vinculado. Assim
 * o "Editar rascunho" reabre essa mesma nota (modelo do mobile).
 */
export function PublicationsSection() {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const [publications, setPublications] = useState<PublicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listPublications({ status: 'ACTIVE' })
      .then((data) => {
        if (!cancelled) setPublications(data);
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

  function open(publication: Pick<PublicationResponse, 'id' | 'title'>) {
    openTab({
      kind: 'publication',
      id: publication.id,
      title: publicationLabel(publication, t('publish.create.title')),
    });
  }

  async function handleNew() {
    if (creating) return;
    setCreating(true);
    try {
      const title = t('publish.create.title');
      // Rascunho/fonte da publicação avulsa: uma Note vazia.
      const note = await createNote({
        type: 'NOTE',
        doc: { type: 'doc', content: [] },
        title,
      });
      let publication = await createPublication({
        sourceType: 'note',
        sourceId: note.id,
        format: 'linkedin',
        title,
      });
      // Vincula a nota como o rascunho da publicação (modelo do mobile).
      publication = await editPublication(publication.id, { noteId: note.id });
      setPublications((prev) => [publication, ...prev]);
      open(publication);
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
        onClick={() => void handleNew()}
        disabled={creating}
        className="mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-accent transition-colors hover:bg-card disabled:opacity-50"
      >
        <Plus size={15} strokeWidth={2} />
        <span className="truncate">{t('publish.new')}</span>
      </button>

      {loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
      )}

      {error && !loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('publish.error')}</p>
      )}

      {!loading && !error && publications.length === 0 && (
        <EmptyState title={t('publish.empty')} className="py-6" />
      )}

      {!loading && !error && publications.length > 0 && (
        <ul className="flex flex-col">
          {publications.map((publication) => (
            <li key={publication.id}>
              <button
                type="button"
                onClick={() => open(publication)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card"
              >
                <Megaphone
                  size={15}
                  strokeWidth={1.75}
                  className="shrink-0 text-muted"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {publicationLabel(publication, t('publish.create.title'))}
                  </span>
                  <span className="block truncate text-[0.625rem] uppercase tracking-[0.12em] text-faint">
                    {t(stageLabelKey(publication.stage))} ·{' '}
                    {t(formatLabelKey(publication.format))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ArchivedToggle
        labels={{
          show: t('publications.archived.show'),
          hide: t('publications.archived.hide'),
          empty: t('publications.archived.empty'),
        }}
        load={async () =>
          (await listPublications({ status: 'ARCHIVED' })).map((p) => ({
            id: p.id,
            title: publicationLabel(p, t('publish.create.title')),
          }))
        }
        onOpen={(id) =>
          openTab({ kind: 'publication', id, title: t('publish.create.title') })
        }
      />
    </div>
  );
}
