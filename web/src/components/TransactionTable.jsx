import { CATEGORY_OPTIONS, GROUP_LABELS, TYPE_OPTIONS } from '../constants'
import { toCurrency } from '../lib/formatters'
import { isExpenseGroup } from '../lib/transactions'

function TransactionFilters({ filters, onFiltersChange, typeOptions, categoryOptions, groupOptions }) {
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
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function TransactionRow({ transaction, savingId, onUpdate }) {
  const isSaving = savingId === transaction.id

  return (
    <tr>
      <td>{transaction.date}</td>
      <td>
        <div className="description-cell">
          <strong>{transaction.description}</strong>
          <span>{transaction.institution || transaction.notes || 'Sem observacoes'}</span>
        </div>
      </td>
      <td>
        <select
          value={transaction.type}
          onChange={(event) => onUpdate(transaction.id, 'type', event.target.value)}
          disabled={isSaving}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </td>
      <td>{toCurrency(transaction.amount)}</td>
      <td>
        <select
          value={transaction.category}
          onChange={(event) => onUpdate(transaction.id, 'category', event.target.value)}
          disabled={isSaving}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </td>
      <td>
        {isExpenseGroup(transaction.budgetGroup) ? (
          <select
            value={transaction.budgetGroup}
            onChange={(event) => onUpdate(transaction.id, 'budget_group', event.target.value)}
            disabled={isSaving}
          >
            {GROUP_LABELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <span className="muted">{transaction.budgetGroup || '-'}</span>
        )}
      </td>
    </tr>
  )
}

export function TransactionTable({
  transactions,
  savingId,
  onUpdate,
  filters,
  onFiltersChange,
  typeOptions,
  categoryOptions,
  groupOptions,
}) {
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
          </colgroup>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descricao</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Categoria</th>
              <th>Grupo</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                savingId={savingId}
                onUpdate={onUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
