import type { DecoratedTransaction, GroupOption, TransactionFilters, TransactionType } from '../types'
import { toCurrency } from '../lib/formatters'

type TransactionFiltersProps = {
  filters: TransactionFilters
  onFiltersChange: (field: keyof TransactionFilters, value: string) => void
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
}

type TransactionTableProps = {
  transactions: DecoratedTransaction[]
  savingId: string
  onEdit: (transactionId: string) => void
  filters: TransactionFilters
  onFiltersChange: (field: keyof TransactionFilters, value: string) => void
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
          value={filters.search}
          onChange={(event) => onFiltersChange('search', event.target.value)}
          placeholder="Descrição ou instituição"
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
    </div>
  )
}

function TypeBadge({ type }: TypeBadgeProps) {
  const className =
    type === 'Receita' ? 'type-badge income' : type === 'Transferência' ? 'type-badge transfer' : 'type-badge expense'

  return <span className={className}>{type}</span>
}

function TransactionRow({ transaction, savingId, onEdit }: TransactionRowProps) {
  const isSaving = savingId === transaction.id

  return (
    <tr>
      <td>{transaction.date}</td>
      <td>
        <div className="description-cell">
          <strong>{transaction.description}</strong>
          <span>{transaction.institution ?? 'Sem instituicao'}</span>
        </div>
      </td>
      <td>
        <TypeBadge type={transaction.type} />
      </td>
      <td>{toCurrency(transaction.amount)}</td>
      <td>{transaction.category}</td>
      <td>
        <div className="group-cell">
          <span>{transaction.budgetGroupName ?? 'Sem grupo'}</span>
          {transaction.needsReclassification ? <div className="row-hint">Precisa de classificação</div> : null}
        </div>
      </td>
      <td>
        <button type="button" className="ghost" onClick={() => onEdit(transaction.id)} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Editar'}
        </button>
      </td>
    </tr>
  )
}

export function TransactionTable({
  transactions,
  savingId,
  onEdit,
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
          <div className="eyebrow">Revisao</div>
          <h3>Lancamentos do mes</h3>
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
              <th>Descricao</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Categoria</th>
              <th>Grupo</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} savingId={savingId} onEdit={onEdit} />
            ))}
          </tbody>
        </table>
      </div>
      {!transactions.length ? <p className="muted">Nenhuma transação encontrada para esse filtro.</p> : null}
    </section>
  )
}
