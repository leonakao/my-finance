import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { DecoratedTransaction, GroupOption, TransactionFilters, TransactionType } from '../types'
import { dateLabel, toCurrency } from '../lib/formatters'
import { ConfirmDialog } from './ui/ConfirmDialog'

type TransactionFiltersProps = {
  filters: TransactionFilters
  onFiltersChange: (field: keyof TransactionFilters, value: string | boolean) => void
  typeOptions: TransactionType[]
  categoryOptions: string[]
  groupOptions: GroupOption[]
}

type TypeBadgeProps = {
  type: TransactionType
}

type TransactionRowProps = {
  transaction: DecoratedTransaction
  savingId: string
  onEdit: (transactionId: string) => void
  onIgnore: (transactionId: string, ignored: boolean) => void
  onDelete: (transactionId: string) => void
}

type TransactionTableProps = {
  transactions: DecoratedTransaction[]
  savingId: string
  onEdit: (transactionId: string) => void
  onIgnore: (transactionId: string, ignored: boolean) => void
  onDelete: (transactionId: string) => void
  filters: TransactionFilters
  onFiltersChange: (field: keyof TransactionFilters, value: string | boolean) => void
  typeOptions: TransactionType[]
  categoryOptions: string[]
  groupOptions: GroupOption[]
}

function TransactionFilters({ filters, onFiltersChange, typeOptions, categoryOptions, groupOptions }: TransactionFiltersProps) {
  return (
    <div className="filters-bar">
      <label>
        Buscar
        <input
          type="search"
          name="search"
          value={filters.search}
          onChange={(event) => onFiltersChange('search', event.target.value)}
          placeholder="Descrição ou instituição…"
        />
      </label>
      <label>
        Tipo
        <select value={filters.type} onChange={(event) => onFiltersChange('type', event.target.value)}>
          <option value="all">Todos</option>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        Categoria
        <select value={filters.category} onChange={(event) => onFiltersChange('category', event.target.value)}>
          <option value="all">Todas</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        Grupo
        <select value={filters.group} onChange={(event) => onFiltersChange('group', event.target.value)}>
          <option value="all">Todos</option>
          {groupOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={filters.showIgnored}
          onChange={(event) => onFiltersChange('showIgnored', event.target.checked)}
        />
        <span>Exibir ignoradas</span>
      </label>
    </div>
  )
}

function TypeBadge({ type }: TypeBadgeProps) {
  const className =
    type === 'Receita' ? 'type-badge income' : type === 'Transferência' ? 'type-badge transfer' : 'type-badge expense'

  return <span className={className}>{type}</span>
}

function TransactionRow({ transaction, savingId, onEdit, onIgnore, onDelete }: TransactionRowProps) {
  const isSaving = savingId === transaction.id
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  return (
    <>
      <tr aria-disabled={isSaving}>
        <td>{dateLabel(transaction.date)}</td>
        <td>
          <div className="description-cell">
            <strong>{transaction.description}</strong>
            <span>{transaction.institution ?? 'Sem instituição'}</span>
            {transaction.isIgnored ? <span className="row-hint">Ignorada</span> : null}
          </div>
        </td>
        <td>
          <TypeBadge type={transaction.type} />
        </td>
        <td>{toCurrency(transaction.amount)}</td>
        <td>{transaction.category}</td>
        <td>
          <div className="group-cell">
            {transaction.needsReclassification ? (
              <div className="row-hint">Precisa de classificação</div>
            ) : (
              <span>{transaction.budgetGroupName ?? 'Sem grupo'}</span>
            )}
          </div>
        </td>
        <td>
          <div className="row-actions">
            <button type="button" className="ghost" onClick={() => onEdit(transaction.id)} disabled={isSaving}>
              <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
              {isSaving ? 'Salvando…' : 'Editar'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => onIgnore(transaction.id, !transaction.isIgnored)}
              disabled={isSaving}
            >
              {transaction.isIgnored ? 'Restaurar' : 'Ignorar'}
            </button>
            <button type="button" className="ghost danger" onClick={() => setConfirmDeleteOpen(true)} disabled={isSaving}>
              <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
              Excluir
            </button>
          </div>
        </td>
      </tr>
      <ConfirmDialog
        open={confirmDeleteOpen}
        busy={isSaving}
        title="Excluir transação?"
        description={transaction.originTransactionId === null && transaction.sourceKind === 'manual'
          ? 'A transação será removida permanentemente.'
          : 'A transação será removida permanentemente. Se esta for a principal de uma série, as derivadas vinculadas também serão removidas.'}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          onDelete(transaction.id)
        }}
      />
    </>
  )
}

export function TransactionTable({
  transactions,
  savingId,
  onEdit,
  onIgnore,
  onDelete,
  filters,
  onFiltersChange,
  typeOptions,
  categoryOptions,
  groupOptions,
}: TransactionTableProps) {
  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">Revisão</div>
          <h3>Lançamentos do mês</h3>
        </div>
      </div>
      <TransactionFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        typeOptions={typeOptions}
        categoryOptions={categoryOptions}
        groupOptions={groupOptions}
      />
      <div className="table-wrap">
        <table className="transactions-table">
          <colgroup>
            <col className="col-date" />
            <col className="col-description" />
            <col className="col-type" />
            <col className="col-amount" />
            <col className="col-category" />
            <col className="col-group" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Categoria</th>
              <th>Grupo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                savingId={savingId}
                onEdit={onEdit}
                onIgnore={onIgnore}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!transactions.length ? <p className="muted">Nenhuma transação encontrada para esse filtro.</p> : null}
    </section>
  )
}
